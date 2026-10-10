import type { ContentRepository } from '../content/repository';
import type { AdvancementGrant, Class, Subclass } from '../content/types';
import { getCharacterLevel, getProficiencyBonus } from './calculations';
import type { Ability, Character, CharacterPlayState, ClassEntry, HitPointGain, SpellSelection } from './types';

export interface AdvancementRequest {
  readonly targetClassId: string;
  readonly newClassEntryId?: string;
  readonly subclassId?: string;
  readonly abilityScoreIncreases?: Readonly<Partial<Record<Ability, number>>>;
  readonly hitPointGain: Omit<HitPointGain, 'classEntryId' | 'classLevel'>;
  readonly spellSelections?: readonly SpellSelection[];
  readonly classChoices?: Readonly<Record<string, string>>;
}

export interface AdvancementIssue { readonly field: string; readonly message: string; }
export interface AdvancementChange { readonly label: string; readonly detail: string; }
export interface AdvancementPreview {
  readonly character: Character;
  readonly playState: CharacterPlayState;
  readonly changes: readonly AdvancementChange[];
  readonly totalLevelBefore: number;
  readonly totalLevelAfter: number;
  readonly proficiencyBefore: number;
  readonly proficiencyAfter: number;
}
export type AdvancementResult = { readonly ok: true; readonly preview: AdvancementPreview } | { readonly ok: false; readonly issues: readonly AdvancementIssue[] };

const slotRows: Readonly<Record<number, Readonly<Record<number, number>>>> = {
  1: { 1: 2 }, 2: { 1: 3 }, 3: { 1: 4, 2: 2 }, 4: { 1: 4, 2: 3 }, 5: { 1: 4, 2: 3, 3: 2 },
  6: { 1: 4, 2: 3, 3: 3 }, 7: { 1: 4, 2: 3, 3: 3, 4: 1 }, 8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 1 }, 10: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2 },
  11: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 }, 12: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1 },
  13: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 }, 14: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1 },
  15: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 }, 16: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1 },
  17: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 }, 18: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 },
  19: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 }, 20: { 1: 4, 2: 3, 3: 3, 4: 3, 5: 3, 6: 1, 7: 1, 8: 1, 9: 1 },
};

function contribution(level: number, kind: NonNullable<Class['spellcasting']>['multiclassContribution']): number {
  if (kind === 'full') return level;
  if (kind === 'half-round-up') return Math.ceil(level / 2);
  if (kind === 'half-round-down') return Math.floor(level / 2);
  if (kind === 'third-round-down') return Math.floor(level / 3);
  return 0;
}

/** Shared ordinary spell slots. Pact Magic intentionally does not enter this table. */
export function getCombinedSpellSlots(classes: readonly ClassEntry[], repository: ContentRepository): Readonly<Record<number, number>> {
  const casterLevel = classes.reduce((total, entry) => {
    const spellcasting = repository.getClass(entry.classId)?.spellcasting;
    return spellcasting?.slotKind === 'spell-slots' ? total + contribution(entry.level, spellcasting.multiclassContribution) : total;
  }, 0);
  return slotRows[casterLevel] ?? {};
}

function grantsAt(characterClass: Class | Subclass, level: number): readonly AdvancementGrant[] {
  return characterClass.advancement.find((entry) => entry.level === level)?.grants ?? [];
}

function describeGrant(grant: AdvancementGrant, repository: ContentRepository): AdvancementChange {
  if (grant.type === 'feature') return { label: 'Feature', detail: repository.getFeature(grant.featureId)?.name ?? 'Missing feature' };
  if (grant.type === 'resource') return { label: 'Resource', detail: `${repository.getResource(grant.resourceId)?.name ?? 'Missing resource'} (${grant.amount})` };
  if (grant.type === 'choice') return { label: 'Choice', detail: repository.getChoice(grant.choiceId)?.name ?? 'Missing choice' };
  return { label: 'Class grant', detail: 'Ability Score Improvement' };
}

function meetsMulticlassPrerequisite(character: Character, characterClass: Class): boolean {
  const groups = characterClass.multiclassing?.prerequisiteGroups;
  return !groups || groups.some((group) => Object.entries(group).every(([ability, score]) => character.abilityScores[ability as Ability] >= score));
}

