import { describe, expect, test } from 'vitest';
import {
  applyModifiers,
  getAbilityModifier,
  getCharacterLevel,
  getCharacterSavingThrow,
  getCharacterSkillCheck,
  getClassLevel,
  getProficiencyBonus,
  getSavingThrow,
  getSkillCheck,
  resolveManualOverride,
} from './calculations';
import type { AbilityScores, Character, ClassEntry } from './types';

const abilityScores: AbilityScores = {
  strength: 10,
  dexterity: 16,
  constitution: 14,
  intelligence: 12,
  wisdom: 8,
  charisma: 18,
};

const wizard: ClassEntry = {
  id: 'wizard-entry',
  classId: 'srd-5.2.1:class:wizard',
  level: 3,
  choices: {},
};

const fighter: ClassEntry = {
  id: 'fighter-entry',
  classId: 'srd-5.2.1:class:fighter',
  level: 2,
  choices: {},
};

const multiclassCharacter: Character = {
  schemaVersion: 1,
  id: 'character-1',
  name: 'Test Character',
  ruleset: '5e-2024',
  longRestHitDiceRecovery: '2024-all',
  enabledContentPackIds: [],
  abilityScoreGeneration: 'custom',
  abilityScores,
  classes: [wizard, fighter],
  choices: {},
  proficiencies: {
    savingThrowAbilities: ['intelligence', 'wisdom'],
    skills: { arcana: 'expertise', athletics: 'proficient' },
  },
  knownSpellIds: [],
  preparedSpellIds: [],
  spellSelections: [],
  hitPointGains: [],
  inventory: [],
  manualOverrides: {},
};

describe('ability modifiers', () => {
  test.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [16, 3],
    [20, 5],
  ])('score %i has modifier %i', (score, expectedModifier) => {
    expect(getAbilityModifier(score).value).toBe(expectedModifier);
  });

  test('explains the source score and final modifier', () => {
    expect(getAbilityModifier(16)).toEqual({
      value: 3,
      terms: [
        { label: 'Ability score', operation: 'base', value: 16 },
        { label: 'Ability modifier', operation: 'set', value: 3 },
      ],
    });
  });
});

describe('character and class levels', () => {
  test('keeps total character level separate from each class level', () => {
    expect(getCharacterLevel([wizard, fighter]).value).toBe(5);
    expect(getClassLevel([wizard, fighter], wizard.classId).value).toBe(3);
    expect(getClassLevel([wizard, fighter], fighter.classId).value).toBe(2);
    expect(getClassLevel([wizard, fighter], 'srd-5.2.1:class:rogue').value).toBe(0);
  });

  test('rejects invalid class levels', () => {
    expect(() => getCharacterLevel([{ ...wizard, level: 1.5 }])).toThrow(RangeError);
  });
});

describe('proficiency bonus', () => {
  test.each([
    [1, 2], [2, 2], [3, 2], [4, 2],
    [5, 3], [6, 3], [7, 3], [8, 3],
    [9, 4], [10, 4], [11, 4], [12, 4],
    [13, 5], [14, 5], [15, 5], [16, 5],
    [17, 6], [18, 6], [19, 6], [20, 6],
  ])('level %i has a +%i proficiency bonus', (level, expectedBonus) => {
    expect(getProficiencyBonus(level).value).toBe(expectedBonus);
  });

  test('rejects levels outside the supported range', () => {
    expect(() => getProficiencyBonus(0)).toThrow(RangeError);
    expect(() => getProficiencyBonus(21)).toThrow(RangeError);
  });
});

describe('saving throws and skills', () => {
  test('adds proficiency to a proficient saving throw', () => {
    expect(getSavingThrow(abilityScores, 'intelligence', 5, true).value).toBe(4);
    expect(getSavingThrow(abilityScores, 'dexterity', 5, false).value).toBe(3);
  });

  test('applies proficiency and expertise to skills', () => {
    expect(getSkillCheck(abilityScores, 'athletics', 5, 'proficient').value).toBe(3);
    expect(getSkillCheck(abilityScores, 'arcana', 5, 'expertise').value).toBe(7);
    expect(getSkillCheck(abilityScores, 'perception', 5).value).toBe(-1);
  });

  test('explains the ability modifier and proficiency contribution', () => {
    expect(getSkillCheck(abilityScores, 'arcana', 5, 'expertise')).toEqual({
      value: 7,
      terms: [
        { label: 'Intelligence modifier', operation: 'base', value: 1 },
        { label: 'Skill expertise', operation: 'add', value: 6 },
      ],
    });
  });

  test('reads source proficiencies from a character without storing derived results', () => {
    expect(getCharacterSavingThrow(multiclassCharacter, 'intelligence').value).toBe(4);
    expect(getCharacterSkillCheck(multiclassCharacter, 'arcana').value).toBe(7);
  });
});

describe('modifier pipeline and overrides', () => {
  test('applies ordered additive and set modifiers with an explanation', () => {
    expect(
      applyModifiers(10, [
        { kind: 'add', label: 'Shield', value: 2 },
        { kind: 'set', label: 'Polymorph AC', value: 13 },
        { kind: 'add', label: 'Magic item', value: 1 },
      ]),
    ).toEqual({
      value: 14,
      terms: [
        { label: 'Base value', operation: 'base', value: 10 },
        { label: 'Shield', operation: 'add', value: 2 },
        { label: 'Polymorph AC', operation: 'set', value: 13 },
        { label: 'Magic item', operation: 'add', value: 1 },
      ],
    });
  });

  test('keeps a manual override separate from its calculated value', () => {
    const calculated = applyModifiers(15, []);
    const resolved = resolveManualOverride(
      calculated,
      { armorClass: { value: 17, reason: 'Table ruling' } },
      'armorClass',
    );

    expect(resolved.value).toBe(17);
    expect(resolved.calculation.value).toBe(15);
    expect(resolved.override).toEqual({ value: 17, reason: 'Table ruling' });
  });

  test('uses the calculated value when no override exists', () => {
    const calculated = applyModifiers(15, []);
    expect(resolveManualOverride(calculated, {}, 'armorClass')).toEqual({
      value: 15,
      calculation: calculated,
    });
  });
});
