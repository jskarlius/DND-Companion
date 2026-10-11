import { describe, expect, test } from 'vitest';

import { bundledContentRepository } from '../content/bundledContent';
import { planCharacterCreation, type CharacterCreationRequest } from './creation';

const wizard = bundledContentRepository.getClass('srd-2024:class:wizard')!;
const wizardCantrips = wizard.spellListIds.filter((id) => bundledContentRepository.getSpell(id)?.level === 0).slice(0, 3);
const wizardSpellCandidates = wizard.spellListIds.filter((id) => bundledContentRepository.getSpell(id)?.level === 1);
const wizardSpells = wizardSpellCandidates.slice(0, 6);

function wizardRequest(overrides: Partial<CharacterCreationRequest> = {}): CharacterCreationRequest {
  return {
    characterId: 'local:character:creation-test', classEntryId: 'local:character:creation-test:class-entry:wizard', name: 'Aster',
    enabledContentPackIds: ['srd-2024'], abilityScoreGeneration: 'standard-array',
    abilityScores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 },
    classId: wizard.id, speciesId: 'srd-2024:species:dwarf', classSkillIds: ['arcana', 'history'], classChoices: {}, equipmentPackageId: 'a',
    cantripIds: wizardCantrips, spellbookSpellIds: wizardSpells, selectedSpellIds: [], preparedSpellIds: wizardSpells.slice(0, 4),
    initialHitPoints: 6, hitPointMethod: 'fixed',
    ...overrides, toolIds: overrides.toolIds ?? [],
  };
}

describe('planCharacterCreation', () => {
  test('builds one complete Wizard character and its fresh play state', () => {
    const result = planCharacterCreation(wizardRequest(), bundledContentRepository);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.classes).toEqual([{ id: 'local:character:creation-test:class-entry:wizard', classId: wizard.id, level: 1, choices: {} }]);
    expect(result.character.proficiencies.skills).toEqual({ arcana: 'proficient', history: 'proficient' });
    expect(result.character.spellSelections).toHaveLength(9);
    expect(result.character.preparedSpells).toHaveLength(4);
    expect(result.character.currencyGp).toBe(5);
    expect(result.character.inventory).toContainEqual({ itemId: 'srd-2024:item:spellbook', quantity: 1 });
    expect(result.playState).toMatchObject({ currentHp: 8, usedHitDice: { 'local:character:creation-test:class-entry:wizard': 0 }, usedResources: {} });
  });

  test('does not accept a prepared Wizard spell outside the selected spellbook', () => {
    const result = planCharacterCreation(wizardRequest({ preparedSpellIds: [...wizardSpells.slice(0, 3), wizardSpells[4]!] , spellbookSpellIds: [...wizardSpells.slice(0, 4), wizardSpellCandidates[6]!, wizardSpells[5]!] }), bundledContentRepository);

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.issues.map((issue) => issue.message)).toContain('Prepared Wizard spells must be in the selected spellbook.');
  });

  test('applies a reviewed Sage background without mutating generated ability scores', () => {
    const result = planCharacterCreation(wizardRequest({
      backgroundId: 'srd-2024:background:sage',
      backgroundAbilityIncreases: { intelligence: 2, wisdom: 1 },
      backgroundEquipmentPackageId: 'a',
      grantedSpellIds: { 'magic-initiate-wizard': [...wizardCantrips.slice(0, 2), wizardSpellCandidates[0]!] },
      grantedSpellCastingAbilities: { 'magic-initiate-wizard': 'intelligence' },
    }), bundledContentRepository);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.generatedAbilityScores!.intelligence).toBe(15);
    expect(result.character.abilityScores).toMatchObject({ intelligence: 17, wisdom: 13 });
    expect(result.character.proficiencies.toolIds).toContain('srd-2024:item:calligraphers-supplies');
    expect(result.character.currency!.gp).toBe(13);
    expect(result.character.inventory).toContainEqual({ itemId: 'srd-2024:item:parchment', quantity: 8 });
    expect(result.character.grantedSpells).toHaveLength(3);
  });

  test('persists species spell grants and their chosen casting ability', () => {
    const result = planCharacterCreation(wizardRequest({
      speciesId: 'srd-2024:species:elf',
      speciesChoices: { 'elven-lineage': 'drow', 'keen-senses': 'perception' },
      speciesSpellcastingAbilities: { drow: 'charisma' },
    }), bundledContentRepository);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.character.proficiencies.skills.perception).toBe('proficient');
    expect(result.character.grantedSpells).toEqual(expect.arrayContaining([
      expect.objectContaining({ spellId: 'srd-2024:spell:dancing-lights', acquiredAtCharacterLevel: 1, castingAbility: 'charisma' }),
      expect.objectContaining({ spellId: 'srd-2024:spell:faerie-fire', acquiredAtCharacterLevel: 3, preparation: 'always-prepared' }),
    ]));
  });

  test('validates reviewed Weapon Mastery options against the class training', () => {
    const fighter = bundledContentRepository.getClass('srd-2024:class:fighter')!;
    const weaponMasteries = bundledContentRepository.searchItems('').filter((item) => item.weapon?.mastery).slice(0, 3).map((item) => item.id);
    const result = planCharacterCreation(wizardRequest({
      classId: fighter.id, classEntryId: 'local:character:creation-test:class-entry:fighter', classSkillIds: ['athletics', 'survival'],
      classChoices: { 'fighting-style': ['archery'], 'weapon-mastery': weaponMasteries }, equipmentPackageId: 'a', cantripIds: [], spellbookSpellIds: [], selectedSpellIds: [], preparedSpellIds: [], initialHitPoints: 10,
    }), bundledContentRepository);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.character.proficiencies.weaponTraining).toEqual(['simple', 'martial']);
  });
});
