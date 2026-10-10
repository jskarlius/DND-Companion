import { expect, test } from 'vitest';
import { minimalContentFixture } from '../content/fixtures';
import { recoverHitDice, setCurrentHp, setResourceUses, setTemporaryMaximumHpBonus, takeRest } from './playState';
import type { CharacterPlayState } from './types';

const state: CharacterPlayState = {
  characterId: 'demo:character:test', currentHp: 3, temporaryHp: 4, temporaryMaximumHpBonus: 0, inspiration: true,
  usedHitDice: { wizard: 2, fighter: 2 },
  usedResources: { 'srd-2024:resource:wizard-arcane-recovery': 1, 'srd-2024:resource:fighter-second-wind': 1 },
  usedSpellSlots: { 1: 1 }, deathSaveSuccesses: 2, deathSaveFailures: 1, conditions: ['Poisoned'],
};
const [arcaneRecovery, secondWind] = minimalContentFixture.resources;

test('clamps editable HP and resource uses without mutating the prior play state', () => {
  expect(setCurrentHp(state, 100, 26)).toMatchObject({ currentHp: 26 });
  expect(setTemporaryMaximumHpBonus(state, -5).temporaryMaximumHpBonus).toBe(0);
  expect(setResourceUses(state, secondWind, -1).usedResources[secondWind.id]).toBe(0);
  expect(state.currentHp).toBe(3);
  expect(state.usedResources[secondWind.id]).toBe(1);
});

test('recovers all hit dice under 2024 rules and only the chosen half-total allocation under the 2014 table rule', () => {
  const groups = [{ classEntryId: 'wizard', maximum: 2 }, { classEntryId: 'fighter', maximum: 2 }] as const;
  expect(recoverHitDice(state, groups, '2024-all').usedHitDice).toEqual({ wizard: 0, fighter: 0 });
  expect(recoverHitDice(state, groups, '2014-half', { wizard: 1, fighter: 2 }).usedHitDice).toEqual({ wizard: 1, fighter: 1 });
});

test('short rests recover only short-rest resources', () => {
  const result = takeRest(state, minimalContentFixture.resources, 'short', 26);
  expect(result.usedResources[secondWind.id]).toBe(0);
  expect(result.usedResources[arcaneRecovery.id]).toBe(1);
  expect(result.currentHp).toBe(3);
});

test('long rests reset the tracked long-rest state but retain unmodelled conditions', () => {
  const result = takeRest(state, minimalContentFixture.resources, 'long', 26);
  expect(result).toMatchObject({ currentHp: 26, temporaryHp: 0, usedSpellSlots: {}, deathSaveSuccesses: 0, deathSaveFailures: 0 });
  expect(result.usedResources[arcaneRecovery.id]).toBe(0);
  expect(result.conditions).toEqual(['Poisoned']);
});
