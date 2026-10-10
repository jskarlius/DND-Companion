import type { Choice, Class, ContentFixture, Feature, Resource } from './types';

type SupportedClass = 'wizard' | 'fighter' | 'cleric';

/**
 * Hand-reviewed mechanics that Open5e currently exposes only as prose or
 * incomplete relationship data. This small table is intentionally limited to
 * the classes already supported by the character sheet and advancement flow.
 */
const multiclassPrerequisites: Record<SupportedClass, Class['multiclassing']> = {
  wizard: { prerequisiteGroups: [{ intelligence: 13 }], initialGrants: [] },
  fighter: { prerequisiteGroups: [{ strength: 13 }, { dexterity: 13 }], initialGrants: [] },
  cleric: { prerequisiteGroups: [{ wisdom: 13 }], initialGrants: [] },
};

function classKey(id: string): SupportedClass | undefined {
  const match = id.match(/^srd-2024:class:(wizard|fighter|cleric)$/);
  return match?.[1] as SupportedClass | undefined;
}

/** Applies reviewed structured facts without copying any source prose. */
export function applyReviewedEnrichment(fixture: ContentFixture): ContentFixture {
  const wizardSource = fixture.classes.find((entry) => entry.id === 'srd-2024:class:wizard')?.source;
  const fighterSource = fixture.classes.find((entry) => entry.id === 'srd-2024:class:fighter')?.source;
  if (!wizardSource || !fighterSource) throw new Error('Reviewed enrichment requires the canonical Wizard and Fighter classes.');

  const resources: Resource[] = [
    ...fixture.resources,
    { id: 'srd-2024:resource:wizard-arcane-recovery', name: 'Arcane Recovery uses', kind: 'resource', ruleset: '5e-2024', source: wizardSource, maximum: 1, recharge: 'long-rest' },
    { id: 'srd-2024:resource:fighter-second-wind', name: 'Second Wind uses', kind: 'resource', ruleset: '5e-2024', source: fighterSource, maximum: 1, recharge: 'short-rest' },
  ];
  const choices: Choice[] = [
    ...fixture.choices,
    {
      id: 'srd-2024:choice:fighter-fighting-style', name: 'Fighting Style', kind: 'choice', ruleset: '5e-2024', source: fighterSource,
      options: [
        { id: 'archery', name: 'Archery' }, { id: 'defense', name: 'Defense' }, { id: 'dueling', name: 'Dueling' },
        { id: 'great-weapon-fighting', name: 'Great Weapon Fighting' }, { id: 'protection', name: 'Protection' }, { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting' },
      ],
    },
  ];
  const features: Feature[] = fixture.features.map((feature) => feature.id === 'srd-2024:feature:wizard-arcane-recovery'
    ? { ...feature, automation: 'tracked', resourceId: 'srd-2024:resource:wizard-arcane-recovery' }
    : feature.id === 'srd-2024:feature:fighter-second-wind'
      ? { ...feature, automation: 'tracked', resourceId: 'srd-2024:resource:fighter-second-wind' }
      : feature);
  const classes: Class[] = fixture.classes.map((entry) => {
    const key = classKey(entry.id);
    if (!key) return entry;
    const spellcasting = entry.spellcasting && (key === 'wizard'
      ? { ...entry.spellcasting, selectionMode: 'known-and-prepared' as const, progression: entry.spellcasting.progression.map((level) => ({ ...level, spellsLearned: level.level === 1 ? 6 : 2 })) }
      : { ...entry.spellcasting, selectionMode: 'prepared-from-list' as const });
    const advancement = key === 'fighter'
      ? entry.advancement.map((level) => level.level === 1
        ? { ...level, grants: [...level.grants, { type: 'choice' as const, choiceId: 'srd-2024:choice:fighter-fighting-style' }] }
        : level)
      : entry.advancement;
    return { ...entry, multiclassing: multiclassPrerequisites[key], spellcasting, advancement };
  });
  return { ...fixture, classes, features, choices, resources };
}
