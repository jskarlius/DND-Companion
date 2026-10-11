import { z } from 'zod';
import { ABILITIES, MANUAL_OVERRIDE_TARGETS, SKILLS, type Character, type CharacterPlayState } from '../domain/character/types';
import { migrateDevelopmentContentIds } from '../domain/content/contentIdMigration';

/** The format of a character file is independent from whichever local database we use. */
export const CHARACTER_EXPORT_SCHEMA_VERSION = 8;

const choiceValueSchema = z.union([z.string(), z.array(z.string())]);
const abilitySchema = z.enum(ABILITIES);
const skillSchema = z.enum(SKILLS);
const manualOverrideTargetSchema = z.enum(MANUAL_OVERRIDE_TARGETS);

const characterFieldsSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ruleset: z.literal('5e-2024'),
  longRestHitDiceRecovery: z.enum(['2024-all', '2014-half']),
  enabledContentPackIds: z.array(z.string()),
  abilityScoreGeneration: z.enum(['standard-array', 'point-buy', 'custom']),
  generatedAbilityScores: z.record(abilitySchema, z.number()).optional(),
  abilityScores: z.record(abilitySchema, z.number()),
  speciesId: z.string().min(1).optional(),
  backgroundId: z.string().min(1).optional(),
  classes: z.array(z.object({
    id: z.string().min(1),
    classId: z.string().min(1),
    subclassId: z.string().min(1).optional(),
    level: z.number().int().min(1),
    choices: z.record(z.string(), choiceValueSchema),
  })),
  choices: z.record(z.string(), choiceValueSchema),
  sourceChoices: z.array(z.object({ ownerId: z.string().min(1), choiceId: z.string().min(1), optionIds: z.array(z.string().min(1)).min(1) })).optional(),
  proficiencies: z.object({
    savingThrowAbilities: z.array(abilitySchema),
    skills: z.partialRecord(skillSchema, z.enum(['none', 'proficient', 'expertise'])),
    weaponTraining: z.array(z.string()), armorTraining: z.array(z.string()), toolIds: z.array(z.string()), languageIds: z.array(z.string()),
  }),
  proficiencyOverrides: z.object({
    skills: z.partialRecord(skillSchema, z.object({ value: z.enum(['none', 'proficient', 'expertise']), reason: z.string().min(1).optional() })),
    savingThrows: z.partialRecord(abilitySchema, z.object({ value: z.enum(['none', 'proficient']), reason: z.string().min(1).optional() })),
  }).optional(),
  knownSpellIds: z.array(z.string()),
  preparedSpellIds: z.array(z.string()),
  spellSelections: z.array(z.object({
    classEntryId: z.string().min(1), spellId: z.string().min(1), acquiredAtClassLevel: z.number().int().min(1), prepared: z.boolean(),
  })),
  preparedSpells: z.array(z.object({ classEntryId: z.string().min(1), spellId: z.string().min(1) })),
  grantedSpells: z.array(z.object({
    grantorId: z.string().min(1), spellId: z.string().min(1), acquiredAtCharacterLevel: z.number().int().min(1),
    castingAbility: abilitySchema, preparation: z.enum(['always-prepared', 'available']), replacementHistory: z.array(z.string().min(1)),
  })).optional(),
  hitPointGains: z.array(z.object({
    classEntryId: z.string().min(1), classLevel: z.number().int().min(1), method: z.enum(['fixed', 'rolled', 'custom']), hitPoints: z.number().int().min(0),
  })),
  currencyGp: z.number().int().min(0),
  currency: z.object({ cp: z.number().int().min(0), sp: z.number().int().min(0), ep: z.number().int().min(0), gp: z.number().int().min(0), pp: z.number().int().min(0) }).optional(),
  inventory: z.array(z.object({ itemId: z.string().min(1), quantity: z.number().int().min(0) })),
  manualOverrides: z.partialRecord(manualOverrideTargetSchema, z.object({ value: z.number(), reason: z.string().min(1).optional() })),
});

