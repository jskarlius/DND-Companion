import type { Choice, Class, ContentFixture, Feature, LevelOneCreationProfile, Resource, Species } from './types';

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
  const species: Species[] = fixture.species.map((entry) => {
    const reviewed: Record<string, Omit<Species, keyof Pick<Species, 'id' | 'name' | 'kind' | 'ruleset' | 'source' | 'featureIds'>>> = {
      dragonborn: {
        traits: { size: 'Medium', speed: 30, senses: ['Darkvision 60 ft.'], damageResistances: [] },
        choices: [{ id: 'draconic-ancestry', label: 'Draconic Ancestry', options: [
          ['black', 'Black', 'Acid'], ['blue', 'Blue', 'Lightning'], ['brass', 'Brass', 'Fire'], ['bronze', 'Bronze', 'Lightning'], ['copper', 'Copper', 'Acid'], ['gold', 'Gold', 'Fire'], ['green', 'Green', 'Poison'], ['red', 'Red', 'Fire'], ['silver', 'Silver', 'Cold'], ['white', 'White', 'Cold'],
        ].map(([id, label, resistance]) => ({ id, label, description: `${label} dragon ancestry grants ${resistance} resistance and determines your Breath Weapon damage.`, traits: { damageResistances: [resistance!] } })) }],
        resources: [{ id: 'breath-weapon', label: 'Breath Weapon', recharge: 'long-rest', maximum: 'proficiency-bonus' }],
      },
      dwarf: { resources: [{ id: 'stonecunning', label: 'Stonecunning', recharge: 'long-rest', maximum: 'proficiency-bonus' }] },
      elf: {
        traits: { size: 'Medium', speed: 30, senses: ['Darkvision 60 ft.'], damageResistances: [] },
        choices: [
          { id: 'elven-lineage', label: 'Elven Lineage', options: [
            { id: 'drow', label: 'Drow', description: 'Darkvision 120 ft. and Dancing Lights.', traits: { senses: ['Darkvision 120 ft.'] }, requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:dancing-lights', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:faerie-fire', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:darkness', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }] },
            { id: 'high-elf', label: 'High Elf', description: 'Prestidigitation, with a Wizard cantrip replacement after a Long Rest.', requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:prestidigitation', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:detect-magic', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:misty-step', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }] },
            { id: 'wood-elf', label: 'Wood Elf', description: 'Druidcraft and a 35-foot Speed.', traits: { speed: 35 }, requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:druidcraft', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:longstrider', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:pass-without-trace', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }] },
          ] },
          { id: 'keen-senses', label: 'Keen Senses', options: [
            { id: 'insight', label: 'Insight', description: 'Gain Insight proficiency.', skillGrants: ['insight'] },
            { id: 'perception', label: 'Perception', description: 'Gain Perception proficiency.', skillGrants: ['perception'] },
            { id: 'survival', label: 'Survival', description: 'Gain Survival proficiency.', skillGrants: ['survival'] },
          ] },
        ],
      },
      gnome: {
        traits: { size: 'Small', speed: 30, senses: ['Darkvision 60 ft.'], damageResistances: [] },
        choices: [{ id: 'gnomish-lineage', label: 'Gnomish Lineage', options: [
          { id: 'forest', label: 'Forest Gnome', description: 'Minor Illusion and Speak with Animals.', requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:minor-illusion', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:speak-with-animals', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }] },
          { id: 'rock', label: 'Rock Gnome', description: 'Mending and Prestidigitation.', requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:mending', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:prestidigitation', acquiredAtCharacterLevel: 1, preparation: 'available' }] },
        ] }],
      },
      goliath: { resources: [] },
      halfling: { traits: { size: 'Small', speed: 30, senses: [], damageResistances: [] } },
      human: {
        traits: { size: 'Medium', speed: 30, senses: [], damageResistances: [] },
        choices: [
          { id: 'size', label: 'Size', options: [{ id: 'medium', label: 'Medium', description: 'About 4–7 feet tall.', traits: { size: 'Medium' } }, { id: 'small', label: 'Small', description: 'About 2–4 feet tall.', traits: { size: 'Small' } }] },
          { id: 'skillful', label: 'Skillful', options: allSkills.map((skill) => ({ id: skill, label: skill.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase()), description: `Gain ${skill} proficiency.`, skillGrants: [skill] })) },
          { id: 'origin-feat', label: 'Origin Feat', options: [
            { id: 'srd-2024:feat:alert', label: 'Alert', description: 'Gain the Alert Origin Feat.' },
            { id: 'srd-2024:feat:magic-initiate', label: 'Magic Initiate', description: 'Gain the Magic Initiate Origin Feat; its spell selection is shown as reference while the shared feat configuration is completed.' },
            { id: 'srd-2024:feat:savage-attacker', label: 'Savage Attacker', description: 'Gain the Savage Attacker Origin Feat.' },
            { id: 'srd-2024:feat:skilled', label: 'Skilled', description: 'Gain the Skilled Origin Feat.' },
          ] },
        ],
      },
      orc: { resources: [{ id: 'adrenaline-rush', label: 'Adrenaline Rush', recharge: 'short-rest', maximum: 'proficiency-bonus' }] },
      tiefling: {
        traits: { size: 'Medium', speed: 30, senses: ['Darkvision 60 ft.'], damageResistances: [] },
        choices: [
          { id: 'size', label: 'Size', options: [{ id: 'medium', label: 'Medium', description: 'About 4–7 feet tall.', traits: { size: 'Medium' } }, { id: 'small', label: 'Small', description: 'About 3–4 feet tall.', traits: { size: 'Small' } }] },
          { id: 'fiendish-legacy', label: 'Fiendish Legacy', options: [
            { id: 'abyssal', label: 'Abyssal', description: 'Poison Spray and poison resistance.', traits: { damageResistances: ['Poison'] }, requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:poison-spray', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:ray-of-sickness', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:hold-person', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:thaumaturgy', acquiredAtCharacterLevel: 1, preparation: 'available' }] },
            { id: 'chthonic', label: 'Chthonic', description: 'Chill Touch and necrotic resistance.', traits: { damageResistances: ['Necrotic'] }, requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:chill-touch', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:false-life', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:ray-of-enfeeblement', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:thaumaturgy', acquiredAtCharacterLevel: 1, preparation: 'available' }] },
            { id: 'infernal', label: 'Infernal', description: 'Fire Bolt and fire resistance.', traits: { damageResistances: ['Fire'] }, requiresSpellcastingAbility: true, grantedSpells: [{ spellId: 'srd-2024:spell:fire-bolt', acquiredAtCharacterLevel: 1, preparation: 'available' }, { spellId: 'srd-2024:spell:hellish-rebuke', acquiredAtCharacterLevel: 3, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:darkness', acquiredAtCharacterLevel: 5, preparation: 'always-prepared', freeCast: true }, { spellId: 'srd-2024:spell:thaumaturgy', acquiredAtCharacterLevel: 1, preparation: 'available' }] },
          ] },
        ],
      },
    };
    const key = entry.id.split(':').at(-1)!;
    const enrichment = reviewed[key];
    return enrichment ? {
      ...entry,
      ...enrichment,
      traits: {
        size: enrichment.traits?.size ?? entry.traits?.size ?? 'Medium',
        speed: enrichment.traits?.speed ?? entry.traits?.speed ?? 30,
        senses: enrichment.traits?.senses ?? entry.traits?.senses ?? [],
        damageResistances: enrichment.traits?.damageResistances ?? entry.traits?.damageResistances ?? [],
        maximumHpPerCharacterLevel: enrichment.traits?.maximumHpPerCharacterLevel ?? entry.traits?.maximumHpPerCharacterLevel,
      },
    } : entry;
  });
  return { ...fixture, classes, features, choices, resources, species };
}
