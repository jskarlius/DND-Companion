import type { ContentRepository } from '../content/repository';
import type { Class, Item, LevelOneChoice } from '../content/types';
import { ABILITIES, type AbilityScores, type AbilityScoreGeneration, type Character, type CharacterPlayState, type ChoiceValue, type HitPointGain, type Skill, type SpellSelection } from './types';

/**
 * The UI owns this mutable-looking draft. This module never persists it; it
 * only turns a fully reviewed request into immutable character records.
 */
export interface CharacterCreationRequest {
  readonly characterId: string;
  readonly classEntryId: string;
  readonly name: string;
  readonly enabledContentPackIds: readonly string[];
  readonly abilityScoreGeneration: AbilityScoreGeneration;
  readonly abilityScores: AbilityScores;
  readonly classId: string;
  readonly classSkillIds: readonly Skill[];
  /** Granted and selected tool proficiencies are item IDs, not inventory. */
  readonly toolIds: readonly string[];
  /** Keys are the owning class profile's local choice IDs. */
  readonly classChoices: Readonly<Record<string, readonly string[]>>;
  readonly equipmentPackageId: string;
  readonly cantripIds: readonly string[];
  readonly spellbookSpellIds: readonly string[];
  readonly selectedSpellIds: readonly string[];
  readonly preparedSpellIds: readonly string[];
  readonly initialHitPoints: HitPointGain['hitPoints'];
  readonly hitPointMethod: HitPointGain['method'];
}

export interface CreationIssue {
  readonly field: string;
  readonly message: string;
}

export type CharacterCreationResult =
  | { readonly ok: false; readonly issues: readonly CreationIssue[] }
  | { readonly ok: true; readonly character: Character; readonly playState: CharacterPlayState };

function hasUniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

function validateExactSelection(
  issues: CreationIssue[],
  field: string,
  label: string,
  selected: readonly string[],
  count: number,
  permitted: readonly string[],
): void {
  if (selected.length !== count) issues.push({ field, message: `Choose exactly ${count} ${label}${count === 1 ? '' : 's'}.` });
  if (!hasUniqueValues(selected)) issues.push({ field, message: `Choose each ${label} only once.` });
  if (selected.some((id) => !permitted.includes(id))) issues.push({ field, message: `Each selected ${label} must be available to the chosen class.` });
}

function weaponMatchesTraining(training: readonly string[], weapon: NonNullable<Item['weapon']>): boolean {
  return training.some((grant) => grant === weapon.training
    || grant === 'martial-light' && weapon.training === 'martial' && weapon.properties.includes('light')
    || grant === 'martial-finesse-or-light' && weapon.training === 'martial' && (weapon.properties.includes('finesse') || weapon.properties.includes('light')));
}

function validateProfileChoice(issues: CreationIssue[], choice: LevelOneChoice, selected: readonly string[] | undefined, characterClass: Class, repository: ContentRepository, classSkillIds: readonly Skill[]): void {
  const categoryOptions = choice.optionCategory === 'skill-proficiency'
    ? classSkillIds
    : choice.optionCategory === 'weapon-mastery'
      ? repository.searchItems('').flatMap((item) => item.weapon?.mastery && weaponMatchesTraining(characterClass.levelOne!.weaponTraining, item.weapon) ? [item.id] : [])
      : undefined;
  if (choice.optionIds === undefined && categoryOptions === undefined) {
    // Category choices need structured eligible options (for example, which
    // owned weapons qualify for Weapon Mastery). The current pack deliberately
    // does not infer that relationship from prose, so this remains a blocker.
    issues.push({ field: `classChoices.${choice.id}`, message: `${choice.label} cannot be chosen yet because its eligible options are not structured in the content pack.` });
    return;
  }
  validateExactSelection(issues, `classChoices.${choice.id}`, choice.label, selected ?? [], choice.count, choice.optionIds ?? categoryOptions!);
}

function eligibleSpells(characterClass: Class, repository: ContentRepository, ids: readonly string[], level: number | 'leveled', maximumSpellLevel = 9): boolean {
  return ids.every((id) => {
    const spell = repository.getSpell(id);
    return spell !== undefined
      && characterClass.spellListIds.includes(id)
      && (level === 'leveled' ? spell.level > 0 && spell.level <= maximumSpellLevel : spell.level === level);
  });
}

/**
 * Plans the permanent and temporary records for a first-level character.
 *
 * It is deliberately a pure function: the route can render errors and a
 * review screen repeatedly, while the repository performs the single write
 * only after this function returns a successful result.
 */
