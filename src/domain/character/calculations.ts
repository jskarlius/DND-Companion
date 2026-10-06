import {
  type Ability,
  type AbilityScores,
  type CalculationResult,
  type Character,
  type ClassEntry,
  type ManualOverrides,
  type ManualOverrideTarget,
  type Modifier,
  type ResolvedCalculation,
  SKILL_ABILITIES,
  type Skill,
  type SkillProficiency,
} from './types';

const MAX_CHARACTER_LEVEL = 20;

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer.`);
  }
}

function assertCharacterLevel(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > MAX_CHARACTER_LEVEL) {
    throw new RangeError(
      `Character level must be an integer from 1 to ${MAX_CHARACTER_LEVEL}.`,
    );
  }
}

/** Returns the D&D ability modifier for a score, including negative modifiers. */
export function getAbilityModifier(score: number): CalculationResult {
  if (!Number.isInteger(score)) {
    throw new RangeError('Ability score must be an integer.');
  }

  const value = Math.floor((score - 10) / 2);

  return {
    value,
    terms: [
      { label: 'Ability score', operation: 'base', value: score },
      { label: 'Ability modifier', operation: 'set', value },
    ],
  };
}

/** Adds all class levels; total character level is distinct from each class level. */
export function getCharacterLevel(classes: readonly ClassEntry[]): CalculationResult {
  const terms = classes.map((classEntry) => {
    assertNonNegativeInteger(classEntry.level, `${classEntry.classId} level`);

    return {
      label: `${classEntry.classId} level`,
      operation: 'add' as const,
      value: classEntry.level,
    };
  });

  return {
    value: terms.reduce((total, term) => total + term.value, 0),
    terms: [{ label: 'Starting level', operation: 'base', value: 0 }, ...terms],
  };
}

/** Finds the combined level in a class, without confusing it with total level. */
export function getClassLevel(
  classes: readonly ClassEntry[],
  classId: string,
): CalculationResult {
  const matchingClasses = classes.filter((classEntry) => classEntry.classId === classId);

  const terms = matchingClasses.map((classEntry) => {
    assertNonNegativeInteger(classEntry.level, `${classId} level`);

    return {
      label: `${classId} level`,
      operation: 'add' as const,
      value: classEntry.level,
    };
  });

  return {
    value: terms.reduce((total, term) => total + term.value, 0),
    terms: [{ label: 'Starting class level', operation: 'base', value: 0 }, ...terms],
  };
}

/** Calculates the 2024 proficiency bonus from total character level. */
export function getProficiencyBonus(characterLevel: number): CalculationResult {
  assertCharacterLevel(characterLevel);

  const value = 2 + Math.floor((characterLevel - 1) / 4);

  return {
    value,
    terms: [
      { label: 'Character level', operation: 'base', value: characterLevel },
      { label: 'Proficiency bonus', operation: 'set', value },
    ],
  };
}

/** Applies ordered additions and sets while preserving an explanation for the UI. */
export function applyModifiers(base: number, modifiers: readonly Modifier[]): CalculationResult {
  if (!Number.isFinite(base)) {
    throw new RangeError('Calculation base must be a finite number.');
  }

  let value = base;
  const terms: CalculationResult['terms'][number][] = [
    { label: 'Base value', operation: 'base', value: base },
  ];

  for (const modifier of modifiers) {
    if (!Number.isFinite(modifier.value)) {
      throw new RangeError(`${modifier.label} must be a finite number.`);
    }

    if (modifier.kind === 'add') {
      value += modifier.value;
      terms.push({ label: modifier.label, operation: 'add', value: modifier.value });
    } else {
      value = modifier.value;
      terms.push({ label: modifier.label, operation: 'set', value: modifier.value });
    }
  }

  return { value, terms };
}

function formatAbility(ability: Ability): string {
  return `${ability.charAt(0).toUpperCase()}${ability.slice(1)}`;
}

function withAbilityModifierExplanation(
  result: CalculationResult,
  ability: Ability,
): CalculationResult {
  return {
    ...result,
    terms: result.terms.map((term, index) =>
      index === 0
        ? { ...term, label: `${formatAbility(ability)} modifier` }
        : term,
    ),
  };
}

export function getSavingThrow(
  abilityScores: AbilityScores,
  ability: Ability,
  characterLevel: number,
  isProficient: boolean,
  modifiers: readonly Modifier[] = [],
): CalculationResult {
  const abilityModifier = getAbilityModifier(abilityScores[ability]);
  const proficiencyBonus = getProficiencyBonus(characterLevel);

  return withAbilityModifierExplanation(applyModifiers(abilityModifier.value, [
    ...(isProficient
      ? [
          {
            kind: 'add' as const,
            label: 'Saving throw proficiency',
            value: proficiencyBonus.value,
          },
        ]
      : []),
    ...modifiers,
  ]), ability);
}

export function getSkillCheck(
  abilityScores: AbilityScores,
  skill: Skill,
  characterLevel: number,
  proficiency: SkillProficiency = 'none',
  modifiers: readonly Modifier[] = [],
): CalculationResult {
  const ability = SKILL_ABILITIES[skill];
  const abilityModifier = getAbilityModifier(abilityScores[ability]);
  const proficiencyBonus = getProficiencyBonus(characterLevel);
  const proficiencyMultiplier = proficiency === 'expertise' ? 2 : proficiency === 'proficient' ? 1 : 0;

  return withAbilityModifierExplanation(applyModifiers(abilityModifier.value, [
    ...(proficiencyMultiplier > 0
      ? [
          {
            kind: 'add' as const,
            label: proficiency === 'expertise' ? 'Skill expertise' : 'Skill proficiency',
            value: proficiencyBonus.value * proficiencyMultiplier,
          },
        ]
      : []),
    ...modifiers,
  ]), ability);
}

export function getCharacterSavingThrow(
  character: Character,
  ability: Ability,
  modifiers: readonly Modifier[] = [],
): CalculationResult {
  return getSavingThrow(
    character.abilityScores,
    ability,
    getCharacterLevel(character.classes).value,
    character.proficiencies.savingThrowAbilities.includes(ability),
    modifiers,
  );
}

export function getCharacterSkillCheck(
  character: Character,
  skill: Skill,
  modifiers: readonly Modifier[] = [],
): CalculationResult {
  return getSkillCheck(
    character.abilityScores,
    skill,
    getCharacterLevel(character.classes).value,
    character.proficiencies.skills[skill] ?? 'none',
    modifiers,
  );
}

/**
 * Applies a player override without mutating or discarding the calculated
 * result, so the UI can show both the ordinary calculation and the exception.
 */
export function resolveManualOverride(
  calculation: CalculationResult,
  overrides: ManualOverrides,
  target: ManualOverrideTarget,
): ResolvedCalculation {
  const override = overrides[target];

  return override
    ? { value: override.value, calculation, override }
    : { value: calculation.value, calculation };
}
