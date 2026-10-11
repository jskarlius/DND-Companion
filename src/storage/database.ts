import Dexie, { type EntityTable } from 'dexie';
import type { Character, CharacterPlayState } from '../domain/character/types';
import { migrateDevelopmentContentIds } from '../domain/content/contentIdMigration';

export interface StoredContentPack {
  readonly id: string;
  readonly manifest: unknown;
}

export interface StoredContentEntity {
  readonly id: string;
  readonly packId: string;
  readonly entity: unknown;
}

export interface StoredSetting {
  readonly key: string;
  readonly value: unknown;
}

/** One local IndexedDB database. Its schema number changes only with a migration. */
export class CompanionDatabase extends Dexie {
  readonly characters!: EntityTable<Character, 'id'>;
  readonly playState!: EntityTable<CharacterPlayState, 'characterId'>;
  readonly contentPacks!: EntityTable<StoredContentPack, 'id'>;
  readonly contentEntities!: EntityTable<StoredContentEntity, 'id'>;
  readonly settings!: EntityTable<StoredSetting, 'key'>;

  constructor(name = 'dnd-companion') {
    super(name);
    this.version(1).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    });
    this.version(2).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      await transaction.table('playState').toCollection().modify((playState: { temporaryMaximumHpBonus?: number }) => {
        if (playState.temporaryMaximumHpBonus === undefined) playState.temporaryMaximumHpBonus = 0;
      });
    });
    this.version(3).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      await transaction.table('characters').toCollection().modify((character: { longRestHitDiceRecovery?: string }) => {
        if (character.longRestHitDiceRecovery === undefined) character.longRestHitDiceRecovery = '2024-all';
      });
      await transaction.table('playState').toCollection().modify((playState: { usedHitDice?: Record<string, number> }) => {
        if (playState.usedHitDice === undefined) playState.usedHitDice = {};
      });
    });
    this.version(4).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      await transaction.table('characters').toCollection().modify((character: {
        classes?: { id: string; classId: string }[];
        knownSpellIds?: string[];
        preparedSpellIds?: string[];
        spellSelections?: unknown[];
        hitPointGains?: unknown[];
      }) => {
        if (character.spellSelections === undefined) {
          const owner = character.classes?.find((entry) => entry.classId.endsWith(':class:wizard')) ?? character.classes?.[0];
          character.spellSelections = owner
            ? (character.knownSpellIds ?? []).map((spellId) => ({ classEntryId: owner.id, spellId, acquiredAtClassLevel: 1, prepared: character.preparedSpellIds?.includes(spellId) ?? false }))
            : [];
        }
        if (character.hitPointGains === undefined) character.hitPointGains = [];
      });
    });
    this.version(5).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      const characters = transaction.table('characters');
      const playState = transaction.table('playState');
      const [storedCharacters, storedPlayState] = await Promise.all([
        characters.toArray() as Promise<Character[]>,
        playState.toArray() as Promise<CharacterPlayState[]>,
      ]);
      const stateByCharacterId = new Map(storedPlayState.map((state) => [state.characterId, state]));
      for (const character of storedCharacters) {
        const state = stateByCharacterId.get(character.id);
        if (!state) continue;
        const migrated = migrateDevelopmentContentIds(character, state);
        await characters.put(migrated.character);
        await playState.put(migrated.playState);
      }
    });
    this.version(6).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      await transaction.table('characters').toCollection().modify((character: {
        classes?: { id: string; classId: string }[];
        preparedSpells?: unknown[];
        preparedSpellIds?: string[];
        spellSelections?: { classEntryId: string; spellId: string; prepared?: boolean }[];
      }) => {
        if (character.preparedSpells !== undefined) return;
        const selected = (character.spellSelections ?? []).filter((selection) => selection.prepared)
          .map(({ classEntryId, spellId }) => ({ classEntryId, spellId }));
        const owner = character.classes?.filter((entry) => entry.classId.endsWith(':class:wizard'));
        const legacy = owner?.length === 1
          ? (character.preparedSpellIds ?? []).map((spellId) => ({ classEntryId: owner[0]!.id, spellId }))
          : [];
        character.preparedSpells = [...new Map([...selected, ...legacy].map((entry) => [`${entry.classEntryId}:${entry.spellId}`, entry])).values()];
      });
    });
    this.version(7).stores({
      characters: 'id, ruleset',
      playState: 'characterId',
      contentPacks: 'id',
      contentEntities: 'id, packId',
      settings: 'key',
    }).upgrade(async (transaction) => {
      // Older characters predate structured starting equipment. Treat their
      // unrecorded currency as zero instead of guessing from a class fixture.
      await transaction.table('characters').toCollection().modify((character: { currencyGp?: number }) => {
        if (character.currencyGp === undefined) character.currencyGp = 0;
      });
    });
    this.version(8).stores({
      characters: 'id, ruleset', playState: 'characterId', contentPacks: 'id', contentEntities: 'id, packId', settings: 'key',
    }).upgrade(async (transaction) => {
      // These fields describe grants, not derived values. Legacy characters
      // retain their existing skills and receive empty explicit collections.
      await transaction.table('characters').toCollection().modify((character: { proficiencies?: Record<string, unknown> }) => {
        character.proficiencies ??= {};
        for (const key of ['weaponTraining', 'armorTraining', 'toolIds', 'languageIds']) {
          if (!Array.isArray(character.proficiencies[key])) character.proficiencies[key] = [];
        }
      });
    });
    this.version(9).stores({
      characters: 'id, ruleset', playState: 'characterId', contentPacks: 'id', contentEntities: 'id, packId', settings: 'key',
    }).upgrade(async (transaction) => {
      await transaction.table('characters').toCollection().modify((character: {
        currencyGp?: number;
        currency?: unknown;
        proficiencyOverrides?: unknown;
      }) => {
        // Legacy characters stored only gold pieces. Preserve that exact amount
        // in the new purse instead of inferring exchanges or deleting the value.
        if (character.currency === undefined) {
          character.currency = { cp: 0, sp: 0, ep: 0, gp: character.currencyGp ?? 0, pp: 0 };
        }
        // Overrides are an overlay on source grants, so migrated characters
        // start empty and retain their existing calculated proficiencies.
        if (character.proficiencyOverrides === undefined) {
          character.proficiencyOverrides = { skills: {}, savingThrows: {} };
        }
      });
    });
  }
}

export const database = new CompanionDatabase();
