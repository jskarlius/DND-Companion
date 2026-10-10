import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { bundledContentFixture } from '../../domain/content/bundledContent';
import { buildCharacterSheetViewModel } from './characterSheetViewModel';
import { minimalContentFixture } from '../../domain/content/fixtures';
import { CharacterSheet } from './CharacterSheet';
import {
  representativeCharacter,
  representativeCharacterSheetDetails,
  representativePlayState,
} from './characterSheetFixture';

function renderSheet() {
  return render(
    <CharacterSheet
      character={representativeCharacter}
      playState={representativePlayState}
      content={minimalContentFixture}
      details={representativeCharacterSheetDetails}
    />,
  );
}

afterEach(cleanup);

test('renders all entries for the representative multiclass character', () => {
  renderSheet();

  expect(screen.getByText('Wizard 2 / Fighter 2')).toBeInTheDocument();
  expect(screen.getByText('Fire Bolt')).toBeInTheDocument();
  expect(screen.getByText('Second Wind uses')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Spells' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument();
});

test('derives hit dice and class identity from each character instead of representative display data', () => {
  const levelOneWizard = {
    ...representativeCharacter,
    id: 'demo:character:level-one-wizard',
    classes: [{ ...representativeCharacter.classes[0], id: 'demo:class-entry:level-one-wizard', level: 1 }],
  };

  render(
    <CharacterSheet
      character={levelOneWizard}
      playState={{ ...representativePlayState, characterId: levelOneWizard.id, usedHitDice: {} }}
      content={minimalContentFixture}
      details={representativeCharacterSheetDetails}
    />,
  );

  expect(screen.getByText('Wizard 1')).toBeInTheDocument();
  expect(screen.getByText('1d6')).toBeInTheDocument();
  expect(screen.queryByText('2d6 + 2d10')).not.toBeInTheDocument();
});

test('renders every class entry in the identity summary', () => {
  const fourClasses = {
    ...representativeCharacter,
    classes: [
      { ...representativeCharacter.classes[0], id: 'class-entry:wizard-a', level: 1 },
      { ...representativeCharacter.classes[1], id: 'class-entry:fighter-a', level: 1 },
      { ...representativeCharacter.classes[0], id: 'class-entry:wizard-b', level: 1 },
      { ...representativeCharacter.classes[1], id: 'class-entry:fighter-b', level: 1 },
    ],
  };

  render(
    <CharacterSheet
      character={fourClasses}
      playState={{ ...representativePlayState, usedHitDice: {} }}
      content={minimalContentFixture}
      details={representativeCharacterSheetDetails}
    />,
  );

  expect(screen.getByText('Wizard 1 / Fighter 1 / Wizard 1 / Fighter 1')).toBeInTheDocument();
});

test('shows the Spells tab only when a current class has spellcasting data', () => {
  const fighterOnly = {
    ...representativeCharacter,
    classes: [{ ...representativeCharacter.classes[1], id: 'class-entry:fighter-only', level: 2 }],
    knownSpellIds: [],
    preparedSpellIds: [],
  };

  render(
    <CharacterSheet
      character={fighterOnly}
      playState={{ ...representativePlayState, usedHitDice: {} }}
      content={minimalContentFixture}
      details={representativeCharacterSheetDetails}
    />,
  );

  expect(screen.queryByRole('tab', { name: 'Spells' })).not.toBeInTheDocument();
});

test('provides accessible labels for proficiency markers', () => {
  renderSheet();

  expect(screen.getByLabelText('Arcana: expertise')).toBeInTheDocument();
  expect(screen.getByLabelText('Intelligence saving throw, proficient')).toBeInTheDocument();
});

test('moves inventory and character information into their own accessible tab panels', () => {
  renderSheet();

  userEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
  expect(screen.getByRole('tabpanel', { name: 'Inventory' })).toHaveTextContent('Potion of Healing');
  expect(screen.queryByRole('heading', { name: 'Skills' })).not.toBeInTheDocument();

  userEvent.click(screen.getByRole('tab', { name: 'Character' }));
  expect(screen.getByRole('tabpanel', { name: 'Character' })).toHaveTextContent('Adventuring notes');
  expect(screen.getByRole('heading', { name: 'Backstory' })).toBeInTheDocument();
});

test('uses compact ability abbreviations while retaining full accessible names', () => {
  renderSheet();

  expect(screen.getByText('STR')).toBeInTheDocument();
  expect(screen.getByLabelText('Constitution')).toHaveTextContent('CON');
});

test('supports expected keyboard navigation between tabs', () => {
  renderSheet();

  const sheetTab = screen.getByRole('tab', { name: 'Sheet' });
  sheetTab.focus();
  userEvent.keyboard('{ArrowRight}');
  expect(screen.getByRole('tab', { name: 'Spells' })).toHaveFocus();
  expect(screen.getByRole('tabpanel', { name: 'Spells' })).toBeInTheDocument();
  userEvent.keyboard('{End}');
  expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveFocus();
});

test('allows every character-sheet section to be collapsed and expanded by keyboard or pointer', () => {
  renderSheet();

  const skills = screen.getByRole('button', { name: 'Skills' });
  expect(skills).toHaveAttribute('aria-expanded', 'true');
  userEvent.click(skills);
  expect(skills).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByLabelText('Arcana: expertise')).not.toBeVisible();
  userEvent.click(skills);
  expect(skills).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByLabelText('Arcana: expertise')).toBeInTheDocument();
});

