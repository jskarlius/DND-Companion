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
export type LongRestHitDiceRecovery = '2024-all' | '2014-half';

export type ChoiceValue = string | readonly string[];

/** A selection whose valid options are defined by source-qualified content. */
export interface SourceChoiceSelection {
  readonly ownerId: string;
  readonly choiceId: string;
  readonly optionIds: readonly string[];
}

/** A spell granted by species, background, feat, or feature instead of a class entry. */
export interface GrantedSpell {
  readonly grantorId: string;
  readonly spellId: string;
  readonly acquiredAtCharacterLevel: number;
  readonly castingAbility: Ability;
  readonly preparation: 'always-prepared' | 'available';
  /** Stable historical spell IDs when a grant explicitly permits replacement. */
  readonly replacementHistory: readonly string[];
}

export interface ClassEntry {
  readonly id: string;
  readonly classId: string;
  readonly subclassId?: string;
  readonly level: number;
  readonly choices: Readonly<Record<string, ChoiceValue>>;
}

/** A spell remains owned by the class entry that granted it. */
export interface SpellSelection {
  readonly classEntryId: string;
  readonly spellId: string;
  readonly acquiredAtClassLevel: number;
  /** @deprecated Prepared state is stored separately in Character.preparedSpells. */
  readonly prepared: boolean;
}

/** A daily prepared spell is independent of a spellbook or known-spell entry. */
export interface PreparedSpell {
  readonly classEntryId: string;
  readonly spellId: string;
}

/** Records only the HP decision made for a gained class level. */
export interface HitPointGain {
  readonly classEntryId: string;
  readonly classLevel: number;
  readonly method: 'fixed' | 'rolled' | 'custom';
  readonly hitPoints: number;
}

export type SkillProficiency = 'none' | 'proficient' | 'expertise';

/** A player exception that overlays, but never replaces, a content-derived grant. */
export interface ProficiencyOverride<T extends string> {
  readonly value: T;
  readonly reason?: string;
}

export interface ProficiencyOverrides {
  readonly skills: Readonly<Partial<Record<Skill, ProficiencyOverride<SkillProficiency>>>>;
  readonly savingThrows: Readonly<Partial<Record<Ability, ProficiencyOverride<'none' | 'proficient'>>>>;
}

/** Coin denominations are preserved individually; no implicit exchange occurs. */
export interface CurrencyPurse {
  readonly cp: number;
  readonly sp: number;
  readonly ep: number;
  readonly gp: number;
  readonly pp: number;
}

export const EMPTY_CURRENCY_PURSE: CurrencyPurse = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export interface CharacterProficiencies {
  readonly savingThrowAbilities: readonly Ability[];
  readonly skills: Readonly<Partial<Record<Skill, SkillProficiency>>>;
  /** Class/background training is source data, kept separately from inventory. */
  readonly weaponTraining: readonly string[];
  readonly armorTraining: readonly string[];
  /** Tool IDs refer to item records; languages use stable IDs once catalogued. */
  readonly toolIds: readonly string[];
  readonly languageIds: readonly string[];
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
  /** A table-rule choice; this does not change the character's ruleset. */
  readonly longRestHitDiceRecovery: LongRestHitDiceRecovery;
  readonly enabledContentPackIds: readonly string[];
  readonly abilityScoreGeneration: AbilityScoreGeneration;
  /** Values selected by the generation method before origin grants apply. */
  readonly generatedAbilityScores?: AbilityScores;
  /** Derived final values used by rules calculations and displayed on the sheet. */
  readonly abilityScores: AbilityScores;
  /** Optional only while pre-Wizard-creation records are migrated. */
  readonly speciesId?: string;
  readonly backgroundId?: string;
  readonly classes: readonly ClassEntry[];
  readonly choices: Readonly<Record<string, ChoiceValue>>;
  /** Choices owned by content other than a class entry. */
  readonly sourceChoices?: readonly SourceChoiceSelection[];
  readonly proficiencies: CharacterProficiencies;
  /** Missing only on pre-migration records; readers treat it as an empty overlay. */
  readonly proficiencyOverrides?: ProficiencyOverrides;
  /** @deprecated Migrated to spellSelections at database/import boundaries. */
  readonly knownSpellIds: readonly string[];
  /** @deprecated Migrated to spellSelections at database/import boundaries. */
  readonly preparedSpellIds: readonly string[];
  readonly spellSelections: readonly SpellSelection[];
  /** Class-entry-owned daily preparation state; it never changes spell ownership. */
  readonly preparedSpells: readonly PreparedSpell[];
  /** Non-class spell grants remain distinct from spellbook/known spell ownership. */
  readonly grantedSpells?: readonly GrantedSpell[];
  readonly hitPointGains: readonly HitPointGain[];
  /** Currency is character-owned rather than represented by inventory items. */
  readonly currency?: CurrencyPurse;
  /** @deprecated Legacy value retained only until the currency migration runs. */
  readonly currencyGp: number;
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
  /** Used dice, keyed by stable class-entry ID. */
  readonly usedHitDice: Readonly<Record<string, number>>;
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
