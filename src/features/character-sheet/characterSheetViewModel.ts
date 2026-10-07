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
  readonly cantrips: readonly Spell[];
  readonly spells: readonly { readonly spell: Spell; readonly prepared: boolean }[];
  readonly features: readonly Feature[];
  readonly resources: readonly { readonly resource: Resource; readonly used: number }[];
}

function titleCase(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
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

  const knownSpells = character.knownSpellIds.map((id) => findRequired(content.spells, id));

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
    cantrips: knownSpells.filter((spell) => spell.level === 0),
    spells: knownSpells
      .filter((spell) => spell.level > 0)
      .map((spell) => ({ spell, prepared: character.preparedSpellIds.includes(spell.id) })),
    features,
    resources: [...resourceIds].map((id) => ({
      resource: findRequired(content.resources, id),
      used: playState.usedResources[id] ?? 0,
    })),
  };
}

export { titleCase };
