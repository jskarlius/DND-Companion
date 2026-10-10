import { z } from 'zod';
import { ABILITIES, MANUAL_OVERRIDE_TARGETS, SKILLS, type Character, type CharacterPlayState } from '../domain/character/types';
import { migrateDevelopmentContentIds } from '../domain/content/contentIdMigration';

/** The format of a character file is independent from whichever local database we use. */
export const CHARACTER_EXPORT_SCHEMA_VERSION = 4;

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
  abilityScores: z.record(abilitySchema, z.number()),
  classes: z.array(z.object({
    id: z.string().min(1),
    classId: z.string().min(1),
    subclassId: z.string().min(1).optional(),
    level: z.number().int().min(1),
    choices: z.record(z.string(), choiceValueSchema),
  })),
  choices: z.record(z.string(), choiceValueSchema),
  proficiencies: z.object({
    savingThrowAbilities: z.array(abilitySchema),
    skills: z.partialRecord(skillSchema, z.enum(['none', 'proficient', 'expertise'])),
  }),
  knownSpellIds: z.array(z.string()),
  preparedSpellIds: z.array(z.string()),
  spellSelections: z.array(z.object({
    classEntryId: z.string().min(1), spellId: z.string().min(1), acquiredAtClassLevel: z.number().int().min(1), prepared: z.boolean(),
  })),
  preparedSpells: z.array(z.object({ classEntryId: z.string().min(1), spellId: z.string().min(1) })),
  hitPointGains: z.array(z.object({
    classEntryId: z.string().min(1), classLevel: z.number().int().min(1), method: z.enum(['fixed', 'rolled', 'custom']), hitPoints: z.number().int().min(0),
  })),
  inventory: z.array(z.object({ itemId: z.string().min(1), quantity: z.number().int().min(0) })),
  manualOverrides: z.partialRecord(manualOverrideTargetSchema, z.object({ value: z.number(), reason: z.string().min(1).optional() })),
});

export const characterSchema = characterFieldsSchema.extend({ schemaVersion: z.literal(1) });
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

const versionTwoCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'),
  schemaVersion: z.literal(2),
  exportedAt: z.string().datetime(),
  character: characterFieldsSchema.omit({ spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionThreeCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(3), exportedAt: z.string().datetime(),
  character: characterFieldsSchema.omit({ preparedSpells: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema,
});

const versionOneCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character'), schemaVersion: z.literal(1), exportedAt: z.string().datetime(),
  character: characterFieldsSchema.omit({ longRestHitDiceRecovery: true, spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(1) }),
  playState: characterPlayStateSchema.omit({ usedHitDice: true }),
});

const legacyCharacterExportSchema = z.object({
  format: z.literal('dnd-companion-character').optional(),
  schemaVersion: z.literal(0).optional(),
  exportedAt: z.string().optional(),
  character: characterFieldsSchema.omit({ longRestHitDiceRecovery: true, spellSelections: true, hitPointGains: true }).extend({ schemaVersion: z.literal(0).optional() }),
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
  if (versionThree.success) return migrateDevelopmentReferences(characterExportSchema.parse({
    ...versionThree.data,
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...versionThree.data.character, preparedSpells: legacyPreparedSpells(versionThree.data.character) },
  }));

  if (versionTwo.success) return characterExportSchema.parse({
    ...versionTwo.data,
    schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
    character: { ...versionTwo.data.character, ...legacyAdvancementFields(versionTwo.data.character) },
  });

  const versionOne = versionOneCharacterExportSchema.safeParse(input);
  if (versionOne.success) {
    return migrateDevelopmentReferences(characterExportSchema.parse({
      ...versionOne.data,
      schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
      character: { ...versionOne.data.character, longRestHitDiceRecovery: '2024-all', ...legacyAdvancementFields(versionOne.data.character) },
      playState: { ...versionOne.data.playState, usedHitDice: {} },
    }));
  }

  const legacy = legacyCharacterExportSchema.safeParse(input);
  if (legacy.success) {
    return migrateDevelopmentReferences(characterExportSchema.parse({
      format: 'dnd-companion-character',
      schemaVersion: CHARACTER_EXPORT_SCHEMA_VERSION,
      exportedAt: legacy.data.exportedAt ?? new Date(0).toISOString(),
      character: { ...legacy.data.character, schemaVersion: 1, longRestHitDiceRecovery: '2024-all', ...legacyAdvancementFields(legacy.data.character) },
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
  return characterExportSchema.parse({ ...backup, ...migrated });
}
