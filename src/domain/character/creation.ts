import type { ContentRepository } from '../content/repository';
import type { Class, Item, LevelOneChoice } from '../content/types';
import { ABILITIES, EMPTY_CURRENCY_PURSE, type Ability, type AbilityScores, type AbilityScoreGeneration, type Character, type CharacterPlayState, type ChoiceValue, type GrantedSpell, type HitPointGain, type Skill, type SpellSelection } from './types';

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
  readonly speciesId?: string;
  readonly speciesChoices?: Readonly<Record<string, string>>;
  readonly speciesSpellcastingAbilities?: Readonly<Record<string, Ability>>;
  readonly backgroundId?: string;
  /** The selected +2/+1 or +1/+1/+1 allocation, applied to generated scores. */
  readonly backgroundAbilityIncreases?: Readonly<Partial<Record<Ability, number>>>;
  readonly backgroundEquipmentPackageId?: string;
  readonly backgroundChoices?: Readonly<Record<string, readonly string[]>>;
  /** Spell IDs selected for a source-owned, non-class spell grant. */
  readonly grantedSpellIds?: Readonly<Record<string, readonly string[]>>;
  readonly grantedSpellCastingAbilities?: Readonly<Record<string, Ability>>;
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
  const species = request.speciesId ? repository.getSpecies(request.speciesId) : undefined;
  const background = request.backgroundId ? repository.getBackground(request.backgroundId) : undefined;

  if (request.characterId.trim() === '') issues.push({ field: 'characterId', message: 'A stable character ID is required.' });
  if (request.classEntryId.trim() === '') issues.push({ field: 'classEntryId', message: 'A stable class-entry ID is required.' });
  if (request.name.trim() === '') issues.push({ field: 'name', message: 'Enter a character name.' });
  if (request.enabledContentPackIds.length === 0) issues.push({ field: 'content', message: 'Enable the content pack that supplies the chosen class.' });
  if (!request.enabledContentPackIds.includes('srd-2024')) issues.push({ field: 'content', message: 'The selected class requires the bundled SRD content pack.' });
  if (!request.speciesId || !species?.traits) issues.push({ field: 'species', message: 'Choose a species with reviewed creation facts.' });
  for (const choice of species?.choices ?? []) {
    const selected = request.speciesChoices?.[choice.id];
    if (!selected || !choice.options.some((option) => option.id === selected)) issues.push({ field: `speciesChoices.${choice.id}`, message: `Choose ${choice.label}.` });
  }
  for (const option of (species?.choices ?? []).flatMap((choice) => choice.options.filter((candidate) => candidate.id === request.speciesChoices?.[choice.id]))) {
    if (option.requiresSpellcastingAbility && !request.speciesSpellcastingAbilities?.[option.id]) issues.push({ field: `speciesSpellcastingAbilities.${option.id}`, message: `Choose the spellcasting ability for ${option.label}.` });
  }
  // Ability-score generation is provenance, but the final saved values still
  // need the same sane numeric boundary used by the sheet editor.
  if (ABILITIES.some((ability) => !Number.isInteger(request.abilityScores[ability]) || request.abilityScores[ability] < 1 || request.abilityScores[ability] > 30)) {
    issues.push({ field: 'abilityScores', message: 'Each ability score must be a whole number from 1 to 30.' });
  }
  if (request.backgroundId && !background?.creation) issues.push({ field: 'background', message: 'Choose a background with reviewed creation facts.' });
  const backgroundProfile = background?.creation;
  const backgroundIncrease = request.backgroundAbilityIncreases ?? {};
  if (backgroundProfile) {
    const increases = Object.entries(backgroundIncrease) as [Ability, number][];
    const validAllocation = (increases.length === 2 && increases.every(([ability, value]) => backgroundProfile.abilityScoreOptions?.includes(ability) && (value === 1 || value === 2)) && increases.reduce((total, [, value]) => total + value, 0) === 3)
      || (increases.length === 3 && increases.every(([ability, value]) => backgroundProfile.abilityScoreOptions?.includes(ability) && value === 1));
    if (!validAllocation) issues.push({ field: 'backgroundAbilityIncreases', message: 'Choose +2/+1 among two background abilities, or +1 to all three.' });
    if (ABILITIES.some((ability) => request.abilityScores[ability] + (backgroundIncrease[ability] ?? 0) > 20)) issues.push({ field: 'backgroundAbilityIncreases', message: 'A background increase cannot raise an ability score above 20.' });
    const packageId = request.backgroundEquipmentPackageId;
    if (!backgroundProfile.equipmentPackages?.some((entry) => entry.id === packageId)) issues.push({ field: 'backgroundEquipment', message: 'Choose a valid background equipment package.' });
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
  const backgroundPackage = backgroundProfile?.equipmentPackages?.find((entry) => entry.id === request.backgroundEquipmentPackageId);
  if (!selectedPackage) issues.push({ field: 'equipment', message: 'Choose a valid starting-equipment package.' });
  else {
    for (const entry of selectedPackage.entries) {
      if (entry.type === 'chosen-item') issues.push({ field: 'equipment', message: 'This equipment package needs an item choice that is not yet structured.' });
      else if (!repository.getItem(entry.itemId)) issues.push({ field: 'equipment', message: `Starting item ${entry.itemId} is missing from enabled content.` });
    }
  }
  if (backgroundProfile && backgroundPackage) {
    for (const entry of backgroundPackage.entries) {
      if (entry.type === 'chosen-item') {
        const selected = request.backgroundChoices?.[entry.choiceId] ?? [];
        const choice = backgroundProfile.choices.find((candidate) => candidate.id === entry.choiceId);
        if (!choice) issues.push({ field: 'backgroundEquipment', message: `Background equipment choice ${entry.choiceId} is not structured.` });
        else validateExactSelection(issues, `backgroundChoices.${entry.choiceId}`, choice.label, selected, choice.count, choice.optionIds ?? []);
      } else if (!repository.getItem(entry.itemId)) issues.push({ field: 'backgroundEquipment', message: `Starting item ${entry.itemId} is missing from enabled content.` });
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
  const finalAbilityScores = Object.fromEntries(ABILITIES.map((ability) => [ability, request.abilityScores[ability] + (backgroundIncrease[ability] ?? 0)])) as AbilityScores;
  const selectedSpeciesOptions = (species?.choices ?? []).flatMap((choice) => choice.options.filter((option) => option.id === request.speciesChoices?.[choice.id]));
  const resolvedSpeciesTraits = species?.traits ? { ...species.traits, ...Object.assign({}, ...selectedSpeciesOptions.map((option) => option.traits ?? {})) } : undefined;
  const grantedSpells: GrantedSpell[] = [];
  for (const grant of backgroundProfile?.spellGrants ?? []) {
    const selected = request.grantedSpellIds?.[grant.id] ?? [];
    const grantingClass = repository.getClass(grant.spellListClassId);
    const castingAbility = request.grantedSpellCastingAbilities?.[grant.id];
    const cantrips = selected.filter((id) => repository.getSpell(id)?.level === 0);
    const leveled = selected.filter((id) => repository.getSpell(id)?.level === grant.spellLevel);
    if (!grantingClass || selected.length !== grant.cantripCount + grant.spellCount || !hasUniqueValues(selected)
      || selected.some((id) => !grantingClass.spellListIds.includes(id)) || cantrips.length !== grant.cantripCount || leveled.length !== grant.spellCount) {
      return { ok: false, issues: [{ field: `grantedSpells.${grant.id}`, message: 'Choose the required non-class cantrips and spell from the grant’s spell list.' }] };
    }
    if (grant.castingAbilityChoiceId && !castingAbility) return { ok: false, issues: [{ field: `grantedSpells.${grant.id}`, message: 'Choose the spellcasting ability for this spell grant.' }] };
    grantedSpells.push(...selected.map((spellId) => ({ grantorId: background!.creation!.featIds?.[0] ?? background!.id, spellId, acquiredAtCharacterLevel: 1, castingAbility: castingAbility ?? 'intelligence', preparation: repository.getSpell(spellId)?.level === 0 ? 'available' as const : 'always-prepared' as const, replacementHistory: [] })));
  }
  for (const option of selectedSpeciesOptions) {
    const castingAbility = request.speciesSpellcastingAbilities?.[option.id] ?? 'intelligence';
    grantedSpells.push(...(option.grantedSpells ?? []).map((grant) => ({
      grantorId: species!.id,
      spellId: grant.spellId,
      acquiredAtCharacterLevel: grant.acquiredAtCharacterLevel,
      castingAbility,
      preparation: grant.preparation,
      replacementHistory: [],
    })));
  }
  const maximumHp = request.initialHitPoints + Math.floor((finalAbilityScores.constitution - 10) / 2) + (resolvedSpeciesTraits?.maximumHpPerCharacterLevel ?? 0);

  return {
    ok: true,
    character: {
      schemaVersion: 1, id: request.characterId, name: request.name.trim(), ruleset: '5e-2024', longRestHitDiceRecovery: '2024-all',
      enabledContentPackIds: request.enabledContentPackIds, abilityScoreGeneration: request.abilityScoreGeneration, abilityScores: finalAbilityScores,
      generatedAbilityScores: request.abilityScores,
      speciesId: request.speciesId, speciesTraits: resolvedSpeciesTraits, backgroundId: request.backgroundId,
      classes: [{ id: request.classEntryId, classId: characterClass.id, level: 1, choices: classChoices }], choices: {},
      proficiencies: {
        savingThrowAbilities: characterClass.savingThrowAbilities, skills: Object.fromEntries([...new Set([...request.classSkillIds, ...(backgroundProfile?.skillGrants ?? []), ...selectedSpeciesOptions.flatMap((option) => option.skillGrants ?? [])])].map((skill) => [skill, 'proficient'])),
        weaponTraining: profile.weaponTraining, armorTraining: profile.armorTraining,
        toolIds: [...new Set([...grantedToolIds, ...requestedToolIds, ...(backgroundProfile?.toolGrants ?? []), ...Object.values(request.backgroundChoices ?? {}).flat()])], languageIds: [],
      },
      knownSpellIds: [], preparedSpellIds: [], spellSelections,
      preparedSpells: request.preparedSpellIds.map((spellId) => ({ classEntryId: request.classEntryId, spellId })),
      grantedSpells,
      hitPointGains: [{ classEntryId: request.classEntryId, classLevel: 1, method: request.hitPointMethod, hitPoints: request.initialHitPoints }],
      currency: { ...EMPTY_CURRENCY_PURSE, gp: selectedPackage.currencyGp + (backgroundPackage?.currencyGp ?? 0) },
      // Kept during the migration rollout for old readers and backups.
      currencyGp: selectedPackage.currencyGp + (backgroundPackage?.currencyGp ?? 0),
      sourceChoices: [
        ...(backgroundProfile ? [{ ownerId: background!.id, choiceId: 'ability-increase', optionIds: Object.entries(backgroundIncrease).map(([ability, value]) => `${ability}+${value}`) }] : []),
        ...(species?.choices ?? []).flatMap((choice) => request.speciesChoices?.[choice.id] ? [{ ownerId: species!.id, choiceId: choice.id, optionIds: [request.speciesChoices[choice.id]!] }] : []),
      ],
      proficiencyOverrides: { skills: {}, savingThrows: {} },
      inventory: [...selectedPackage.entries, ...(backgroundPackage?.entries ?? [])]
        .flatMap((entry) => entry.type === 'item' ? [{ itemId: entry.itemId, quantity: entry.quantity }] : (request.backgroundChoices?.[entry.choiceId] ?? []).map((itemId) => ({ itemId, quantity: entry.quantity }))),
      manualOverrides: {},
    },
    playState: {
      characterId: request.characterId, currentHp: Math.max(1, maximumHp), temporaryHp: 0, temporaryMaximumHpBonus: 0, inspiration: false,
      usedHitDice: { [request.classEntryId]: 0 }, usedResources: {}, usedSpellSlots: {}, deathSaveSuccesses: 0, deathSaveFailures: 0, conditions: [],
    },
  };
}