export const characterSchema = characterFieldsSchema.extend({ schemaVersion: z.literal(1) });
// Backup versions through v5 predate explicit non-skill proficiency fields.
// Keep their parser separate so migration remains readable and lossless.
const preTrainingCharacterFieldsSchema = characterFieldsSchema.extend({
  proficiencies: characterFieldsSchema.shape.proficiencies.omit({ weaponTraining: true, armorTraining: true, toolIds: true, languageIds: true }),
});
export const characterPlayStateSchema = z.object({
  characterId: z.string().min(1),
  currentHp: z.number().min(0),
  temporaryHp: z.number().min(0),
  temporaryMaximumHpBonus: z.number().min(0),
  inspiration: z.boolean(),
  usedHitDice: z.record(z.string(), z.number().int().min(0)),
  usedResources: z.record(z.string(), z.number().int().min(0)),
  usedSpellSlots: z.record(z.string(), z.number().int().min(0)),
  deathSaveSuccesses: z.number().int().min(0).max(3),
  deathSaveFailures: z.number().int().min(0).max(3),
  conditions: z.array(z.string()),
});

export const characterExportSchema = z.object({
  format: z.literal('dnd-companion-character'),
  schemaVersion: z.literal(CHARACTER_EXPORT_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  character: characterSchema,
  playState: characterPlayStateSchema,
}).superRefine(({ character, playState }, context) => {
  if (character.id !== playState.characterId) {
    context.addIssue({ code: 'custom', path: ['playState', 'characterId'], message: 'Play state must belong to the exported character.' });
  }
});

export type CharacterExport = z.infer<typeof characterExportSchema>;

function withDefaultTraining<T extends { proficiencies: { savingThrowAbilities: readonly string[]; skills: Record<string, unknown> } }>(character: T) {
  return {
    ...character,
    proficiencies: { ...character.proficiencies, weaponTraining: [], armorTraining: [], toolIds: [], languageIds: [] },
  };
}

const versionFourCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(4), exportedAt: z.string().datetime(),
  character: preTrainingCharacterFieldsSchema.omit({ currencyGp: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionFiveCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(5), exportedAt: z.string().datetime(),
  character: preTrainingCharacterFieldsSchema.extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionSixCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(6), exportedAt: z.string().datetime(),
  character: characterSchema,
  playState: characterPlayStateSchema,
});

const versionSevenCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(7), exportedAt: z.string().datetime(),
  character: characterSchema,
  playState: characterPlayStateSchema,
});

const versionTwoCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'),
  schemaVersion: z.literal(2),
  exportedAt: z.string().datetime(),
  character: preTrainingCharacterFieldsSchema.omit({ spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionThreeCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(3), exportedAt: z.string().datetime(),
  character: preTrainingCharacterFieldsSchema.omit({ preparedSpells: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionOneCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(1), exportedAt: z.string().datetime(),
  character: preTrainingCharacterFieldsSchema.omit({ longRestHitDiceRecovery: true, spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema.omit({ usedHitDice: true }),
});

const legacyCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character').optional(),
  schemaVersion: z.literal(0).optional(),
  exportedAt: z.string().optional(),
  character: preTrainingCharacterFieldsSchema.omit({ longRestHitDiceRecovery: true, spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(0).optional() }),
  playState: characterPlayStateSchema.omit({ temporaryMaximumHpBonus: true, usedHitDice: true }),
});

/**
 * Converts supported older file formats to the current format, then validates
 * the result. Keeping this pure makes each migration easy to test.
 */
export function migrateCharacterExport(input: unknown): CharacterExport {
  const current = characterExportSchema.safeParse(input);
  if (current.success) return migrateDevelopmentReferences(current.data);

  const versionTwo = versionTwoCharacterExportSchema.safeParse(input);
  const versionThree = versionThreeCharacterExportSchema.safeParse(input);
  const versionFour = versionFourCharacterExportSchema.safeParse(input);
  const versionFive = versionFiveCharacterExportSchema.safeParse(input);
  const versionSix = versionSixCharacterExportSchema.safeParse(input);
  const versionSeven = versionSevenCharacterExportSchema.safeParse(input);
  if (versionSeven.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionSeven.data, schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...versionSeven.data.character, generatedAbilityScores: versionSeven.data.character.generatedAbilityScores ?? versionSeven.data.character.abilityScores },
  }));
  if (versionSix.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionSix.data, schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...versionSix.data.character, sourceChoices: versionSix.data.character.sourceChoices ?? [], grantedSpells: versionSix.data.character.grantedSpells ?? [] },
  }));
  if (versionFive.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionFive.data, schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...versionFive.data.character, proficiencies: { ...versionFive.data.character.proficiencies, weaponTraining: [], armorTraining: [], toolIds: [], languageIds: [] } },
  }));
  if (versionFour.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionFour.data,
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...withDefaultTraining(versionFour.data.character), currencyGp: 0 },
  }));
  if (versionThree.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionThree.data,
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...withDefaultTraining(versionThree.data.character), preparedSpells: legacyPreparedSpells(versionThree.data.character) },
  }));

  if (versionTwo.success) return characterExportSchema.parse({
    ...versionTwo.data,
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...withDefaultTraining(versionTwo.data.character), currencyGp: 0, ...legacyAdvancementFields(versionTwo.data.character) },
  });

  const versionOne = versionOneCharacterExportSchema.safeParse(input);
  if (versionOne.success) {
    return migrateDevelopmentReferences(characterExportSchema.parse({
      ...versionOne.data,
      schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
      character: { ...withDefaultTraining(versionOne.data.character), longRestHitDiceRecovery: '2024-all', currencyGp: 0, ...legacyAdvancementFields(versionOne.data.character) },
      playState: { ...versionOne.data.playState, usedHitDice: {} },
    }));
  }

  const legacy = legacyCharacterExportSchema.safeParse(input);
  if (legacy.success) {
    return migrateDevelopmentReferences(characterExportSchema.parse({
      format: 'dnd-companion-character',
      schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
      exportedAt: legacy.data.exportedAt ?? new Date(0).toISOString(),
      character: { ...withDefaultTraining(legacy.data.character), schemaVersion: 1, longRestHitDiceRecovery: '2024-all', currencyGp: 0, ...legacyAdvancementFields(legacy.data.character) },
      playState: { ...legacy.data.playState, temporaryMaximumHpBonus: 0, usedHitDice: {} },
    }));
  }

  throw new Error(`This character backup is not supported: ${current.error.issues[0]?.message ?? 'unknown format'}`);
}

