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
  scalingBasis: z
    .enum(['character-level', 'class-level', 'ability-modifier', 'proficiency-bonus', 'fixed'])
    .optional(),
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
});

export const subclassSchema = contentEntitySchema.extend({
  kind: z.literal('subclass'),
  classId: contentIdSchema,
  advancement: z.array(advancementLevelSchema),
});

export const contentFixtureSchema = z.object({
  classes: z.array(classSchema),
  subclasses: z.array(subclassSchema),
  features: z.array(featureSchema),
  resources: z.array(resourceSchema),
  spells: z.array(spellSchema),
});
