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

export interface ContentSource {
  readonly title: string;
  readonly license: string;
  readonly url?: string;
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
  /** The rule that determines when this spell's effect scales, if it does. */
  readonly scalingBasis?: ScalingBasis;
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
  /** Present only for a class with Spellcasting or Pact Magic. */
  readonly spellcasting?: {
    readonly ability: Ability;
    readonly slotKind: 'spell-slots' | 'pact-magic';
    readonly slotRecharge: 'short-rest' | 'long-rest';
  };
}

export interface Subclass extends ContentEntity {
  readonly kind: 'subclass';
  readonly classId: ContentId;
  readonly advancement: readonly AdvancementLevel[];
}

export interface ContentFixture {
  readonly classes: readonly Class[];
  readonly subclasses: readonly Subclass[];
  readonly features: readonly Feature[];
  readonly resources: readonly Resource[];
  readonly spells: readonly Spell[];
}
