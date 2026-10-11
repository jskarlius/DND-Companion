import type { Choice, Class, ContentFixture, Feature, LevelOneCreationProfile, Resource } from './types';

type SupportedClass =
  | 'barbarian' | 'bard' | 'cleric' | 'druid' | 'fighter' | 'monk'
  | 'paladin' | 'ranger' | 'rogue' | 'sorcerer' | 'warlock' | 'wizard';

const allSkills = ['acrobatics', 'animalHandling', 'arcana', 'athletics', 'deception', 'history', 'insight', 'intimidation', 'investigation', 'medicine', 'nature', 'perception', 'performance', 'persuasion', 'religion', 'sleightOfHand', 'stealth', 'survival'] as const;
// These are reviewed SRD item IDs. Keeping the list here makes tool selection
// a stable content reference rather than a UI filter based on an item name.
const musicalInstrumentIds = ['srd-2024:item:musical-instrument-bagpipes', 'srd-2024:item:musical-instrument-drum', 'srd-2024:item:musical-instrument-dulcimer', 'srd-2024:item:musical-instrument-flute', 'srd-2024:item:musical-instrument-horn', 'srd-2024:item:musical-instrument-lute', 'srd-2024:item:musical-instrument-lyre', 'srd-2024:item:musical-instrument-pan-flute', 'srd-2024:item:musical-instrument-shawm', 'srd-2024:item:musical-instrument-viol'] as const;
const artisanToolIds = ['srd-2024:item:alchemists-supplies', 'srd-2024:item:brewers-supplies', 'srd-2024:item:calligraphers-supplies', 'srd-2024:item:carpenters-tools', 'srd-2024:item:cartographers-tools', 'srd-2024:item:cobblers-tools', 'srd-2024:item:cooks-utensils', 'srd-2024:item:glassblowers-tools', 'srd-2024:item:jewelers-tools', 'srd-2024:item:leatherworkers-tools', 'srd-2024:item:masons-tools', 'srd-2024:item:painters-supplies', 'srd-2024:item:potters-tools', 'srd-2024:item:smiths-tools', 'srd-2024:item:tinkers-tools', 'srd-2024:item:weavers-tools', 'srd-2024:item:woodcarvers-tools'] as const;

