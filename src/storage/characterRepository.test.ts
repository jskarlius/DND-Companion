import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, test } from 'vitest';
import { representativeCharacter, representativePlayState } from '../features/character-sheet/characterSheetFixture';
import { migrateCharacterExport } from './characterBackup';
import { CharacterRepository } from './characterRepository';
import { CompanionDatabase } from './database';

const databases: CompanionDatabase[] = [];

function createRepository(): CharacterRepository {
  const db = new CompanionDatabase(`test-${crypto.randomUUID()}`);
  databases.push(db);
  return new CharacterRepository(db);
}

afterEach(async () => {
  await Promise.all(databases.splice(0).map(async (db) => { db.close(); await db.delete(); }));
});

describe('CharacterRepository', () => {
  test('persists character decisions and temporary play state independently', async () => {
    const repository = createRepository();
    await repository.save(representativeCharacter, representativePlayState);

    expect(await repository.loadCharacter(representativeCharacter.id)).toEqual(representativeCharacter);
    expect(await repository.loadPlayState(representativeCharacter.id)).toEqual(representativePlayState);
  });

  test('lists only the characters stored locally', async () => {
    const repository = createRepository();
    const secondCharacter = { ...representativeCharacter, id: 'test:character:second', name: 'Bren' };
    const secondPlayState = { ...representativePlayState, characterId: secondCharacter.id };
    await repository.save(representativeCharacter, representativePlayState);
    await repository.save(secondCharacter, secondPlayState);

    expect((await repository.listCharacters()).map((character) => character.id)).toEqual([
      representativeCharacter.id,
      secondCharacter.id,
    ]);
  });

  test('retains saved data after the database is reopened', async () => {
    const name = `reload-${crypto.randomUUID()}`;
    const firstDatabase = new CompanionDatabase(name);
    const firstRepository = new CharacterRepository(firstDatabase);
    await firstRepository.save(representativeCharacter, representativePlayState);
    firstDatabase.close();

    const reopenedDatabase = new CompanionDatabase(name);
    databases.push(reopenedDatabase);
    const reopenedRepository = new CharacterRepository(reopenedDatabase);
    expect(await reopenedRepository.loadCharacter(representativeCharacter.id)).toEqual(representativeCharacter);
    expect(await reopenedRepository.loadPlayState(representativeCharacter.id)).toEqual(representativePlayState);
  });

  test('exports, deletes, and imports a character without losing its play state', async () => {
    const repository = createRepository();
    const unrelatedCharacter = { ...representativeCharacter, id: 'test:character:unrelated', name: 'Unrelated' };
    const unrelatedPlayState = { ...representativePlayState, characterId: unrelatedCharacter.id };
    await repository.save(representativeCharacter, representativePlayState);
    await repository.save(unrelatedCharacter, unrelatedPlayState);
    const backup = await repository.exportCharacter(representativeCharacter.id);

    await repository.deleteCharacter(representativeCharacter.id);
    expect(await repository.loadCharacter(representativeCharacter.id)).toBeUndefined();
    expect(await repository.loadPlayState(representativeCharacter.id)).toBeUndefined();
    expect(await repository.loadCharacter(unrelatedCharacter.id)).toEqual(unrelatedCharacter);
    expect(await repository.loadPlayState(unrelatedCharacter.id)).toEqual(unrelatedPlayState);

    await repository.importCharacter(backup);
    expect(await repository.loadCharacter(representativeCharacter.id)).toEqual(representativeCharacter);
    expect(await repository.loadPlayState(representativeCharacter.id)).toEqual(representativePlayState);
  });
});

