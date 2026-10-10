import {
  getAbilityModifier,
  getCharacterLevel,
  getCharacterSavingThrow,
  getCharacterSkillCheck,
  getProficiencyBonus,
} from '../../domain/character/calculations';
import {
  ABILITIES,
  SKILLS,
  type Ability,
  type Character,
  type CharacterPlayState,
  type Skill,
} from '../../domain/character/types';
import type { ContentFixture, Feature, Resource, Spell } from '../../domain/content/types';
import { BundledContentRepository } from '../../domain/content/repository';
import { getCombinedSpellSlots } from '../../domain/character/advancement';
import type { CharacterSheetDetails } from './characterSheetFixture';

export interface CharacterSheetViewModel {
  readonly character: Character;
  readonly details: CharacterSheetDetails;
  readonly totalLevel: number;
  readonly proficiencyBonus: number;
  readonly abilities: readonly { readonly ability: Ability; readonly score: number; readonly modifier: number }[];
  readonly savingThrows: readonly { readonly ability: Ability; readonly value: number; readonly proficient: boolean }[];
  readonly skills: readonly { readonly skill: Skill; readonly value: number; readonly proficiency: string }[];
  readonly classes: readonly { readonly name: string; readonly level: number }[];
  readonly spellcasting: readonly { readonly className: string; readonly ability: Ability; readonly slotKind: 'spell-slots' | 'pact-magic'; readonly slotRecharge: 'short-rest' | 'long-rest' }[];
  readonly spellSlots: readonly { readonly level: number; readonly maximum: number; readonly label: string; readonly recharge: 'short-rest' | 'long-rest' }[];
  readonly spellLimits?: { readonly cantripsKnown: number; readonly preparedSpells: number };
  readonly spellSummaries: readonly { readonly classEntryId: string; readonly className: string; readonly label: string; readonly current: number; readonly maximum?: number }[];
  readonly hitDiceGroups: readonly { readonly classEntryId: string; readonly className: string; readonly die: number; readonly maximum: number; readonly used: number }[];
  readonly cantrips: readonly Spell[];
  readonly spells: readonly { readonly spell: Spell; readonly prepared: boolean; readonly classEntryId: string }[];
  readonly features: readonly Feature[];
  readonly resources: readonly { readonly resource: Resource; readonly used: number }[];
}

