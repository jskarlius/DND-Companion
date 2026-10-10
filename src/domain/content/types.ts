import type { Ability } from '../character/types';

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
export type SpellSelectionMode = 'known-and-prepared' | 'prepared-from-list';

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