test('edits session state with accessible controls without changing the fixture', () => {
  renderSheet();

  userEvent.clear(screen.getByLabelText('Current hit points'));
  userEvent.type(screen.getByLabelText('Current hit points'), '18');
  userEvent.click(screen.getByRole('checkbox', { name: 'Inspiration' }));
  userEvent.click(screen.getByLabelText('Death save success 1'));
  userEvent.type(screen.getByLabelText('Condition'), 'Poisoned');
  userEvent.click(screen.getByRole('button', { name: 'Add' }));

  expect(screen.getByLabelText('Current hit points')).toHaveValue(18);
  expect(screen.getByRole('checkbox', { name: 'Inspiration' })).toBeChecked();
  expect(screen.getByLabelText('Death save success 1')).toBeChecked();
  expect(screen.getByText('Poisoned')).toBeInTheDocument();
  expect(representativePlayState).toMatchObject({ currentHp: 22, inspiration: false, conditions: [] });
});

test('applies and resets a manual override with a reason', () => {
  renderSheet();

  userEvent.click(screen.getByRole('button', { name: 'Override armor class' }));
  userEvent.clear(screen.getByLabelText('Armor class override value'));
  userEvent.type(screen.getByLabelText('Armor class override value'), '18');
  userEvent.type(screen.getByLabelText('Armor class override reason'), 'Shield spell');
  userEvent.click(screen.getByRole('button', { name: 'Save override' }));
  expect(screen.getByText('18')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Override armor class' }));
  expect(screen.getByLabelText('Armor class override reason')).toHaveValue('Shield spell');
  userEvent.click(screen.getByRole('button', { name: 'Remove override' }));
  expect(screen.getByText('15')).toBeInTheDocument();
});

test('closes dialogs with Escape and restores focus to the initiating control', () => {
  renderSheet();

  const overrideTrigger = screen.getByRole('button', { name: 'Override armor class' });
  userEvent.click(overrideTrigger);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(overrideTrigger).toHaveFocus();

  const maximumHpTrigger = screen.getByRole('button', { name: 'Override maximum HP' });
  userEvent.click(maximumHpTrigger);
  userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(maximumHpTrigger).toHaveFocus();
});

test('requires DM confirmation for rests and tracks spell slots', () => {
  renderSheet();

  expect(screen.getByText('0 / 1 remaining / Short rest')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Short rest' }));
  expect(screen.getByRole('dialog', { name: 'Confirm short rest' })).toBeInTheDocument();
  expect(screen.getByText('0 / 1 remaining / Short rest')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'DM confirmed short rest' }));
  expect(screen.getByText('1 / 1 remaining / Short rest')).toBeInTheDocument();
  expect(screen.getByText('1 / 1 remaining / Long rest')).toBeInTheDocument();

  userEvent.click(screen.getByRole('tab', { name: 'Spells' }));
  expect(screen.getByText('3 total / 1 used')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Use level 1 spell slot' }));
  expect(screen.getByText('3 total / 2 used')).toBeInTheDocument();
});

test('groups spells by level with preparation, casting details, and compact slot controls', () => {
  renderSheet();

  userEvent.click(screen.getByRole('tab', { name: 'Spells' }));

  expect(screen.getByText('Cantrips 1 / 3')).toBeInTheDocument();
  expect(screen.getByText('Known spells 1')).toBeInTheDocument();
  expect(screen.getByText('Prepared 1 / 5')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Cantrips' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Level 1' })).toBeInTheDocument();
  expect(screen.getAllByText(/Action.*120 feet.*V, S.*Instantaneous/)).toHaveLength(2);
  expect(screen.queryByLabelText('Prepare Fire Bolt')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Prepare Magic Missile')).toBeChecked();

  userEvent.click(screen.getByRole('button', { name: 'View Magic Missile description' }));
  expect(screen.getByRole('heading', { name: 'Magic Missile' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

  userEvent.click(screen.getByLabelText('Prepare Magic Missile'));
  expect(screen.getByLabelText('Prepare Magic Missile')).not.toBeChecked();
});

test('exposes second-level Wizard spells when Wizard reaches level 3', () => {
  const wizard = bundledContentFixture.classes.find((entry) => entry.id === 'srd-2024:class:wizard');
  expect(wizard?.spellcasting?.progression.find((entry) => entry.level === 3)?.slots[2]).toBeGreaterThan(0);
  const levelTwoWizard = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 2 }], hitPointGains: representativeCharacter.hitPointGains.slice(0, 2) };
  render(<CharacterSheet character={levelTwoWizard} playState={representativePlayState} content={bundledContentFixture} details={representativeCharacterSheetDetails} onAdvancementCommit={vi.fn()} />);
  userEvent.click(screen.getByRole('button', { name: 'Level up' }));
  userEvent.click(screen.getByLabelText('New spell 1'));
  userEvent.click(screen.getByRole('tab', { name: 'Level 2' }));
  expect(screen.getByRole('option', { name: /Misty Step/ })).toBeInTheDocument();
});

