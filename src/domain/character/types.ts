export const ABILITIES = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
] as const;

export type Ability = (typeof ABILITIES)[number];

export const SKILLS = [
  'acrobatics',
  'animalHandling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleightOfHand',
  'stealth',
  'survival',
] as const;

export type Skill = (typeof SKILLS)[number];

export const SKILL_ABILITIES: Readonly<Record<Skill, Ability>> = {
  acrobatics: 'dexterity',
  animalHandling: 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  sleightOfHand: 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

export type AbilityScores = Readonly<Record<Ability, number>>;

export type AbilityScoreGeneration = 'standard-array' | 'point-buy' | 'custom';

export type ChoiceValue = string | readonly string[];

export interface ClassEntry {
  readonly id: string;
  readonly classId: string;
  readonly subclassId?: string;
  readonly level: number;
  readonly choices: Readonly<Record<string, ChoiceValue>>;
}

export type SkillProficiency = 'none' | 'proficient' | 'expertise';

export interface CharacterProficiencies {
  readonly savingThrowAbilities: readonly Ability[];
  readonly skills: Readonly<Partial<Record<Skill, SkillProficiency>>>;
}

export const MANUAL_OVERRIDE_TARGETS = [
  'armorClass',
  'maximumHp',
  'speed',
  'spellAttackBonus',
  'spellSaveDc',
] as const;

export type ManualOverrideTarget = (typeof MANUAL_OVERRIDE_TARGETS)[number];

export interface ManualOverride {
  readonly value: number;
  readonly reason?: string;
}

export type ManualOverrides = Readonly<
  Partial<Record<ManualOverrideTarget, ManualOverride>>
>;

/**
 * Source-of-truth character decisions. Derived values and temporary play state
 * intentionally do not belong here.
 */
export interface Character {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly ruleset: '5e-2024';
  readonly enabledContentPackIds: readonly string[];
  readonly abilityScoreGeneration: AbilityScoreGeneration;
  readonly abilityScores: AbilityScores;
  readonly classes: readonly ClassEntry[];
  readonly choices: Readonly<Record<string, ChoiceValue>>;
  readonly proficiencies: CharacterProficiencies;
  readonly knownSpellIds: readonly string[];
  readonly preparedSpellIds: readonly string[];
  readonly inventory: readonly InventoryEntry[];
  readonly manualOverrides: ManualOverrides;
}

/** A lightweight placeholder until Slice 3 defines the item content schema. */
export interface InventoryEntry {
  readonly itemId: string;
  readonly quantity: number;
}

/** Temporary state is stored separately so character edits and level-up preserve it. */
export interface CharacterPlayState {
  readonly characterId: string;
  readonly currentHp: number;
  readonly temporaryHp: number;
  /** Time-limited maximum-HP increases, initially used for the Aid spell. */
  readonly temporaryMaximumHpBonus: number;
  readonly inspiration: boolean;
  readonly usedResources: Readonly<Record<string, number>>;
  readonly usedSpellSlots: Readonly<Partial<Record<number, number>>>;
  readonly deathSaveSuccesses: number;
  readonly deathSaveFailures: number;
  readonly conditions: readonly string[];
}

export interface CalculationTerm {
  readonly label: string;
  readonly operation: 'base' | 'add' | 'set';
  readonly value: number;
}

export interface CalculationResult {
  readonly value: number;
  readonly terms: readonly CalculationTerm[];
}

export type Modifier =
  | {
      readonly kind: 'add';
      readonly label: string;
      readonly value: number;
    }
  | {
      readonly kind: 'set';
      readonly label: string;
      readonly value: number;
    };

/** Keeps the underlying calculation visible when a player applies an override. */
export interface ResolvedCalculation {
  readonly value: number;
  readonly calculation: CalculationResult;
  readonly override?: ManualOverride;
}
