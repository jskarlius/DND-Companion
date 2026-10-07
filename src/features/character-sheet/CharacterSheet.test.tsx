import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
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
  expect(screen.getAllByText('Fire Bolt')).toHaveLength(2);
  expect(screen.getByText('Second Wind uses')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument();
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

test('requires DM confirmation for rests and tracks spell slots', () => {
  renderSheet();

  expect(screen.getByText('0 / 1 remaining / Short rest')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Short rest' }));
  expect(screen.getByRole('dialog', { name: 'Confirm short rest' })).toBeInTheDocument();
  expect(screen.getByText('0 / 1 remaining / Short rest')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'DM confirmed short rest' }));
  expect(screen.getByText('1 / 1 remaining / Short rest')).toBeInTheDocument();
  expect(screen.getByText('1 / 1 remaining / Long rest')).toBeInTheDocument();

  expect(screen.getByText('2 / 3 remaining')).toBeInTheDocument();
  userEvent.click(screen.getByRole('button', { name: 'Use level 1 spell slot' }));
  expect(screen.getByText('1 / 3 remaining')).toBeInTheDocument();
});

test('adds an Aid maximum-HP bonus separately from the base maximum', () => {
  renderSheet();

  userEvent.type(screen.getByLabelText('Aid maximum HP bonus'), '5');
  expect(screen.getByText('31')).toBeInTheDocument();
  expect(screen.getByText('Includes Aid +5')).toBeInTheDocument();
  expect(screen.getByLabelText('Current hit points')).toHaveValue(27);
});
