import type { Ability, Skill } from '../character/types';

/** Identifies the rules release whose mechanics an entity follows. */
export type Ruleset = '5e-2024';

/** Stable, source-qualified identifier used for every cross-reference. */
export type ContentId = string;

export type AutomationTier = 'reference' | 'tracked' | 'automated';

export type ScalingBasis =
  | 'character-level'
  | 'class-level'
  | 'ability-modifier'
  | 'proficiency-bonus'
  | 'fixed';

export type Recharge = 'short-rest' | 'long-rest' | 'manual';
/** When a class is allowed to change its level-1+ spell list. */
export type SpellSelectionMode = 'known-and-prepared' | 'prepared-from-list' | 'level-up-list';

/**
 * Reviewed creation facts which Open5e currently exposes only as prose. They
 * describe a first class level; they are not a second, character-owned rules
 * model. The creation planner will turn these requirements into choices.
 */
export interface LevelOneCreationProfile {
  readonly skillChoices: { readonly count: number; readonly options: readonly Skill[] };
  readonly grantedToolIds?: readonly string[];
  readonly toolChoice?: { readonly id: string; readonly count: number; readonly categories: readonly ('artisan-tools' | 'musical-instruments')[] };
  readonly languageChoiceCount?: number;
  readonly weaponTraining: readonly string[];
  readonly armorTraining: readonly string[];
  /** Number of class equipment alternatives. Their item resolution remains pack-owned. */
  readonly startingEquipmentOptionCount: number;
  readonly choices: readonly LevelOneChoice[];
  readonly resources: readonly LevelOneResource[];
  readonly spellcasting?: LevelOneSpellcasting;
}

/** A source-reviewed class/background equipment alternative, resolved at creation. */
export interface StartingEquipmentPackage {
  readonly id: string;
  readonly currencyGp: number;
  readonly entries: readonly StartingEquipmentEntry[];
}

export type StartingEquipmentEntry =
  | { readonly type: 'item'; readonly itemId: ContentId; readonly quantity: number }
  | { readonly type: 'chosen-item'; readonly choiceId: string; readonly quantity: number };

export interface LevelOneChoice {
  readonly id: string;
  readonly label: string;
  readonly count: number;
  /** Stable option IDs; these may be content IDs or owner-local option keys. */
  readonly optionIds?: readonly string[];
  /** A reviewed category whose options are not yet content entities. */
  readonly optionCategory?: 'skill-proficiency' | 'weapon-mastery' | 'eldritch-invocation';
}

export interface LevelOneResource {
  readonly id: string;
  readonly recharge: Recharge;
  readonly maximum: { readonly basis: 'fixed' | 'ability-modifier' | 'class-level'; readonly value?: number; readonly ability?: Ability; readonly multiplier?: number; readonly minimum?: number };
}

export interface LevelOneSpellcasting {
  readonly cantrips: number;
  /** The persistent class-owned list chosen at creation, if any. */
  readonly selectedSpells: number;
  /** Wizard-style spellbook contents, distinct from the prepared subset. */
  readonly spellbookSpells?: number;
  readonly preparedSpells: number;
  readonly preparationChange: 'long-rest' | 'long-rest-one' | 'on-class-level' | 'none';
  readonly alwaysPreparedSpellIds?: readonly ContentId[];
}

export interface ContentSource {
  readonly title: string;
  readonly license: string;
  readonly url?: string;
  /** Exact source version or upstream document key; never inferred from an ID. */
  readonly upstreamVersion?: string;
  readonly attribution?: string;
}

export interface ContentEntity {
  readonly id: ContentId;
  readonly name: string;
  readonly ruleset: Ruleset;
  readonly source: ContentSource;
}

export interface Feature extends ContentEntity {
  readonly kind: 'feature';
  readonly automation: AutomationTier;
  readonly resourceId?: ContentId;
}

/** A rules-owned selection recorded on the class entry that receives it. */
export interface Choice extends ContentEntity {
  readonly kind: 'choice';
  readonly options: readonly { readonly id: string; readonly name: string }[];
}

export interface Resource extends ContentEntity {
  readonly kind: 'resource';
  readonly maximum: number;
  readonly recharge: Recharge;
}

export interface Spell extends ContentEntity {
  readonly kind: 'spell';
  readonly level: number;
  /** Compact casting detail for spell-list displays. */
  readonly castingTime?: string;
  readonly range?: string;
  readonly duration?: string;
  readonly components?: {
    readonly verbal?: boolean;
    readonly somatic?: boolean;
    readonly material?: string;
  };
  readonly concentration?: boolean;
  readonly ritual?: boolean;
  /** Reference text only; the application does not resolve spell effects. */
  readonly description?: string;
  readonly higherLevelDescription?: string;
  readonly damage?: string;
  readonly damageTypes?: readonly string[];
  /** The rule that determines when this spell's effect scales, if it does. */
  readonly scalingBasis?: ScalingBasis;
}