const profiles: Record<SupportedClass, LevelOneCreationProfile> = {
  barbarian: {
    skillChoices: { count: 2, options: ['animalHandling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'] },
    weaponTraining: ['simple', 'martial'], armorTraining: ['light', 'medium', 'shields'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'weapon-mastery', label: 'Weapon Mastery', count: 2, optionCategory: 'weapon-mastery' }],
    resources: [{ id: 'rage', recharge: 'short-rest', maximum: { basis: 'fixed', value: 2 } }],
  },
  bard: {
    skillChoices: { count: 3, options: allSkills }, toolChoice: { id: 'musical-instrument', count: 3, optionIds: musicalInstrumentIds },
    weaponTraining: ['simple'], armorTraining: ['light'], startingEquipmentOptionCount: 2, choices: [],
    resources: [{ id: 'bardic-inspiration', recharge: 'long-rest', maximum: { basis: 'ability-modifier', ability: 'charisma', minimum: 1 } }],
    spellcasting: { cantrips: 2, selectedSpells: 4, preparedSpells: 0, preparationChange: 'on-class-level' },
  },
  cleric: {
    skillChoices: { count: 2, options: ['history', 'insight', 'medicine', 'persuasion', 'religion'] },
    weaponTraining: ['simple'], armorTraining: ['light', 'medium', 'shields'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'divine-order', label: 'Divine Order', count: 1, optionIds: ['protector', 'thaumaturge'] }, { id: 'holy-symbol', label: 'Holy Symbol', count: 1, optionIds: ['srd-2024:item:holy-symbol-amulet', 'srd-2024:item:holy-symbol-emblem', 'srd-2024:item:holy-symbol-reliquary'] }], resources: [],
    spellcasting: { cantrips: 3, selectedSpells: 0, preparedSpells: 4, preparationChange: 'long-rest' },
  },
  druid: {
    skillChoices: { count: 2, options: ['animalHandling', 'arcana', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'] },
    grantedToolIds: ['srd-2024:item:herbalism-kit'], weaponTraining: ['simple'], armorTraining: ['light', 'shields'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'primal-order', label: 'Primal Order', count: 1, optionIds: ['magician', 'warden'] }], resources: [],
    spellcasting: { cantrips: 2, selectedSpells: 0, preparedSpells: 4, preparationChange: 'long-rest', alwaysPreparedSpellIds: ['srd-2024:spell:speak-with-animals'] },
  },
  fighter: {
    skillChoices: { count: 2, options: ['acrobatics', 'animalHandling', 'athletics', 'history', 'insight', 'intimidation', 'persuasion', 'perception', 'survival'] },
    weaponTraining: ['simple', 'martial'], armorTraining: ['light', 'medium', 'heavy', 'shields'], startingEquipmentOptionCount: 3,
    choices: [
      { id: 'fighting-style', label: 'Fighting Style', count: 1, optionIds: ['archery', 'defense', 'dueling', 'great-weapon-fighting', 'protection', 'two-weapon-fighting'] },
      { id: 'weapon-mastery', label: 'Weapon Mastery', count: 3, optionCategory: 'weapon-mastery' },
    ], resources: [{ id: 'second-wind', recharge: 'short-rest', maximum: { basis: 'fixed', value: 2 } }],
  },
  monk: {
    skillChoices: { count: 2, options: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'] }, toolChoice: { id: 'tool-proficiency', count: 1, optionIds: [...artisanToolIds, ...musicalInstrumentIds] },
    weaponTraining: ['simple', 'martial-light'], armorTraining: [], startingEquipmentOptionCount: 2, choices: [], resources: [],
  },
  paladin: {
    skillChoices: { count: 2, options: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'] },
    weaponTraining: ['simple', 'martial'], armorTraining: ['light', 'medium', 'heavy', 'shields'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'holy-symbol', label: 'Holy Symbol', count: 1, optionIds: ['srd-2024:item:holy-symbol-amulet', 'srd-2024:item:holy-symbol-emblem', 'srd-2024:item:holy-symbol-reliquary'] }, { id: 'weapon-mastery', label: 'Weapon Mastery', count: 2, optionCategory: 'weapon-mastery' }],
    resources: [{ id: 'lay-on-hands', recharge: 'long-rest', maximum: { basis: 'class-level', multiplier: 5 } }],
    spellcasting: { cantrips: 0, selectedSpells: 0, preparedSpells: 2, preparationChange: 'long-rest-one' },
  },
  ranger: {
    skillChoices: { count: 3, options: ['animalHandling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'] },
    weaponTraining: ['simple', 'martial'], armorTraining: ['light', 'medium', 'shields'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'weapon-mastery', label: 'Weapon Mastery', count: 2, optionCategory: 'weapon-mastery' }],
    resources: [{ id: 'favored-enemy', recharge: 'long-rest', maximum: { basis: 'fixed', value: 2 } }],
    spellcasting: { cantrips: 0, selectedSpells: 0, preparedSpells: 2, preparationChange: 'long-rest-one', alwaysPreparedSpellIds: ['srd-2024:spell:hunters-mark'] },
  },
  rogue: {
    skillChoices: { count: 4, options: ['acrobatics', 'athletics', 'deception', 'insight', 'intimidation', 'investigation', 'perception', 'persuasion', 'sleightOfHand', 'stealth'] },
    grantedToolIds: ['srd-2024:item:thieves-tools'], languageChoiceCount: 1, weaponTraining: ['simple', 'martial-finesse-or-light'], armorTraining: ['light'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'expertise', label: 'Expertise', count: 2, optionCategory: 'skill-proficiency' }, { id: 'weapon-mastery', label: 'Weapon Mastery', count: 2, optionCategory: 'weapon-mastery' }], resources: [],
  },
  sorcerer: {
    skillChoices: { count: 2, options: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'] }, weaponTraining: ['simple'], armorTraining: [], startingEquipmentOptionCount: 2, choices: [],
    resources: [{ id: 'innate-sorcery', recharge: 'long-rest', maximum: { basis: 'fixed', value: 2 } }],
    spellcasting: { cantrips: 4, selectedSpells: 2, preparedSpells: 0, preparationChange: 'on-class-level' },
  },
  warlock: {
    skillChoices: { count: 2, options: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'] }, weaponTraining: ['simple'], armorTraining: ['light'], startingEquipmentOptionCount: 2,
    choices: [{ id: 'eldritch-invocation', label: 'Eldritch Invocation', count: 1, optionCategory: 'eldritch-invocation' }], resources: [],
    spellcasting: { cantrips: 2, selectedSpells: 2, preparedSpells: 0, preparationChange: 'on-class-level' },
  },
  wizard: {
    skillChoices: { count: 2, options: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'nature', 'religion'] }, weaponTraining: ['simple'], armorTraining: [], startingEquipmentOptionCount: 2, choices: [],
    resources: [{ id: 'arcane-recovery', recharge: 'long-rest', maximum: { basis: 'fixed', value: 1 } }],
    spellcasting: { cantrips: 3, selectedSpells: 0, spellbookSpells: 6, preparedSpells: 4, preparationChange: 'long-rest' },
  },
};

