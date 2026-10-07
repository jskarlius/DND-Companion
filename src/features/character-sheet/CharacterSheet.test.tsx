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
