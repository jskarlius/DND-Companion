import { contentFixtureSchema } from './schemas';
import type { ContentFixture } from './types';

const srdSource = {
  title: 'System Reference Document 5.2.1',
  license: 'CC BY 4.0',
  url: 'https://www.dndbeyond.com/srd',
} as const;

/**
 * A deliberately small, hand-verified data set for exercising progression.
 * It is not intended to be a complete class or spell implementation.
 */
export const minimalContentFixture: ContentFixture = {
  manifest: {
    schemaVersion: 1,
    id: 'srd-2024',
    name: 'SRD 5.2.1 bootstrap fixture',
    version: 'fixture',
    ruleset: '5e-2024',
    distribution: 'public',
    source: srdSource,
  },
  features: [
    {
      id: 'srd-2024:feature:wizard-spellcasting',
      name: 'Spellcasting',
      kind: 'feature',
      ruleset: '5e-2024',
      source: srdSource,
      automation: 'reference',
    },
    {
      id: 'srd-2024:feature:wizard-arcane-recovery',
      name: 'Arcane Recovery',
      kind: 'feature',
      ruleset: '5e-2024',
      source: srdSource,
      automation: 'tracked',
      resourceId: 'srd-2024:resource:wizard-arcane-recovery',
    },
    {
      id: 'srd-2024:feature:fighter-fighting-style',
      name: 'Fighting Style',
      kind: 'feature',
      ruleset: '5e-2024',
      source: srdSource,
      automation: 'reference',
    },
    {
      id: 'srd-2024:feature:fighter-second-wind',
      name: 'Second Wind',
      kind: 'feature',
      ruleset: '5e-2024',
      source: srdSource,
      automation: 'tracked',
      resourceId: 'srd-2024:resource:fighter-second-wind',
    },
  ],
  choices: [
    {
      id: 'srd-2024:choice:fighter-fighting-style',
      name: 'Fighting Style',
      kind: 'choice',
      ruleset: '5e-2024',
      source: srdSource,
      options: [
        { id: 'archery', name: 'Archery' },
        { id: 'defense', name: 'Defense' },
        { id: 'dueling', name: 'Dueling' },
        { id: 'great-weapon-fighting', name: 'Great Weapon Fighting' },
        { id: 'protection', name: 'Protection' },
        { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting' },
      ],
    },
  ],
  resources: [
    {
      id: 'srd-2024:resource:wizard-arcane-recovery',
      name: 'Arcane Recovery uses',
      kind: 'resource',
      ruleset: '5e-2024',
      source: srdSource,
      maximum: 1,
      recharge: 'long-rest',
    },
    {
      id: 'srd-2024:resource:fighter-second-wind',
      name: 'Second Wind uses',
      kind: 'resource',
      ruleset: '5e-2024',
      source: srdSource,
      maximum: 1,
      recharge: 'short-rest',
    },
  ],
  spells: [
    {
      id: 'srd-2024:spell:fire-bolt',
      name: 'Fire Bolt',
      kind: 'spell',
      ruleset: '5e-2024',
      source: srdSource,
      level: 0,
      castingTime: 'Action',
      range: '120 feet',
      duration: 'Instantaneous',
      components: { verbal: true, somatic: true },
      scalingBasis: 'character-level',
    },
    {
      id: 'srd-2024:spell:magic-missile',
      name: 'Magic Missile',
      kind: 'spell',
      ruleset: '5e-2024',
      source: srdSource,
      level: 1,
      castingTime: 'Action',
      range: '120 feet',
      duration: 'Instantaneous',
      components: { verbal: true, somatic: true },
    },
  ],
  feats: [
    {
      id: 'srd-2024:feat:ability-score-improvement',
      name: 'Ability Score Improvement',
      kind: 'feat',
      ruleset: '5e-2024',
      source: srdSource,
      category: 'General',
      prerequisite: 'Level 4+',
      benefits: ['Increase one ability score by 2, or increase two ability scores by 1.'],
      automation: 'reference',
    },
  ],
  classes: [
    {
      id: 'srd-2024:class:wizard',
      name: 'Wizard',
      kind: 'class',
      ruleset: '5e-2024',
      source: srdSource,
      hitDie: 6,
      savingThrowAbilities: ['intelligence', 'wisdom'],
      spellListIds: ['srd-2024:spell:fire-bolt', 'srd-2024:spell:magic-missile'],
      multiclassing: { prerequisiteGroups: [{ intelligence: 13 }], initialGrants: [] },
      spellcasting: {
        ability: 'intelligence', slotKind: 'spell-slots', slotRecharge: 'long-rest',
        selectionMode: 'known-and-prepared', multiclassContribution: 'full',
        progression: [
          { level: 1, cantripsKnown: 3, preparedSpells: 4, slots: { 1: 2 } },
          { level: 2, cantripsKnown: 3, preparedSpells: 5, slots: { 1: 3 } },
          { level: 3, cantripsKnown: 3, preparedSpells: 6, slots: { 1: 4, 2: 2 } },
          { level: 4, cantripsKnown: 4, preparedSpells: 7, slots: { 1: 4, 2: 3 } },
          { level: 5, cantripsKnown: 4, preparedSpells: 9, slots: { 1: 4, 2: 3, 3: 2 } },
        ],
      },
      advancement: [
        { level: 1, grants: [{ type: 'feature', featureId: 'srd-2024:feature:wizard-spellcasting' }] },
        { level: 2, grants: [{ type: 'feature', featureId: 'srd-2024:feature:wizard-arcane-recovery' }] },
        { level: 4, grants: [{ type: 'ability-score-improvement' }] },
      ],
    },
    {
      id: 'srd-2024:class:fighter',
      name: 'Fighter',
      kind: 'class',
      ruleset: '5e-2024',
      source: srdSource,
      hitDie: 10,
      savingThrowAbilities: ['strength', 'constitution'],
      spellListIds: [],
      multiclassing: { prerequisiteGroups: [{ strength: 13 }, { dexterity: 13 }], initialGrants: [] },
      advancement: [
        { level: 1, grants: [{ type: 'feature', featureId: 'srd-2024:feature:fighter-fighting-style' }, { type: 'choice', choiceId: 'srd-2024:choice:fighter-fighting-style' }] },
        {
          level: 2,
          grants: [
            { type: 'feature', featureId: 'srd-2024:feature:fighter-second-wind' },
            { type: 'resource', resourceId: 'srd-2024:resource:fighter-second-wind', amount: 1 },
          ],
        },
        { level: 4, grants: [{ type: 'ability-score-improvement' }] },
      ],
    },
  ],
  subclasses: [],
  items: [],
};

export function validateContentFixture(fixture: ContentFixture): void {
  contentFixtureSchema.parse(fixture);

  const entities = [
    ...fixture.classes,
    ...fixture.subclasses,
    ...fixture.features,
    ...fixture.resources,
    ...fixture.spells,
    ...fixture.feats,
    ...fixture.items,
  ];
  const ids = new Set<string>();

  for (const entity of entities) {
    if (ids.has(entity.id)) {
      throw new Error(`Duplicate content ID: ${entity.id}`);
    }
    ids.add(entity.id);
  }

  for (const feature of fixture.features) {
    if (feature.resourceId && !ids.has(feature.resourceId)) {
      throw new Error(`Feature ${feature.id} references missing resource ${feature.resourceId}`);
    }
  }

  for (const subclass of fixture.subclasses) {
    if (!ids.has(subclass.classId)) {
      throw new Error(`Subclass ${subclass.id} references missing class ${subclass.classId}`);
    }
  }

  for (const characterClass of [...fixture.classes, ...fixture.subclasses]) {
    for (const grant of characterClass.advancement.flatMap((level) => level.grants)) {
      const referenceId =
        grant.type === 'feature'
          ? grant.featureId
          : grant.type === 'resource'
            ? grant.resourceId
            : undefined;
      if (referenceId && !ids.has(referenceId)) {
        throw new Error(`${characterClass.id} references missing content ${referenceId}`);
      }
    }
  }

  for (const characterClass of fixture.classes) {
    for (const spellId of characterClass.spellListIds) {
      if (!fixture.spells.some((spell) => spell.id === spellId)) {
        throw new Error(`${characterClass.id} references missing spell ${spellId}`);
      }
    }
    for (const equipmentPackage of characterClass.startingEquipmentPackages ?? []) {
      for (const entry of equipmentPackage.entries) {
        if (entry.type === 'item' && !fixture.items.some((item) => item.id === entry.itemId)) {
          throw new Error(`${characterClass.id} references missing starting item ${entry.itemId}`);
        }
      }
    }
  }
}
