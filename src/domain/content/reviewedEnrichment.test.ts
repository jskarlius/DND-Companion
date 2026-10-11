import { describe, expect, it } from 'vitest';

import { bundledContentFixture } from './bundledContent';

describe('reviewed level-one class profiles', () => {
  it('covers every bundled SRD class with creation requirements', () => {
    const expected = ['barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk', 'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard'];
    expect(bundledContentFixture.classes.map((entry) => entry.id.split(':').at(-1)).sort()).toEqual(expected);
    for (const characterClass of bundledContentFixture.classes) {
      expect(characterClass.levelOne, characterClass.name).toBeDefined();
      expect(characterClass.levelOne?.startingEquipmentOptionCount).toBeGreaterThanOrEqual(2);
      expect(characterClass.levelOne?.skillChoices.options.length).toBeGreaterThanOrEqual(characterClass.levelOne?.skillChoices.count ?? 0);
    }
  });

  it('retains distinct level-one spell ownership and preparation rules', () => {
    const byName = (name: string) => bundledContentFixture.classes.find((entry) => entry.name === name)?.levelOne?.spellcasting;
    expect(byName('Wizard')).toMatchObject({ cantrips: 3, spellbookSpells: 6, preparedSpells: 4, preparationChange: 'long-rest' });
    expect(byName('Bard')).toMatchObject({ cantrips: 2, selectedSpells: 4, preparationChange: 'on-class-level' });
    expect(byName('Cleric')).toMatchObject({ cantrips: 3, preparedSpells: 4, preparationChange: 'long-rest' });
    expect(byName('Paladin')).toMatchObject({ preparedSpells: 2, preparationChange: 'long-rest-one' });
    expect(byName('Warlock')).toMatchObject({ cantrips: 2, selectedSpells: 2, preparationChange: 'on-class-level' });
  });

  it('records the class-specific creation choices that cannot be inferred from raw pack prose', () => {
    const profileFor = (name: string) => bundledContentFixture.classes.find((entry) => entry.name === name)?.levelOne;
    expect(profileFor('Fighter')?.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'fighting-style', count: 1 }),
      expect.objectContaining({ id: 'weapon-mastery', count: 3 }),
    ]));
    expect(profileFor('Cleric')?.choices).toContainEqual(expect.objectContaining({ id: 'divine-order' }));
    expect(profileFor('Druid')?.choices).toContainEqual(expect.objectContaining({ id: 'primal-order' }));
    expect(profileFor('Rogue')?.choices).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'expertise', count: 2 }),
      expect.objectContaining({ id: 'weapon-mastery', count: 2 }),
    ]));
    expect(profileFor('Warlock')?.choices).toContainEqual(expect.objectContaining({ id: 'eldritch-invocation', count: 1 }));
  });

  it('exposes reviewed class equipment alternatives through the canonical contract', () => {
    const byName = (name: string) => bundledContentFixture.classes.find((entry) => entry.name === name)?.startingEquipmentPackages;
    expect(byName('Fighter')).toHaveLength(3);
    expect(byName('Wizard')?.[0]).toMatchObject({
      currencyGp: 5,
      entries: expect.arrayContaining([expect.objectContaining({ itemId: 'srd-2024:item:spellbook' })]),
    });
    expect(byName('Bard')?.[0]?.entries).toContainEqual({ type: 'chosen-item', choiceId: 'musical-instrument', quantity: 1 });
    expect(byName('Paladin')?.[0]?.entries).toContainEqual({ type: 'chosen-item', choiceId: 'holy-symbol', quantity: 1 });
  });
});