export function planAdvancement(character: Character, playState: CharacterPlayState, repository: ContentRepository, request: AdvancementRequest): AdvancementResult {
  const issues: AdvancementIssue[] = [];
  const characterClass = repository.getClass(request.targetClassId);
  if (!characterClass) return { ok: false, issues: [{ field: 'class', message: 'That class is not installed.' }] };
  const existing = character.classes.find((entry) => entry.classId === request.targetClassId);
  const totalBefore = getCharacterLevel(character.classes).value;
  if (totalBefore >= 20) issues.push({ field: 'class', message: 'A character cannot advance beyond level 20.' });
  if (!existing && !request.newClassEntryId) issues.push({ field: 'class', message: 'A new class needs a stable class-entry ID.' });
  if (!existing && !meetsMulticlassPrerequisite(character, characterClass)) issues.push({ field: 'class', message: `This character does not meet ${characterClass.name}'s multiclass prerequisite.` });
  const nextLevel = (existing?.level ?? 0) + 1;
  if (!characterClass.spellcasting?.progression.some((entry) => entry.level === nextLevel) && !characterClass.advancement.some((entry) => entry.level === nextLevel)) issues.push({ field: 'class', message: `${characterClass.name} level ${nextLevel} is not available in the installed bootstrap data.` });
  if (!Number.isInteger(request.hitPointGain.hitPoints) || request.hitPointGain.hitPoints < 1 || request.hitPointGain.hitPoints > characterClass.hitDie) issues.push({ field: 'hitPoints', message: `Enter a whole-number Hit Die result from 1 to ${characterClass.hitDie}.` });

  const requiresSubclass = characterClass.subclassSelectionLevel === nextLevel && !existing?.subclassId;
  const subclass = request.subclassId ? repository.getSubclass(request.subclassId) : undefined;
  if (requiresSubclass && !request.subclassId) issues.push({ field: 'subclass', message: 'Choose a subclass for this level.' });
  if (request.subclassId && (!subclass || subclass.classId !== characterClass.id)) issues.push({ field: 'subclass', message: 'Choose a subclass that belongs to the selected class.' });
  const activeSubclass = subclass ?? (existing?.subclassId ? repository.getSubclass(existing.subclassId) : undefined);
  const grants = [...grantsAt(characterClass, nextLevel), ...(activeSubclass ? grantsAt(activeSubclass, nextLevel) : [])];
  if (grants.some((grant) => grant.type === 'ability-score-improvement') && !request.abilityScoreIncreases) issues.push({ field: 'abilityScores', message: 'Choose the ability-score increase for this level.' });
  if (request.abilityScoreIncreases && Object.values(request.abilityScoreIncreases).some((value) => !Number.isInteger(value) || value! < 0)) issues.push({ field: 'abilityScores', message: 'Ability-score increases must be non-negative whole numbers.' });
  if (issues.length) return { ok: false, issues };
  for (const grant of grants.filter((entry): entry is Extract<AdvancementGrant, { type: 'choice' }> => entry.type === 'choice')) {
    const choice = repository.getChoice(grant.choiceId);
    const selection = request.classChoices?.[grant.choiceId];
    if (!choice) issues.push({ field: 'choices', message: 'Required choice content is missing.' });
    else if (!selection || !choice.options.some((option) => option.id === selection)) issues.push({ field: 'choices', message: `Choose ${choice.name}.` });
  }
  if (issues.length) return { ok: false, issues };

  const entryId = existing?.id ?? request.newClassEntryId!;
  const advancedEntry: ClassEntry = existing
    ? { ...existing, level: nextLevel, ...(request.subclassId ? { subclassId: request.subclassId } : {}), choices: { ...existing.choices, ...request.classChoices } }
    : { id: entryId, classId: characterClass.id, level: 1, ...(request.subclassId ? { subclassId: request.subclassId } : {}), choices: request.classChoices ?? {} };
  const classes = existing ? character.classes.map((entry) => entry.id === existing.id ? advancedEntry : entry) : [...character.classes, advancedEntry];
  const abilityScores = { ...character.abilityScores };
  for (const [ability, increase] of Object.entries(request.abilityScoreIncreases ?? {})) abilityScores[ability as Ability] += increase!;
  const selections = request.spellSelections ?? [];
  const spellcastingProgression = characterClass.spellcasting?.progression.find((entry) => entry.level === nextLevel);
  const expectedSpellSelections = characterClass.spellcasting?.selectionMode === 'known-and-prepared'
    ? (spellcastingProgression?.spellsLearned ?? 0)
    : (spellcastingProgression?.preparedSpells ?? 0);
  const previousCantrips = characterClass.spellcasting?.progression.find((entry) => entry.level === nextLevel - 1)?.cantripsKnown ?? 0;
  const expectedCantripSelections = characterClass.spellcasting
    ? Math.max((spellcastingProgression?.cantripsKnown ?? 0) - previousCantrips, 0)
    : 0;
  const selectedCantrips = selections.filter((selection) => repository.getSpell(selection.spellId)?.level === 0);
  const selectedSpells = selections.filter((selection) => repository.getSpell(selection.spellId)?.level !== 0);
  if (selectedCantrips.length !== expectedCantripSelections || selectedSpells.length !== expectedSpellSelections) {
    return { ok: false, issues: [{ field: 'spells', message: `Choose ${expectedCantripSelections} cantrip${expectedCantripSelections === 1 ? '' : 's'} and ${expectedSpellSelections} spell${expectedSpellSelections === 1 ? '' : 's'} for this level.` }] };
  }
  const invalidSpell = selections.find((selection) => selection.classEntryId !== entryId || !characterClass.spellListIds.includes(selection.spellId));
  if (invalidSpell) return { ok: false, issues: [{ field: 'spells', message: 'Each selected spell must belong to the class gaining this level.' }] };
  if (new Set(selections.map((selection) => selection.spellId)).size !== selections.length) return { ok: false, issues: [{ field: 'spells', message: 'Choose each spell only once.' }] };
  if (selections.some((selection) => character.spellSelections.some((existingSelection) => existingSelection.classEntryId === entryId && existingSelection.spellId === selection.spellId))) return { ok: false, issues: [{ field: 'spells', message: 'Choose spells that are not already recorded for this class.' }] };
  const maximumSpellLevel = Math.max(0, ...Object.keys(spellcastingProgression?.slots ?? {}).map(Number));
  if (selections.some((selection) => (repository.getSpell(selection.spellId)?.level ?? 0) > maximumSpellLevel)) return { ok: false, issues: [{ field: 'spells', message: 'Choose spells of a level you can cast.' }] };
  const spellSelections = [...character.spellSelections, ...selections.map((selection) => ({ ...selection, acquiredAtClassLevel: nextLevel, prepared: characterClass.spellcasting?.selectionMode === 'prepared-from-list' ? true : selection.prepared }))];
  const candidate: Character = {
    ...character,
    abilityScores,
    classes,
    spellSelections,
    hitPointGains: [...character.hitPointGains, { ...request.hitPointGain, classEntryId: entryId, classLevel: nextLevel }],
  };
  const totalAfter = getCharacterLevel(classes).value;
  const changes: AdvancementChange[] = [{ label: characterClass.name, detail: `${existing ? 'Level' : 'New class'} ${nextLevel}` }, { label: 'Hit points', detail: `+${request.hitPointGain.hitPoints} (${request.hitPointGain.method})` }];
  if (request.subclassId) changes.push({ label: 'Subclass', detail: subclass!.name });
  if (request.abilityScoreIncreases) changes.push({ label: 'Ability scores', detail: Object.entries(request.abilityScoreIncreases).map(([ability, value]) => `${ability} +${value}`).join(', ') });
  for (const grant of grants) changes.push(describeGrant(grant, repository));
  for (const [choiceId, optionId] of Object.entries(request.classChoices ?? {})) {
    const choice = repository.getChoice(choiceId);
    const option = choice?.options.find((entry) => entry.id === optionId);
    if (choice && option) changes.push({ label: choice.name, detail: option.name });
  }
  return { ok: true, preview: { character: candidate, playState, changes, totalLevelBefore: totalBefore, totalLevelAfter: totalAfter, proficiencyBefore: getProficiencyBonus(totalBefore).value, proficiencyAfter: getProficiencyBonus(totalAfter).value } };
}
