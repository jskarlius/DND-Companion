import { z } from 'zod';

const contentIdSchema = z.string().min(1);
const rulesetSchema = z.literal('5e-2024');
const packEntityKindSchema = z.enum([
  'class', 'subclass', 'species', 'background', 'feature', 'choice', 'resource', 'spell', 'feat', 'item',
]);
const abilitySchema = z.enum([
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
]);
const skillSchema = z.enum([
  'acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation',
  'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival',
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

export const choiceSchema = contentEntitySchema.extend({
  kind: z.literal('choice'),
  options: z.array(z.object({ id: z.string().min(1), name: z.string().min(1) })).min(1),
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

const levelOneCreationProfileSchema = z.object({
  skillChoices: z.object({ count: z.int().min(0), options: z.array(skillSchema).min(1) }),
  grantedToolIds: z.array(contentIdSchema).optional(),
  toolChoice: z.object({ id: z.string().min(1), count: z.int().positive(), optionIds: z.array(contentIdSchema).min(1) }).optional(),
  languageChoiceCount: z.int().positive().optional(),
  weaponTraining: z.array(z.string().min(1)),
  armorTraining: z.array(z.string().min(1)),
  startingEquipmentOptionCount: z.int().min(2).max(3),
  choices: z.array(z.object({
    id: z.string().min(1), label: z.string().min(1), count: z.int().positive(), optionIds: z.array(z.string().min(1)).min(1).optional(),
    optionCategory: z.enum(['skill-proficiency', 'weapon-mastery', 'eldritch-invocation']).optional(),
  }).refine((choice) => choice.optionIds !== undefined || choice.optionCategory !== undefined, 'must declare options or an option category')),
  resources: z.array(z.object({
    id: z.string().min(1), recharge: z.enum(['short-rest', 'long-rest', 'manual']),
    maximum: z.discriminatedUnion('basis', [
      z.object({ basis: z.literal('fixed'), value: z.int().positive() }),
      z.object({ basis: z.literal('ability-modifier'), ability: abilitySchema, minimum: z.int().positive() }),
      z.object({ basis: z.literal('class-level'), multiplier: z.int().positive() }),
    ]),
  })),
  spellcasting: z.object({
    cantrips: z.int().min(0), selectedSpells: z.int().min(0), spellbookSpells: z.int().positive().optional(), preparedSpells: z.int().min(0),
    preparationChange: z.enum(['long-rest', 'long-rest-one', 'on-class-level', 'none']),
    alwaysPreparedSpellIds: z.array(contentIdSchema).optional(),
  }).optional(),
});

const startingEquipmentPackageSchema = z.object({
  id: z.string().min(1),
  currencyGp: z.int().min(0),
  entries: z.array(z.discriminatedUnion('type', [
    z.object({ type: z.literal('item'), itemId: contentIdSchema, quantity: z.int().positive() }),
    z.object({ type: z.literal('chosen-item'), choiceId: z.string().min(1), quantity: z.int().positive() }),
  ])),
});

const creationProfileSchema = z.object({
  choices: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), count: z.int().positive(), optionIds: z.array(z.string().min(1)).min(1) })),
  skillGrants: z.array(skillSchema),
  toolGrants: z.array(contentIdSchema),
  abilityScoreOptions: z.array(abilitySchema).length(3).optional(),
  equipmentPackages: z.array(startingEquipmentPackageSchema).optional(),
  featIds: z.array(contentIdSchema).optional(),
  spellGrants: z.array(z.object({ id: z.string().min(1), spellListClassId: contentIdSchema, cantripCount: z.int().min(0), spellCount: z.int().min(0), spellLevel: z.int().min(1).max(9), castingAbilityChoiceId: z.string().min(1).optional(), replacement: z.enum(['none', 'on-level-up']) })).optional(),
}).strict();

const speciesTraitsSchema = z.object({
  size: z.string().min(1),
  speed: z.int().positive(),
  senses: z.array(z.string().min(1)),
  damageResistances: z.array(z.string().min(1)),
  maximumHpPerCharacterLevel: z.int().positive().optional(),
}).strict();
const speciesChoiceSchema = z.object({
  id: z.string().min(1), label: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), description: z.string().min(1), resource: z.object({ recharge: z.enum(['short-rest', 'long-rest', 'manual']), maximum: z.literal('proficiency-bonus') }).optional(), skillGrants: z.array(skillSchema).optional(), traits: speciesTraitsSchema.partial().optional(), grantedSpells: z.array(z.object({ spellId: contentIdSchema, acquiredAtCharacterLevel: z.int().min(1).max(20), preparation: z.enum(['always-prepared', 'available']), freeCast: z.boolean().optional() })).optional(), requiresSpellcastingAbility: z.boolean().optional() })).min(1),
});
const speciesResourceSchema = z.object({ id: z.string().min(1), label: z.string().min(1), recharge: z.enum(['short-rest', 'long-rest', 'manual']), maximum: z.literal('proficiency-bonus') });

