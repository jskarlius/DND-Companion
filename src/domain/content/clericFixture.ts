import type { Class, Spell } from './types';

const source = {
  title: 'System Reference Document 5.2.1',
  license: 'CC BY 4.0',
  url: 'https://www.dndbeyond.com/srd',
  attribution: 'This work includes material from the System Reference Document 5.2.1 by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd, licensed under CC BY 4.0.',
} as const;

/**
 * A small public Cleric slice. It exercises "prepare from the class list" and
 * full-caster multiclass slots; a complete Cleric pack belongs to Slice 8.
 */
export const clericBootstrapSpells: readonly Spell[] = [
  { id: 'srd-2024:spell:guidance', name: 'Guidance', kind: 'spell', ruleset: '5e-2024', source, level: 0, castingTime: 'Action', range: 'Touch', duration: 'Concentration, up to 1 minute', components: { verbal: true, somatic: true }, concentration: true, scalingBasis: 'ability-modifier' },
  { id: 'srd-2024:spell:sacred-flame', name: 'Sacred Flame', kind: 'spell', ruleset: '5e-2024', source, level: 0, castingTime: 'Action', range: '60 feet', duration: 'Instantaneous', components: { verbal: true, somatic: true }, scalingBasis: 'character-level' },
  { id: 'srd-2024:spell:bless', name: 'Bless', kind: 'spell', ruleset: '5e-2024', source, level: 1, castingTime: 'Action', range: '30 feet', duration: 'Concentration, up to 1 minute', components: { verbal: true, somatic: true, material: 'a holy symbol' }, concentration: true },
  { id: 'srd-2024:spell:cure-wounds', name: 'Cure Wounds', kind: 'spell', ruleset: '5e-2024', source, level: 1, castingTime: 'Action', range: 'Touch', duration: 'Instantaneous', components: { verbal: true, somatic: true } },
  { id: 'srd-2024:spell:guiding-bolt', name: 'Guiding Bolt', kind: 'spell', ruleset: '5e-2024', source, level: 1, castingTime: 'Action', range: '120 feet', duration: '1 round', components: { verbal: true, somatic: true } },
  { id: 'srd-2024:spell:lesser-restoration', name: 'Lesser Restoration', kind: 'spell', ruleset: '5e-2024', source, level: 2, castingTime: 'Action', range: 'Touch', duration: 'Instantaneous', components: { verbal: true, somatic: true } },
  { id: 'srd-2024:spell:prayer-of-healing', name: 'Prayer of Healing', kind: 'spell', ruleset: '5e-2024', source, level: 2, castingTime: '10 minutes', range: '30 feet', duration: 'Instantaneous', components: { verbal: true } },
  { id: 'srd-2024:spell:spiritual-weapon', name: 'Spiritual Weapon', kind: 'spell', ruleset: '5e-2024', source, level: 2, castingTime: 'Bonus Action', range: '60 feet', duration: '1 minute', components: { verbal: true, somatic: true }, concentration: false },
] as const;

export const clericBootstrapClass: Class = {
  id: 'srd-2024:class:cleric',
  name: 'Cleric',
  kind: 'class',
  ruleset: '5e-2024',
  source,
  hitDie: 8,
  savingThrowAbilities: ['wisdom', 'charisma'],
  spellListIds: [...clericBootstrapSpells.map((spell) => spell.id), 'srd-2024:spell:light', 'srd-2024:spell:detect-magic'],
  multiclassing: { prerequisiteGroups: [{ wisdom: 13 }], initialGrants: [] },
  spellcasting: {
    ability: 'wisdom',
    slotKind: 'spell-slots',
    slotRecharge: 'long-rest',
    selectionMode: 'prepared-from-list',
    multiclassContribution: 'full',
    progression: [
      { level: 1, cantripsKnown: 3, preparedSpells: 4, slots: { 1: 2 } },
      { level: 2, cantripsKnown: 3, preparedSpells: 5, slots: { 1: 3 } },
      { level: 3, cantripsKnown: 3, preparedSpells: 6, slots: { 1: 4, 2: 2 } },
      { level: 4, cantripsKnown: 4, preparedSpells: 7, slots: { 1: 4, 2: 3 } },
      { level: 5, cantripsKnown: 4, preparedSpells: 9, slots: { 1: 4, 2: 3, 3: 2 } },
    ],
  },
  advancement: [
    { level: 1, grants: [] },
    { level: 2, grants: [] },
    { level: 3, grants: [] },
    { level: 4, grants: [{ type: 'ability-score-improvement' }] },
    { level: 5, grants: [] },
  ],
};
