import type { Resource } from '../content/types';
import type { CharacterPlayState, LongRestHitDiceRecovery } from './types';

export type RestType = 'short' | 'long';
export interface HitDiceGroup { readonly classEntryId: string; readonly maximum: number; }

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function setCurrentHp(playState: CharacterPlayState, value: number, maximumHp: number): CharacterPlayState {
  return { ...playState, currentHp: clamp(value, 0, maximumHp) };
}

export function setTemporaryHp(playState: CharacterPlayState, value: number): CharacterPlayState {
  return { ...playState, temporaryHp: Math.max(value, 0) };
}

export function setTemporaryMaximumHpBonus(playState: CharacterPlayState, value: number): CharacterPlayState {
  return { ...playState, temporaryMaximumHpBonus: Math.max(value, 0) };
}

export function setResourceUses(playState: CharacterPlayState, resource: Resource, used: number): CharacterPlayState {
  return { ...playState, usedResources: { ...playState.usedResources, [resource.id]: clamp(used, 0, resource.maximum) } };
}

export function setSpellSlotUses(playState: CharacterPlayState, level: number, used: number, maximum: number): CharacterPlayState {
  return { ...playState, usedSpellSlots: { ...playState.usedSpellSlots, [level]: clamp(used, 0, maximum) } };
}

export function setHitDiceUses(playState: CharacterPlayState, classEntryId: string, used: number, maximum: number): CharacterPlayState {
  return { ...playState, usedHitDice: { ...playState.usedHitDice, [classEntryId]: clamp(used, 0, maximum) } };
}

export function hitDiceRecoveryLimit(groups: readonly HitDiceGroup[], recovery: LongRestHitDiceRecovery): number {
  if (recovery === '2024-all') return groups.reduce((total, group) => total + group.maximum, 0);
  return Math.max(1, Math.floor(groups.reduce((total, group) => total + group.maximum, 0) / 2));
}

export function recoverHitDice(playState: CharacterPlayState, groups: readonly HitDiceGroup[], recovery: LongRestHitDiceRecovery, requested: Readonly<Record<string, number>> = {}): CharacterPlayState {
  if (recovery === '2024-all') return { ...playState, usedHitDice: Object.fromEntries(groups.map((group) => [group.classEntryId, 0])) };
  let remaining = hitDiceRecoveryLimit(groups, recovery);
  const usedHitDice = { ...playState.usedHitDice };
  for (const group of groups) {
    const used = clamp(usedHitDice[group.classEntryId] ?? 0, 0, group.maximum);
    const restored = clamp(requested[group.classEntryId] ?? 0, 0, Math.min(used, remaining));
    usedHitDice[group.classEntryId] = used - restored;
    remaining -= restored;
  }
  return { ...playState, usedHitDice };
}

export function takeRest(playState: CharacterPlayState, resources: readonly Resource[], restType: RestType, maximumHp: number, hitDiceGroups: readonly HitDiceGroup[] = [], hitDiceRecovery: LongRestHitDiceRecovery = '2024-all', requestedHitDiceRecovery: Readonly<Record<string, number>> = {}): CharacterPlayState {
  const usedResources = { ...playState.usedResources };
  for (const resource of resources) {
    const recoversOnRest = restType === 'short'
      ? resource.recharge === 'short-rest'
      : resource.recharge === 'short-rest' || resource.recharge === 'long-rest';
    if (recoversOnRest) usedResources[resource.id] = 0;
  }
  if (restType === 'short') return { ...playState, usedResources };
  const restedState = { ...playState, currentHp: maximumHp, temporaryHp: 0, usedResources, usedSpellSlots: {}, deathSaveSuccesses: 0, deathSaveFailures: 0 };
  return recoverHitDice(restedState, hitDiceGroups, hitDiceRecovery, requestedHitDiceRecovery);
}
