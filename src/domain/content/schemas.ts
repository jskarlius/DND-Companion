import { z } from 'zod';

const contentIdSchema = z.string().min(1);
const rulesetSchema = z.literal('5e-2024');
const abilitySchema = z.enum([
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);

const contentEntitySchema = z.object({
  id: contentIdSchema,
  name: z.string().min(1),
  ruleset: rulesetSchema,
  source: z.object({
    title: z.string().min(1),
    license: z.string().min(1),
    url: z.url().optional(),
    upstreamVersion: z.string().min(1).optional(),
    attribution: z.string().min(1).optional(),
  }),
});

export const featureSchema = contentEntitySchema.extend({
  kind: z.literal('feature'),
  automation: z.enum(['reference', 'tracked', 'automated']),
  resourceId: contentIdSchema.optional(),
});

export const resourceSchema = contentEntitySchema.extend({
  kind: z.literal('resource'),
  maximum: z.int().positive(),
  recharge: z.enum(['short-rest', 'long-rest', 'manual']),
});

export const spellSchema = contentEntitySchema.extend({
  kind: z.literal('spell'),
  level: z.int().min(0).max(9),
  castingTime: z.string().min(1).optional(),
  range: z.string().min(1).optional(),
  duration: z.string().min(1).optional(),
  components: z.object({
    verbal: z.boolean().optional(),
    somatic: z.boolean().optional(),
    material: z.string().min(1).optional(),
  }).optional(),
  concentration: z.boolean().optional(),
  ritual: z.boolean().optional(),
  description: z.string().min(1).optional(),
  higherLevelDescription: z.string().min(1).optional(),
  damage: z.string().min(1).optional(),
  damageTypes: z.array(z.string().min(1)).optional(),
  scalingBasis: z
    .enum(['character-level', 'class-level', 'ability-modifier', 'proficiency-bonus', 'fixed'])
    .optional(),
});

export const featSchema = contentEntitySchema.extend({
  kind: z.literal('feat'),
  category: z.string().min(1),
  prerequisite: z.string().min(1).optional(),
  benefits: z.array(z.string().min(1)),
  automation: z.enum(['reference', 'tracked', 'automated']),
});

export const advancementGrantSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('feature'), featureId: contentIdSchema }),
  z.object({ type: z.literal('resource'), resourceId: contentIdSchema, amount: z.int().positive() }),
  z.object({ type: z.literal('choice'), choiceId: contentIdSchema }),
  z.object({ type: z.literal('ability-score-improvement') }),
]);

export const advancementLevelSchema = z.object({
  level: z.int().min(1).max(20),
  grants: z.array(advancementGrantSchema),
});

export const classSchema = contentEntitySchema.extend({
  kind: z.literal('class'),
  hitDie: z.int().positive(),
  savingThrowAbilities: z.array(abilitySchema).min(1),
  advancement: z.array(advancementLevelSchema),
  spellListIds: z.array(contentIdSchema),
  spellcasting: z.object({
    ability: abilitySchema,
    slotKind: z.enum(['spell-slots', 'pact-magic']),
    slotRecharge: z.enum(['short-rest', 'long-rest']),
    progression: z.array(z.object({
      level: z.int().min(1).max(20),
      cantripsKnown: z.int().min(0),
      preparedSpells: z.int().min(0),
      slots: z.record(z.string(), z.int().min(0)),
    })),
  }).optional(),
});

export const subclassSchema = contentEntitySchema.extend({
  kind: z.literal('subclass'),
  classId: contentIdSchema,
  advancement: z.array(advancementLevelSchema),
});

export const contentFixtureSchema = z.object({
  manifest: z.object({
    schemaVersion: z.int().positive(),
    id: contentIdSchema,
    name: z.string().min(1),
    version: z.string().min(1),
    ruleset: rulesetSchema,
    distribution: z.enum(['public', 'private']),
    source: contentEntitySchema.shape.source,
  }),
  classes: z.array(classSchema),
  subclasses: z.array(subclassSchema),
  features: z.array(featureSchema),
  resources: z.array(resourceSchema),
  spells: z.array(spellSchema),
  feats: z.array(featSchema),
});