export function planCharacterCreation(request: CharacterCreationRequest, repository: ContentRepository): CharacterCreationResult {
  const issues: CreationIssue[] = [];
  const characterClass = repository.getClass(request.classId);
  if (!characterClass) return { ok: false, issues: [{ field: 'class', message: 'Choose an installed class.' }] };
  if (!characterClass.levelOne) return { ok: false, issues: [{ field: 'class', message: `${characterClass.name} has no reviewed level-one creation profile.` }] };
  const profile = characterClass.levelOne;

  if (request.characterId.trim() === '') issues.push({ field: 'characterId', message: 'A stable character ID is required.' });
  if (request.classEntryId.trim() === '') issues.push({ field: 'classEntryId', message: 'A stable class-entry ID is required.' });
  if (request.name.trim() === '') issues.push({ field: 'name', message: 'Enter a character name.' });
  if (request.enabledContentPackIds.length === 0) issues.push({ field: 'content', message: 'Enable the content pack that supplies the chosen class.' });
  if (!request.enabledContentPackIds.includes('srd-2024')) issues.push({ field: 'content', message: 'The selected class requires the bundled SRD content pack.' });
  // Ability-score generation is provenance, but the final saved values still
  // need the same sane numeric boundary used by the sheet editor.
  if (ABILITIES.some((ability) => !Number.isInteger(request.abilityScores[ability]) || request.abilityScores[ability] < 1 || request.abilityScores[ability] > 30)) {
    issues.push({ field: 'abilityScores', message: 'Each ability score must be a whole number from 1 to 30.' });
  }

  validateExactSelection(issues, 'classSkills', 'class skill', request.classSkillIds, profile.skillChoices.count, profile.skillChoices.options);
  for (const choice of profile.choices) validateProfileChoice(issues, choice, request.classChoices[choice.id], characterClass, repository, request.classSkillIds);

  const grantedToolIds = profile.grantedToolIds ?? [];
  const requestedToolIds = request.toolIds.filter((id) => !grantedToolIds.includes(id));
  if (profile.toolChoice) validateExactSelection(issues, 'tools', 'tool proficiency', requestedToolIds, profile.toolChoice.count, profile.toolChoice.optionIds);
  else if (requestedToolIds.length > 0) issues.push({ field: 'tools', message: 'This class has no level-one tool choice.' });
  if ([...grantedToolIds, ...requestedToolIds].some((id) => !repository.getItem(id))) issues.push({ field: 'tools', message: 'Each tool proficiency must reference an installed item.' });
  if (profile.languageChoiceCount) issues.push({ field: 'proficiencies', message: `${characterClass.name} needs language options that are not yet structured in the content pack.` });

  const selectedPackage = characterClass.startingEquipmentPackages?.find((entry) => entry.id === request.equipmentPackageId);
  if (!selectedPackage) issues.push({ field: 'equipment', message: 'Choose a valid starting-equipment package.' });
  else {
    for (const entry of selectedPackage.entries) {
      if (entry.type === 'chosen-item') issues.push({ field: 'equipment', message: 'This equipment package needs an item choice that is not yet structured.' });
      else if (!repository.getItem(entry.itemId)) issues.push({ field: 'equipment', message: `Starting item ${entry.itemId} is missing from enabled content.` });
    }
  }

  const spellcasting = profile.spellcasting;
  if (!spellcasting) {
    if ([request.cantripIds, request.spellbookSpellIds, request.selectedSpellIds, request.preparedSpellIds].some((ids) => ids.length > 0)) issues.push({ field: 'spells', message: 'This class has no level-one spell selections.' });
  } else {
    const maximumSpellLevel = Math.max(0, ...Object.keys(characterClass.spellcasting?.progression.find((entry) => entry.level === 1)?.slots ?? {}).map(Number));
    validateExactSelection(issues, 'cantrips', 'cantrip', request.cantripIds, spellcasting.cantrips, characterClass.spellListIds);
    if (!eligibleSpells(characterClass, repository, request.cantripIds, 0)) issues.push({ field: 'cantrips', message: 'Choose cantrips from the class spell list.' });
    validateExactSelection(issues, 'spellbook', 'spellbook spell', request.spellbookSpellIds, spellcasting.spellbookSpells ?? 0, characterClass.spellListIds);
    if (!eligibleSpells(characterClass, repository, request.spellbookSpellIds, 'leveled', maximumSpellLevel)) issues.push({ field: 'spellbook', message: 'Choose spells of a level the new character can cast.' });
    validateExactSelection(issues, 'selectedSpells', 'selected spell', request.selectedSpellIds, spellcasting.selectedSpells, characterClass.spellListIds);
    if (!eligibleSpells(characterClass, repository, request.selectedSpellIds, 'leveled', maximumSpellLevel)) issues.push({ field: 'selectedSpells', message: 'Choose spells of a level the new character can cast.' });
    validateExactSelection(issues, 'preparedSpells', 'prepared spell', request.preparedSpellIds, spellcasting.preparedSpells, characterClass.spellListIds);
    if (!eligibleSpells(characterClass, repository, request.preparedSpellIds, 'leveled', maximumSpellLevel)) issues.push({ field: 'preparedSpells', message: 'Choose spells of a level the new character can cast.' });
    if (spellcasting.spellbookSpells !== undefined && request.preparedSpellIds.some((id) => !request.spellbookSpellIds.includes(id))) issues.push({ field: 'preparedSpells', message: 'Prepared Wizard spells must be in the selected spellbook.' });
  }

  if (!Number.isInteger(request.initialHitPoints) || request.initialHitPoints !== characterClass.hitDie) {
    issues.push({ field: 'hitPoints', message: `A level-1 ${characterClass.name} starts with its full d${characterClass.hitDie} Hit Die (${characterClass.hitDie} HP before Constitution).` });
  }
  if (request.hitPointMethod !== 'fixed') issues.push({ field: 'hitPoints', message: 'Level-1 hit points use the class Hit Die; they are not rolled or customized.' });
  if (issues.length > 0 || !selectedPackage) return { ok: false, issues };

  const classChoices: Record<string, ChoiceValue> = Object.fromEntries(profile.choices.map((choice) => {
    const selected = request.classChoices[choice.id] ?? [];
    return [choice.id, choice.count === 1 ? selected[0]! : selected];
  }));
  const selectedSpellIds = [...request.cantripIds, ...request.spellbookSpellIds, ...request.selectedSpellIds];
  if (!hasUniqueValues(selectedSpellIds)) return { ok: false, issues: [{ field: 'spells', message: 'A spell can only be recorded once for this class entry.' }] };
  const spellSelections: SpellSelection[] = selectedSpellIds.map((spellId) => ({ classEntryId: request.classEntryId, spellId, acquiredAtClassLevel: 1, prepared: false }));
  const maximumHp = request.initialHitPoints + Math.floor((request.abilityScores.constitution - 10) / 2);

  return {
    ok: true,
    character: {
      schemaVersion: 1, id: request.characterId, name: request.name.trim(), ruleset: '5e-2024', longRestHitDiceRecovery: '2024-all',
      enabledContentPackIds: request.enabledContentPackIds, abilityScoreGeneration: request.abilityScoreGeneration, abilityScores: request.abilityScores,
      classes: [{ id: request.classEntryId, classId: characterClass.id, level: 1, choices: classChoices }], choices: {},
      proficiencies: {
        savingThrowAbilities: characterClass.savingThrowAbilities, skills: Object.fromEntries(request.classSkillIds.map((skill) => [skill, 'proficient'])),
        weaponTraining: profile.weaponTraining, armorTraining: profile.armorTraining, toolIds: [...new Set([...grantedToolIds, ...requestedToolIds])], languageIds: [],
      },
      knownSpellIds: [], preparedSpellIds: [], spellSelections,
      preparedSpells: request.preparedSpellIds.map((spellId) => ({ classEntryId: request.classEntryId, spellId })),
      hitPointGains: [{ classEntryId: request.classEntryId, classLevel: 1, method: request.hitPointMethod, hitPoints: request.initialHitPoints }],
      currencyGp: selectedPackage.currencyGp,
      inventory: selectedPackage.entries.filter((entry): entry is Extract<typeof entry, { type: 'item' }> => entry.type === 'item').map((entry) => ({ itemId: entry.itemId, quantity: entry.quantity })),
      manualOverrides: {},
    },
    playState: {
      characterId: request.characterId, currentHp: Math.max(1, maximumHp), temporaryHp: 0, temporaryMaximumHpBonus: 0, inspiration: false,
      usedHitDice: { [request.classEntryId]: 0 }, usedResources: {}, usedSpellSlots: {}, deathSaveSuccesses: 0, deathSaveFailures: 0, conditions: [],
    },
  };
}