function titleCase(value: string): string {
  return value.replaceAll('-', ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}

function findRequired<T extends { readonly id: string }>(items: readonly T[], id: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Character sheet references missing content: ${id}`);
  return item;
}

export function buildCharacterSheetViewModel(
  character: Character,
  playState: CharacterPlayState,
  content: ContentFixture,
  details: CharacterSheetDetails,
): CharacterSheetViewModel {
  const totalLevel = getCharacterLevel(character.classes).value;
  const featureIds = new Set<string>();
  const resourceIds = new Set<string>();

  for (const classEntry of character.classes) {
    const characterClass = findRequired(content.classes, classEntry.classId);
    for (const advancement of characterClass.advancement) {
      if (advancement.level > classEntry.level) continue;
      for (const grant of advancement.grants) {
        if (grant.type === 'feature') featureIds.add(grant.featureId);
        if (grant.type === 'resource') resourceIds.add(grant.resourceId);
      }
    }
  }

  const features = [...featureIds].map((id) => findRequired(content.features, id));
  for (const feature of features) if (feature.resourceId) resourceIds.add(feature.resourceId);

  const spellSelections = character.spellSelections.length > 0
    ? character.spellSelections
    : character.knownSpellIds.map((spellId) => ({ classEntryId: character.classes.find((entry) => entry.classId.endsWith(':class:wizard'))?.id ?? '', spellId, acquiredAtClassLevel: 1, prepared: character.preparedSpellIds.includes(spellId) }));
  const knownSpells = spellSelections
    .filter((selection) => content.classes.find((entry) => entry.id === character.classes.find((classEntry) => classEntry.id === selection.classEntryId)?.classId)?.spellcasting?.selectionMode !== 'prepared-from-list')
    .map((selection) => ({ spell: findRequired(content.spells, selection.spellId), prepared: character.preparedSpells.some((prepared) => prepared.classEntryId === selection.classEntryId && prepared.spellId === selection.spellId), classEntryId: selection.classEntryId }));
  const spellcastingProgression = character.classes.flatMap((classEntry) => {
    const characterClass = findRequired(content.classes, classEntry.classId);
    const spellcasting = characterClass.spellcasting;
    if (!spellcasting || spellcasting.slotKind !== 'spell-slots') return [];
    return spellcasting.progression.filter((entry) => entry.level === classEntry.level).map((entry) => ({ entry, spellcasting }));
  });
  const slotMaximums = getCombinedSpellSlots(character.classes, new BundledContentRepository(content));
  const preparedFromList = character.classes.flatMap((classEntry) => {
    const characterClass = findRequired(content.classes, classEntry.classId);
    const progression = characterClass.spellcasting?.progression.find((entry) => entry.level === classEntry.level);
    const highestSpellLevel = Math.max(0, ...Object.keys(progression?.slots ?? {}).map(Number));
    return characterClass.spellcasting?.selectionMode === 'prepared-from-list'
      ? characterClass.spellListIds.filter((id) => { const level = findRequired(content.spells, id).level; return level > 0 && level <= highestSpellLevel; }).map((spellId) => ({ spell: findRequired(content.spells, spellId), prepared: character.preparedSpells.some((prepared) => prepared.classEntryId === classEntry.id && prepared.spellId === spellId), classEntryId: classEntry.id }))
      : [];
  });

  return {
    character,
    details,
    totalLevel,
    proficiencyBonus: getProficiencyBonus(totalLevel).value,
    abilities: ABILITIES.map((ability) => ({
      ability,
      score: character.abilityScores[ability],
      modifier: getAbilityModifier(character.abilityScores[ability]).value,
    })),
    savingThrows: ABILITIES.map((ability) => ({
      ability,
      value: getCharacterSavingThrow(character, ability).value,
      proficient: character.proficiencies.savingThrowAbilities.includes(ability),
    })),
    skills: SKILLS.map((skill) => ({
      skill,
      value: getCharacterSkillCheck(character, skill).value,
      proficiency: character.proficiencies.skills[skill] ?? 'none',
    })),
    classes: character.classes.map((classEntry) => ({
      name: findRequired(content.classes, classEntry.classId).name,
      level: classEntry.level,
    })),
    spellcasting: character.classes.flatMap((classEntry) => {
      const characterClass = findRequired(content.classes, classEntry.classId);
      return characterClass.spellcasting ? [{ className: characterClass.name, ...characterClass.spellcasting }] : [];
    }),
    spellSlots: Object.entries(slotMaximums).map(([level, maximum]) => ({ level: Number(level), maximum, label: 'Spell slots', recharge: 'long-rest' as const })),
    spellLimits: spellcastingProgression.length === 1 ? { cantripsKnown: spellcastingProgression[0].entry.cantripsKnown, preparedSpells: spellcastingProgression[0].entry.preparedSpells } : undefined,
    spellSummaries: character.classes.flatMap((classEntry) => {
      const characterClass = findRequired(content.classes, classEntry.classId);
      const spellcasting = characterClass.spellcasting;
      if (!spellcasting) return [];
      const progression = spellcasting.progression.find((entry) => entry.level === classEntry.level);
      const owned = spellSelections.filter((entry) => entry.classEntryId === classEntry.id && findRequired(content.spells, entry.spellId).level > 0).length;
      const prepared = character.preparedSpells.filter((entry) => entry.classEntryId === classEntry.id).length;
      if (spellcasting.selectionMode === 'level-up-list') return [{ classEntryId: classEntry.id, className: characterClass.name, label: 'Spells prepared', current: owned }];
      if (spellcasting.selectionMode === 'known-and-prepared') return [
        { classEntryId: classEntry.id, className: characterClass.name, label: 'Spells known', current: owned },
        { classEntryId: `${classEntry.id}:prepared`, className: characterClass.name, label: 'Spells prepared', current: prepared, maximum: progression?.preparedSpells },
      ];
      return [{ classEntryId: classEntry.id, className: characterClass.name, label: 'Spells prepared', current: prepared, maximum: progression?.preparedSpells }];
    }),
    hitDiceGroups: character.classes.map((classEntry) => {
      const characterClass = findRequired(content.classes, classEntry.classId);
      return {
        classEntryId: classEntry.id,
        className: characterClass.name,
        die: characterClass.hitDie,
        maximum: classEntry.level,
        used: Math.min(Math.max(playState.usedHitDice[classEntry.id] ?? 0, 0), classEntry.level),
      };
    }),
    cantrips: knownSpells.filter(({ spell }) => spell.level === 0).map(({ spell }) => spell),
    spells: [...knownSpells.filter(({ spell }) => spell.level > 0), ...preparedFromList],
    features,
    resources: [...resourceIds].map((id) => ({
      resource: findRequired(content.resources, id),
      used: playState.usedResources[id] ?? 0,
    })),
  };
}

export { titleCase };