const multiclassPrerequisites: Record<SupportedClass, Class['multiclassing']> = {
  barbarian: { prerequisiteGroups: [{ strength: 13 }], initialGrants: [] }, bard: { prerequisiteGroups: [{ charisma: 13 }], initialGrants: [] }, cleric: { prerequisiteGroups: [{ wisdom: 13 }], initialGrants: [] }, druid: { prerequisiteGroups: [{ wisdom: 13 }], initialGrants: [] }, fighter: { prerequisiteGroups: [{ strength: 13 }, { dexterity: 13 }], initialGrants: [] }, monk: { prerequisiteGroups: [{ dexterity: 13 }, { wisdom: 13 }], initialGrants: [] }, paladin: { prerequisiteGroups: [{ strength: 13 }, { charisma: 13 }], initialGrants: [] }, ranger: { prerequisiteGroups: [{ dexterity: 13 }, { wisdom: 13 }], initialGrants: [] }, rogue: { prerequisiteGroups: [{ dexterity: 13 }], initialGrants: [] }, sorcerer: { prerequisiteGroups: [{ charisma: 13 }], initialGrants: [] }, warlock: { prerequisiteGroups: [{ charisma: 13 }], initialGrants: [] }, wizard: { prerequisiteGroups: [{ intelligence: 13 }], initialGrants: [] },
};

function classKey(id: string): SupportedClass | undefined {
  const match = id.match(/^srd-2024:class:(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard)$/);
  return match?.[1] as SupportedClass | undefined;
}

/** Applies reviewed structured facts without copying source prose. */
export function applyReviewedEnrichment(fixture: ContentFixture): ContentFixture {
  const sourceFor = (key: SupportedClass) => fixture.classes.find((entry) => entry.id === `srd-2024:class:${key}`)?.source;
  const wizardSource = sourceFor('wizard');
  const fighterSource = sourceFor('fighter');
  if (!wizardSource || !fighterSource) throw new Error('Reviewed enrichment requires all canonical SRD classes.');
  const resources: Resource[] = [...fixture.resources,
    { id: 'srd-2024:resource:wizard-arcane-recovery', name: 'Arcane Recovery uses', kind: 'resource', ruleset: '5e-2024', source: wizardSource, maximum: 1, recharge: 'long-rest' },
    { id: 'srd-2024:resource:fighter-second-wind', name: 'Second Wind uses', kind: 'resource', ruleset: '5e-2024', source: fighterSource, maximum: 2, recharge: 'short-rest' },
  ];
  const choices: Choice[] = [...fixture.choices, {
    id: 'srd-2024:choice:fighter-fighting-style', name: 'Fighting Style', kind: 'choice', ruleset: '5e-2024', source: fighterSource,
    options: [
      { id: 'archery', name: 'Archery' }, { id: 'defense', name: 'Defense' }, { id: 'dueling', name: 'Dueling' },
      { id: 'great-weapon-fighting', name: 'Great Weapon Fighting' }, { id: 'protection', name: 'Protection' }, { id: 'two-weapon-fighting', name: 'Two-Weapon Fighting' },
    ],
  }];
  const features: Feature[] = fixture.features.map((feature) => feature.id === 'srd-2024:feature:wizard-arcane-recovery'
    ? { ...feature, automation: 'tracked', resourceId: 'srd-2024:resource:wizard-arcane-recovery' }
    : feature.id === 'srd-2024:feature:fighter-second-wind'
      ? { ...feature, automation: 'tracked', resourceId: 'srd-2024:resource:fighter-second-wind' } : feature);
  const classes: Class[] = fixture.classes.map((entry) => {
    const key = classKey(entry.id);
    if (!key) return entry;
    const spellcasting = entry.spellcasting && {
      ...entry.spellcasting,
      selectionMode: key === 'wizard' ? 'known-and-prepared' as const : ['cleric', 'druid', 'paladin', 'ranger'].includes(key) ? 'prepared-from-list' as const : 'level-up-list' as const,
      progression: entry.spellcasting.progression.map((level) => ({ ...level, spellsLearned: key === 'wizard' ? level.level === 1 ? 6 : 2 : undefined })),
    };
    const advancement = key === 'fighter' ? entry.advancement.map((level) => level.level === 1 ? { ...level, grants: [...level.grants, { type: 'choice' as const, choiceId: 'srd-2024:choice:fighter-fighting-style' }] } : level) : entry.advancement;
    return { ...entry, levelOne: profiles[key], multiclassing: multiclassPrerequisites[key], spellcasting, advancement };
  });
  return { ...fixture, classes, features, choices, resources };
}