export const classSchema = contentEntitySchema.extend({
  kind: z.literal('class'),
  hitDie: z.int().positive(),
  savingThrowAbilities: z.array(abilitySchema).min(1),
  advancement: z.array(advancementLevelSchema),
  spellListIds: z.array(contentIdSchema),
  levelOne: levelOneCreationProfileSchema.optional(),
  startingEquipmentPackages: z.array(startingEquipmentPackageSchema).optional(),
  subclassSelectionLevel: z.int().min(1).max(20).optional(),
  multiclassing: z.object({
    prerequisiteGroups: z.array(z.partialRecord(abilitySchema, z.int().min(1).max(30))).min(1),
    initialGrants: z.array(advancementGrantSchema),
  }).optional(),
  spellcasting: z.object({
    ability: abilitySchema,
    slotKind: z.enum(['spell-slots', 'pact-magic']),
    slotRecharge: z.enum(['short-rest', 'long-rest']),
    selectionMode: z.enum(['known-and-prepared', 'prepared-from-list', 'level-up-list']).default('known-and-prepared'),
    multiclassContribution: z.enum(['full', 'half-round-up', 'half-round-down', 'third-round-down', 'none']).default('full'),
    progression: z.array(z.object({
      level: z.int().min(1).max(20),
      cantripsKnown: z.int().min(0),
      spellsLearned: z.int().min(0).default(0),
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
  choices: z.array(choiceSchema).default([]),
  resources: z.array(resourceSchema),
  spells: z.array(spellSchema),
  feats: z.array(featSchema),
  species: z.array(contentEntitySchema.extend({ kind: z.literal('species'), featureIds: z.array(contentIdSchema) }).passthrough()).default([]),
  backgrounds: z.array(contentEntitySchema.extend({ kind: z.literal('background'), featureIds: z.array(contentIdSchema) }).passthrough()).default([]),
  items: z.array(contentEntitySchema.extend({ kind: z.literal('item') }).passthrough()).default([]),
});

export const contentPackManifestSchema = z.object({
  schemaVersion: z.int().positive(),
  id: contentIdSchema,
  name: z.string().min(1),
  version: z.string().min(1),
  ruleset: rulesetSchema,
  distribution: z.enum(['public', 'private']),
  source: contentEntitySchema.shape.source,
  modules: z.array(z.object({
    path: z.string().min(1).refine((path) => !path.startsWith('/') && !path.includes('..'), 'must be a relative module path'),
    kinds: z.array(packEntityKindSchema).min(1),
    // Zod treats enum-keyed records as exhaustive. Manifest counts are sparse
    // because each module contains only a few kinds.
    counts: z.record(z.string(), z.int().positive()).refine(
      (counts) => Object.keys(counts).every((kind) => packEntityKindSchema.safeParse(kind).success),
      'may only contain known entity kinds',
    ),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })).min(1),
  report: z.object({
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
});

export const packEntitySchema = contentEntitySchema.extend({
  kind: packEntityKindSchema,
  reference: z.unknown().optional(),
  ownerId: contentIdSchema.optional(),
  featureIds: z.array(contentIdSchema).optional(),
  parentClassId: contentIdSchema.optional(),
  spellListClassIds: z.array(contentIdSchema).refine(
    (ids) => new Set(ids).size === ids.length,
    'must not repeat class IDs',
  ).optional(),
  equipmentPackages: z.array(startingEquipmentPackageSchema).optional(),
  creation: creationProfileSchema.optional(),
  traits: speciesTraitsSchema.optional(),
  choices: z.array(speciesChoiceSchema).optional(),
  resources: z.array(speciesResourceSchema).optional(),
}).passthrough().superRefine((entity, context) => {
  if (entity.kind === 'spell' && entity.spellListClassIds === undefined) {
    context.addIssue({ code: 'custom', path: ['spellListClassIds'], message: 'is required for spell entities' });
  }
});

export const contentPackModuleSchema = z.object({
  schemaVersion: z.int().positive(),
  moduleKind: z.string().min(1),
}).catchall(z.unknown());

export const contentPackSchema = z.object({
  manifest: contentPackManifestSchema,
  modules: z.array(contentPackModuleSchema).min(1),
});
