import Dexie, { type EntityTable } from 'dexie';
import type { Character, CharacterPlayState } from '../domain/character/types';

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
  }
}

export const database = new CompanionDatabase();