test('renders every entry in a long spell list', () => {
  const extraSpells = Array.from({ length: 18 }, (_, index) => ({
    ...minimalContentFixture.spells[1],
    id: `test:spell:${index}`,
    name: `Test spell ${index + 1}`,
  }));
  render(
    <CharacterSheet
      character={{ ...representativeCharacter, knownSpellIds: [representativeCharacter.knownSpellIds[0], ...extraSpells.map((spell) => spell.id)], spellSelections: extraSpells.map((spell) => ({ classEntryId: representativeCharacter.classes[0]!.id, spellId: spell.id, acquiredAtClassLevel: 1, prepared: false })) }}
      playState={representativePlayState}
      content={{ ...minimalContentFixture, spells: [...minimalContentFixture.spells, ...extraSpells] }}
      details={representativeCharacterSheetDetails}
    />,
  );

  userEvent.click(screen.getByRole('tab', { name: 'Spells' }));
  expect(screen.getByText('Known spells 18')).toBeInTheDocument();
  expect(screen.getAllByText(/^Test spell /)).toHaveLength(18);
});

test('tracks hit dice by class entry and supports the optional 2014 recovery allocation', () => {
  renderSheet();

  userEvent.selectOptions(screen.getByLabelText('Long-rest hit-dice recovery'), '2014-half');
  userEvent.click(screen.getByRole('button', { name: 'Short rest' }));
  userEvent.click(screen.getByRole('button', { name: 'Spend d6' }));
  userEvent.click(screen.getByRole('button', { name: 'DM confirmed short rest' }));
  expect(screen.getByText('1 / 4 used')).toBeInTheDocument();

  userEvent.click(screen.getByRole('button', { name: 'Long rest' }));
  expect(screen.getByText('2014 table rule: restore up to 2 spent Hit Point Dice. Choose the groups to restore.')).toBeInTheDocument();
  userEvent.click(screen.getAllByRole('button', { name: 'Restore one' }).find((button) => !button.hasAttribute('disabled'))!);
  userEvent.click(screen.getByRole('button', { name: 'DM confirmed long rest' }));
  expect(screen.getByText('0 / 4 used')).toBeInTheDocument();
});

test('adds an Aid maximum-HP bonus separately from the base maximum', () => {
  renderSheet();

  userEvent.type(screen.getByLabelText('Aid maximum HP bonus'), '5');
  expect(screen.getByText('31')).toBeInTheDocument();
  expect(screen.getByText('Includes Aid +5')).toBeInTheDocument();
  expect(screen.getByLabelText('Current hit points')).toHaveValue(27);
});