test('migrates a version 0 backup by adding missing play-state and rest-policy fields', () => {
  const backup = migrateCharacterExport({
    schemaVersion: 0,
    character: { ...representativeCharacter, schemaVersion: 0 },
    playState: (({ temporaryMaximumHpBonus: _removed, ...playState }) => playState)(representativePlayState),
  });

  expect(backup.schemaVersion).toBe(4);
  expect(backup.character.schemaVersion).toBe(1);
  expect(backup.playState.temporaryMaximumHpBonus).toBe(0);
  expect(backup.playState.usedHitDice).toEqual({});
  expect(backup.character.longRestHitDiceRecovery).toBe('2024-all');
  expect(backup.character.spellSelections).toHaveLength(2);
  expect(backup.character.hitPointGains).toEqual([]);
});

test('upgrades a version 1 database by adding the Aid maximum-HP field', async () => {
  const name = `legacy-${crypto.randomUUID()}`;
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(1).stores({
    characters: 'id, ruleset', playState: 'characterId', contentPacks: 'id', contentEntities: 'id, packId', settings: 'key',
  });
  await legacyDatabase.open();
  const { temporaryMaximumHpBonus: _removed, ...legacyPlayState } = representativePlayState;
  await legacyDatabase.table('playState').put(legacyPlayState);
  legacyDatabase.close();

  const upgradedDatabase = new CompanionDatabase(name);
  databases.push(upgradedDatabase);
  const repository = new CharacterRepository(upgradedDatabase);
  expect(await repository.loadPlayState(representativeCharacter.id)).toEqual(representativePlayState);
});

test('upgrades a version 3 database with class-owned spells and empty HP history', async () => {
  const name = `advancement-legacy-${crypto.randomUUID()}`;
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(3).stores({
    characters: 'id, ruleset', playState: 'characterId', contentPacks: 'id', contentEntities: 'id, packId', settings: 'key',
  });
  await legacyDatabase.open();
  const { spellSelections: _spellSelections, hitPointGains: _hitPointGains, ...legacyCharacter } = representativeCharacter;
  await legacyDatabase.table('characters').put(legacyCharacter);
  legacyDatabase.close();

  const upgradedDatabase = new CompanionDatabase(name);
  databases.push(upgradedDatabase);
  const upgraded = await new CharacterRepository(upgradedDatabase).loadCharacter(representativeCharacter.id);
  expect(upgraded?.spellSelections).toEqual(representativeCharacter.spellSelections);
  expect(upgraded?.hitPointGains).toEqual([]);
});

test('upgrades version 4 development references to the canonical SRD namespace', async () => {
  const name = `content-namespace-${crypto.randomUUID()}`;
  const legacyDatabase = new Dexie(name);
  legacyDatabase.version(4).stores({
    characters: 'id, ruleset', playState: 'characterId', contentPacks: 'id', contentEntities: 'id, packId', settings: 'key',
  });
  await legacyDatabase.open();
  const legacyCharacter = {
    ...representativeCharacter,
    enabledContentPackIds: ['srd-5.2.1'],
    classes: representativeCharacter.classes.map((entry) => ({ ...entry, classId: entry.classId.replace('srd-2024', 'srd-5.2.1') })),
    spellSelections: representativeCharacter.spellSelections.map((entry) => ({ ...entry, spellId: entry.spellId.replace('srd-2024', 'srd-5.2.1') })),
  };
  await legacyDatabase.table('characters').put(legacyCharacter);
  await legacyDatabase.table('playState').put({ ...representativePlayState, usedResources: { 'srd-5.2.1:resource:wizard-arcane-recovery': 1 } });
  legacyDatabase.close();

  const upgradedDatabase = new CompanionDatabase(name);
  databases.push(upgradedDatabase);
  const repository = new CharacterRepository(upgradedDatabase);
  const [character, playState] = await Promise.all([repository.loadCharacter(representativeCharacter.id), repository.loadPlayState(representativeCharacter.id)]);
  expect(character?.classes[0]?.classId).toBe('srd-2024:class:wizard');
  expect(character?.enabledContentPackIds).toEqual(['srd-2024']);
  expect(playState?.usedResources).toEqual({ 'srd-2024:resource:wizard-arcane-recovery': 1 });
});
