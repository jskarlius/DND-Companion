import type { Character, CharacterPlayState } from '../../domain/character/types';
import { getAbilityModifier, getCharacterLevel, getProficiencyBonus } from '../../domain/character/calculations';
import type { ContentFixture } from '../../domain/content/types';

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
    readonly spellAttackBonus: number;
    readonly spellSaveDc: number;
  };
  readonly spellSlots: readonly { readonly level: number; readonly maximum: number; readonly label?: string; readonly recharge?: 'short-rest' | 'long-rest' }[];
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
 * Normal persisted characters receive only their own data. Until character
 * creation models a field, the sheet says so instead of borrowing fixture data.
 */
export function createUnchosenCharacterSheetDetails(character: Character, content: ContentFixture): CharacterSheetDetails {
  const totalLevel = getCharacterLevel(character.classes).value;
  const constitutionModifier = getAbilityModifier(character.abilityScores.constitution).value;
  const dexterityModifier = getAbilityModifier(character.abilityScores.dexterity).value;
  const expectedHitPointGains = character.classes.reduce((total, entry) => total + entry.level, 0);
  const hitPointBase = character.hitPointGains.length === expectedHitPointGains
    ? character.hitPointGains.reduce((total, gain) => total + gain.hitPoints, 0)
    : character.classes.reduce((total, entry) => {
    const characterClass = content.classes.find((candidate) => candidate.id === entry.classId);
    if (!characterClass) return total;
    return total + characterClass.hitDie + Math.max(entry.level - 1, 0) * Math.ceil(characterClass.hitDie / 2);
  }, 0);
  const spellcaster = character.classes
    .map((entry) => content.classes.find((candidate) => candidate.id === entry.classId))
    .find((candidate) => candidate?.spellcasting);
  const spellAbility = spellcaster?.spellcasting?.ability;
  const spellModifier = spellAbility ? getAbilityModifier(character.abilityScores[spellAbility]).value : 0;
  const proficiency = getProficiencyBonus(totalLevel).value;

  return {
    identity: { species: 'Not chosen', background: 'Not chosen', playerName: 'Not chosen' },
    appearance: { pronouns: 'Not chosen', description: 'Not chosen' },
    backstory: '',
    combat: {
      armorClass: 10 + dexterityModifier,
      speed: 0,
      maximumHp: Math.max(hitPointBase + constitutionModifier * totalLevel, 1),
      spellAttackBonus: spellAbility ? spellModifier + proficiency : 0,
      spellSaveDc: spellAbility ? 8 + spellModifier + proficiency : 0,
    },
    spellSlots: [],
    attacks: [],
    inventory: {},
    notes: [],
  };
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
  longRestHitDiceRecovery: '2024-all',
  enabledContentPackIds: ['srd-2024'],
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
      classId: 'srd-2024:class:wizard',
      level: 2,
      choices: {},
    },
    {
      id: 'demo:class-entry:fighter',
      classId: 'srd-2024:class:fighter',
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
    'srd-2024:spell:fire-bolt',
    'srd-2024:spell:magic-missile',
  ],
  preparedSpellIds: ['srd-2024:spell:magic-missile'],
  spellSelections: [
    { classEntryId: 'demo:class-entry:wizard', spellId: 'srd-2024:spell:fire-bolt', acquiredAtClassLevel: 1, prepared: false },
    { classEntryId: 'demo:class-entry:wizard', spellId: 'srd-2024:spell:magic-missile', acquiredAtClassLevel: 1, prepared: true },
  ],
  hitPointGains: [
    { classEntryId: 'demo:class-entry:wizard', classLevel: 1, method: 'fixed', hitPoints: 6 },
    { classEntryId: 'demo:class-entry:wizard', classLevel: 2, method: 'fixed', hitPoints: 4 },
    { classEntryId: 'demo:class-entry:fighter', classLevel: 1, method: 'fixed', hitPoints: 10 },
    { classEntryId: 'demo:class-entry:fighter', classLevel: 2, method: 'fixed', hitPoints: 6 },
  ],
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
  temporaryMaximumHpBonus: 0,
  inspiration: false,
  usedHitDice: {},
  usedResources: {
    'srd-2024:resource:wizard-arcane-recovery': 0,
    'srd-2024:resource:fighter-second-wind': 1,
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
    spellAttackBonus: 5,
    spellSaveDc: 13,
  },
  spellSlots: [{ level: 1, maximum: 3, label: 'Spell slots', recharge: 'long-rest' }],
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