/** A selectable rules entity. Mechanical automation remains deliberately opt-in. */
export interface Feat extends ContentEntity {
  readonly kind: 'feat';
  readonly category: string;
  readonly prerequisite?: string;
  readonly benefits: readonly string[];
  readonly automation: AutomationTier;
}

export type AdvancementGrant =
  | { readonly type: 'feature'; readonly featureId: ContentId }
  | { readonly type: 'resource'; readonly resourceId: ContentId; readonly amount: number }
  | { readonly type: 'choice'; readonly choiceId: ContentId }
  | { readonly type: 'ability-score-improvement' };

export interface AdvancementLevel {
  readonly level: number;
  readonly grants: readonly AdvancementGrant[];
}

export interface Class extends ContentEntity {
  readonly kind: 'class';
  readonly hitDie: number;
  readonly savingThrowAbilities: readonly Ability[];
  readonly advancement: readonly AdvancementLevel[];
  readonly spellListIds: readonly ContentId[];
  /** Reviewed first-level creation requirements for this class. */
  readonly levelOne?: LevelOneCreationProfile;
  readonly startingEquipmentPackages?: readonly StartingEquipmentPackage[];
  /** The level at which this class asks its entry to choose a subclass. */
  readonly subclassSelectionLevel?: number;
  readonly multiclassing?: {
    /** Meet every score in any one group (Fighter is Strength 13 or Dexterity 13). */
    readonly prerequisiteGroups: readonly Readonly<Partial<Record<Ability, number>>>[];
    /** Grants applied only when this class is newly multiclassed into. */
    readonly initialGrants: readonly AdvancementGrant[];
  };
  /** Present only for a class with Spellcasting or Pact Magic. */
  readonly spellcasting?: {
    readonly ability: Ability;
    readonly slotKind: 'spell-slots' | 'pact-magic';
    readonly slotRecharge: 'short-rest' | 'long-rest';
    readonly selectionMode: SpellSelectionMode;
    /** Contribution to the ordinary multiclass spell-slot table. */
    readonly multiclassContribution: 'full' | 'half-round-up' | 'half-round-down' | 'third-round-down' | 'none';
    readonly progression: readonly SpellcastingProgression[];
  };
}

export interface SpellcastingProgression {
  readonly level: number;
  readonly cantripsKnown: number;
  /** Spells added to a known-spell collection or spellbook at this class level. */
  readonly spellsLearned?: number;
  readonly preparedSpells: number;
  readonly slots: Readonly<Record<number, number>>;
}

export interface Subclass extends ContentEntity {
  readonly kind: 'subclass';
  readonly classId: ContentId;
  readonly advancement: readonly AdvancementLevel[];
}

export interface ContentFixture {
  readonly manifest: ContentPackManifest;
  readonly classes: readonly Class[];
  readonly subclasses: readonly Subclass[];
  readonly features: readonly Feature[];
  readonly choices: readonly Choice[];
  readonly resources: readonly Resource[];
  readonly spells: readonly Spell[];
  readonly feats: readonly Feat[];
}

export interface ContentPackManifest {
  readonly schemaVersion: number;
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly ruleset: Ruleset;
  readonly distribution: 'public' | 'private';
  readonly source: ContentSource;
}

/** The kinds exposed by the module-based public/private pack interchange format. */
export type PackEntityKind =
  | 'class' | 'subclass' | 'species' | 'background' | 'feature' | 'choice'
  | 'resource' | 'spell' | 'feat' | 'item';

/**
 * A source-preserving entity.  `reference` deliberately remains opaque: an
 * import must never infer mechanics that its source did not structure.
 */
export interface PackEntity extends ContentEntity {
  readonly kind: PackEntityKind;
  readonly reference?: unknown;
  readonly ownerId?: ContentId;
  readonly featureIds?: readonly ContentId[];
  readonly parentClassId?: ContentId;
  /**
   * Classes whose spell lists include this spell. This belongs on the spell so
   * another pack can extend a class list without replacing its class record.
   */
  readonly spellListClassIds?: readonly ContentId[];
  readonly equipmentPackages?: readonly StartingEquipmentPackage[];
}

export interface ContentPackModule {
  readonly schemaVersion: number;
  readonly moduleKind: string;
  readonly [key: string]: unknown;
}

export interface ContentPackModuleDescriptor {
  readonly path: string;
  readonly kinds: readonly PackEntityKind[];
  readonly counts: Readonly<Partial<Record<PackEntityKind, number>>>;
  readonly sha256: string;
}

export interface ProductionContentPackManifest extends ContentPackManifest {
  readonly modules: readonly ContentPackModuleDescriptor[];
  readonly report: { readonly path: string; readonly sha256: string };
}

/** Portable representation; directory packs use the same modules separately. */
export interface ContentPack {
  readonly manifest: ProductionContentPackManifest;
  readonly modules: readonly ContentPackModule[];
}

export interface Item extends PackEntity {
  readonly kind: 'item';
}