test('reviews a level-up before one explicit confirm and leaves the character unchanged on cancel', () => {
  const onAdvancementCommit = vi.fn();
  const levelOneWizard = {
    ...representativeCharacter,
    classes: [{ ...representativeCharacter.classes[0], level: 1 }],
    hitPointGains: representativeCharacter.hitPointGains.slice(0, 1),
  };
  render(<CharacterSheet character={levelOneWizard} playState={representativePlayState} content={bundledContentFixture} details={representativeCharacterSheetDetails} onAdvancementCommit={onAdvancementCommit} />);
  userEvent.click(screen.getByRole('button', { name: 'Level up' }));
  fireEvent.change(screen.getByLabelText('Hit points gained'), { target: { value: '5' } });
  userEvent.click(screen.getByRole('button', { name: 'Use fixed average (+4)' }));
  expect(screen.getByLabelText('Hit points gained')).toHaveValue(4);
  fireEvent.change(screen.getByLabelText('New spell 1'), { target: { value: 'shield' } });
  expect(screen.getByLabelText('New spell 1')).toHaveValue('Shield');
  userEvent.click(screen.getByLabelText('New spell 1'));
  expect(screen.getByRole('option', { name: /Shield/ })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'View full description' }));
  expect(screen.getByRole('heading', { name: 'Shield' })).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  userEvent.click(screen.getByLabelText('New spell 1'));
  userEvent.click(screen.getByRole('option', { name: /Shield/ }));
  fireEvent.change(screen.getByLabelText('New spell 2'), { target: { value: 'sleep' } });
  expect(screen.getByLabelText('New spell 2')).toHaveValue('Sleep');
  userEvent.click(screen.getByRole('button', { name: 'Review level-up' }));
  expect(screen.getByRole('region', { name: 'Level-up preview' })).toHaveTextContent('Wizard: Level 2');
  expect(screen.getByRole('region', { name: 'Level-up preview' })).toHaveTextContent('Hit Die: +4 (fixed average)');
  expect(screen.getByRole('region', { name: 'Level-up preview' })).toHaveTextContent('Maximum HP: +6 (Hit Die +4, Constitution +2)');
  userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onAdvancementCommit).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole('button', { name: 'Level up' }));
  userEvent.click(screen.getByRole('button', { name: 'Review level-up' }));
  userEvent.click(screen.getByRole('button', { name: 'Confirm level-up' }));
  expect(onAdvancementCommit).toHaveBeenCalledWith(expect.objectContaining({ classes: [expect.objectContaining({ level: 2 })] }), representativePlayState);
});

test('lists the Cleric bootstrap spell subset as available prepared spells', () => {
  const clericCharacter = {
    ...representativeCharacter,
    classes: [{ id: 'test:cleric', classId: 'srd-2024:class:cleric', level: 1, choices: {} }],
    knownSpellIds: [], preparedSpellIds: [], spellSelections: [], hitPointGains: [{ classEntryId: 'test:cleric', classLevel: 1, method: 'fixed' as const, hitPoints: 8 }],
  };
  const model = buildCharacterSheetViewModel(clericCharacter, representativePlayState, bundledContentFixture, representativeCharacterSheetDetails);
  expect(model.spells.map(({ spell }) => spell.name)).toContain('Cure Wounds');
  expect(model.spells.every(({ spell }) => spell.level <= 1)).toBe(true);
  expect(model.spells.every(({ prepared }) => !prepared)).toBe(true);
});

test('shows Fighting Style and Cleric spell choices in the level-up dialog', () => {
  const fighterEligibleWizard = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 1 }] };
  render(<CharacterSheet character={fighterEligibleWizard} playState={representativePlayState} content={bundledContentFixture} details={representativeCharacterSheetDetails} onAdvancementCommit={vi.fn()} />);
  userEvent.click(screen.getByRole('button', { name: 'Level up' }));
  fireEvent.change(screen.getByLabelText('Class to advance'), { target: { value: 'srd-2024:class:fighter' } });
  expect(screen.getByLabelText('Fighting Style')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Fighting Style'), { target: { value: 'defense' } });
  userEvent.click(screen.getByRole('button', { name: 'Review level-up' }));
  expect(screen.getByRole('region', { name: 'Level-up preview' })).toHaveTextContent('Fighting Style: Defense');
  userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  userEvent.click(screen.getByRole('button', { name: 'Level up' }));
  fireEvent.change(screen.getByLabelText('Class to advance'), { target: { value: 'srd-2024:class:cleric' } });
  expect(screen.getAllByLabelText(/New cantrip/)).toHaveLength(3);
  expect(screen.getAllByLabelText(/New spell/)).toHaveLength(4);
});

test('edits final ability scores and records their generation method without a manual override', () => {
  const onCharacterChange = vi.fn();
  render(<CharacterSheet character={representativeCharacter} playState={representativePlayState} content={minimalContentFixture} details={representativeCharacterSheetDetails} onCharacterChange={onCharacterChange} />);
  userEvent.click(screen.getByRole('button', { name: 'Edit ability scores' }));
  fireEvent.change(screen.getByLabelText('Strength score'), { target: { value: '15' } });
  userEvent.click(screen.getByRole('button', { name: 'Save ability scores' }));
  expect(onCharacterChange).toHaveBeenLastCalledWith(expect.objectContaining({
    abilityScoreGeneration: 'standard-array',
    abilityScores: expect.objectContaining({ strength: 15 }),
  }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