function legacyAdvancementFields(character: { classes: readonly { id: string; classId: string; level: number }[]; knownSpellIds: readonly string[]; preparedSpellIds: readonly string[] }) {
  const spellOwner = character.classes.find((entry) => entry.classId.endsWith(':class:wizard')) ?? character.classes[0];
  if (!spellOwner && character.knownSpellIds.length > 0) throw new Error('This legacy backup has spells but no class entry to own them.');
  return {
    spellSelections: spellOwner ? character.knownSpellIds.map((spellId) => ({ classEntryId: spellOwner.id, spellId, acquiredAtClassLevel: 1, prepared: character.preparedSpellIds.includes(spellId) })) : [],
    // Historical files do not say how prior HP was chosen. Keep this empty so
    // the sheet retains its legacy derived total; only future levels record a choice.
    hitPointGains: [],
    preparedSpells: spellOwner ? character.preparedSpellIds.map((spellId) => ({ classEntryId: spellOwner.id, spellId })) : [],
  };
}

function legacyPreparedSpells(character: { classes: readonly { id: string; classId: string }[]; preparedSpellIds: readonly string[]; spellSelections: readonly { classEntryId: string; spellId: string; prepared: boolean }[] }) {
  const selected = character.spellSelections.filter((selection) => selection.prepared).map(({ classEntryId, spellId }) => ({ classEntryId, spellId }));
  const owner = character.classes.filter((entry) => entry.classId.endsWith(':class:wizard'));
  const legacy = owner.length === 1 ? character.preparedSpellIds.map((spellId) => ({ classEntryId: owner[0]!.id, spellId })) : [];
  return [...new Map([...selected, ...legacy].map((entry) => [`${entry.classEntryId}:${entry.spellId}`, entry])).values()];
}

export function createCharacterExport(character: Character, playState: CharacterPlayState): CharacterExport {
    return migrateDevelopmentReferences(characterExportSchema.parse({
    format: 'dnd-companion-character',
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    character,
    playState,
    }));
}

function migrateDevelopmentReferences(backup: CharacterExport): CharacterExport {
  const migrated = migrateDevelopmentContentIds(backup.character, backup.playState);
  return characterExportSchema.parse({
    ...backup,
    ...migrated,
    character: {
      ...migrated.character,
      generatedAbilityScores: migrated.character.generatedAbilityScores ?? migrated.character.abilityScores,
    },
  });
}
