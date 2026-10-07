import type { Character, CharacterPlayState } from '../../domain/character/types';

export interface CharacterSheetDetails {
  readonly identity: {
    readonly species: string;
    readonly background: string;
    readonly playerName: string;
  };
  readonly appearance: {
    readonly pronouns: string;
    readonly description: string;
  };
  readonly backstory: string;
  readonly combat: {
    readonly armorClass: number;
    readonly speed: number;
    readonly maximumHp: number;
    readonly hitDice: string;
  };
  readonly attacks: readonly {
    readonly name: string;
    readonly attackBonus: number;
    readonly damage: string;
    readonly notes?: string;
  }[];
  readonly inventory: Readonly<Record<string, string>>;
  readonly notes: readonly {
    readonly title: string;
    readonly content: string;
  }[];
}

/**
 * Public, synthetic data used only to exercise the Slice 4 character sheet.
 * It intentionally does not reproduce workbook or private-book material.
 */
export const representativeCharacter: Character = {
  schemaVersion: 1,
  id: 'demo:character:ariel-thorne',
  name: 'Ariel Thorne',
  ruleset: '5e-2024',
  enabledContentPackIds: ['srd-5.2.1'],
  abilityScoreGeneration: 'standard-array',
  abilityScores: {
    strength: 10,
    dexterity: 14,
    constitution: 14,
    intelligence: 16,
    wisdom: 12,
    charisma: 8,
  },
  classes: [
    {
      id: 'demo:class-entry:wizard',
      classId: 'srd-5.2.1:class:wizard',
      level: 2,
      choices: {},
    },
    {
      id: 'demo:class-entry:fighter',
      classId: 'srd-5.2.1:class:fighter',
      level: 2,
      choices: {},
    },
  ],
  choices: {},
  proficiencies: {
    savingThrowAbilities: ['intelligence', 'wisdom'],
    skills: {
      arcana: 'expertise',
      history: 'proficient',
      investigation: 'proficient',
      perception: 'proficient',
      stealth: 'proficient',
    },
  },
  knownSpellIds: [
    'srd-5.2.1:spell:fire-bolt',
    'srd-5.2.1:spell:magic-missile',
  ],
  preparedSpellIds: ['srd-5.2.1:spell:magic-missile'],
  inventory: [
    { itemId: 'demo:item:scholar-pack', quantity: 1 },
    { itemId: 'demo:item:spellbook', quantity: 1 },
    { itemId: 'demo:item:healing-potion', quantity: 2 },
  ],
  manualOverrides: {},
};

export const representativePlayState: CharacterPlayState = {
  characterId: representativeCharacter.id,
  currentHp: 22,
  temporaryHp: 0,
  usedResources: {
    'srd-5.2.1:resource:wizard-arcane-recovery': 0,
    'srd-5.2.1:resource:fighter-second-wind': 1,
  },
  usedSpellSlots: { 1: 1 },
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  conditions: [],
};

export const representativeCharacterSheetDetails: CharacterSheetDetails = {
  identity: {
    species: 'Human',
    background: 'Sage',
    playerName: 'Demo player',
  },
  appearance: {
    pronouns: 'they/them',
    description: 'A precise traveler in a moss-green coat, carrying a well-used spellbook.',
  },
  backstory: 'Ariel left a quiet life of study to understand the arcane traces appearing along old trade roads.',
  combat: {
    armorClass: 15,
    speed: 30,
    maximumHp: 26,
    hitDice: '2d6 + 2d10',
  },
  attacks: [
    { name: 'Quarterstaff', attackBonus: 2, damage: '1d6 bludgeoning', notes: 'Versatile (1d8)' },
    { name: 'Fire Bolt', attackBonus: 5, damage: '1d10 fire', notes: 'Character-level scaling' },
  ],
  inventory: {
    'demo:item:scholar-pack': 'Scholar’s Pack',
    'demo:item:spellbook': 'Spellbook',
    'demo:item:healing-potion': 'Potion of Healing',
  },
  notes: [
    {
      title: 'Adventuring notes',
      content: 'A synthetic character used to verify the dynamic character-sheet layout.',
    },
  ],
};
