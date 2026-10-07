import type { Resource } from '../content/types';
import type { CharacterPlayState } from './types';

export type RestType = 'short' | 'long';

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

export function takeRest(playState: CharacterPlayState, resources: readonly Resource[], restType: RestType, maximumHp: number): CharacterPlayState {
  const usedResources = { ...playState.usedResources };
  for (const resource of resources) {
    const recoversOnRest = restType === 'short'
      ? resource.recharge === 'short-rest'
      : resource.recharge === 'short-rest' || resource.recharge === 'long-rest';
    if (recoversOnRest) usedResources[resource.id] = 0;
  }
  if (restType === 'short') return { ...playState, usedResources };
  return { ...playState, currentHp: maximumHp, temporaryHp: 0, usedResources, usedSpellSlots: {}, deathSaveSuccesses: 0, deathSaveFailures: 0 };
}
