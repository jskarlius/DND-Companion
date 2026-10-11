import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test } from 'vitest';
import App from './App';
import { database } from './storage/database';
import { representativeCharacter, representativePlayState } from './features/character-sheet/characterSheetFixture';

beforeEach(async () => {
  window.history.replaceState({}, '', '/');
  window.location.hash = '';
  window.localStorage.clear();
  await Promise.all([database.characters.clear(), database.playState.clear()]);
});

afterEach(cleanup);

test('shows an empty library and creates a locally stored Wizard only after review', async () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'Loading character library…' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Start your party' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create your first character' }));
  expect(await screen.findByRole('heading', { name: 'Choose a class' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Wizard/ }));
  expect(await screen.findByRole('heading', { name: 'Create a Wizard' })).toBeInTheDocument();
  expect(await database.characters.count()).toBe(0);
  await userEvent.type(screen.getByLabelText('Character name'), 'Aster');
  await userEvent.click(screen.getByRole('button', { name: 'Review character' }));
  expect(screen.getByText('Nothing has been saved')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Create Wizard' }));

  await waitFor(async () => expect(await database.characters.count()).toBe(1));
  expect(window.location.hash).toMatch(/^#\/characters\//);
});

test('handles an unknown character URL gracefully', async () => {
  window.location.hash = '#/characters/local%3Acharacter%3Amissing';
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Character not found' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Return to library' })).toHaveAttribute('href', '#/');
});

test('loads a stored character from its stable URL', async () => {
  await database.characters.put(representativeCharacter);
  await database.playState.put(representativePlayState);
  window.location.hash = `#/characters/${encodeURIComponent(representativeCharacter.id)}`;
  render(<App />);

  expect(await screen.findByRole('heading', { name: 'Ariel Thorne' })).toBeInTheDocument();
});

test('duplicates hit-dice state using the duplicate class-entry IDs', async () => {
  const source = {
    ...representativeCharacter,
    classes: representativeCharacter.classes.map((entry, index) => ({ ...entry, id: `source:class-entry:${index}` })),
  };
  await database.characters.put(source);
  await database.playState.put({ ...representativePlayState, characterId: source.id, usedHitDice: { 'source:class-entry:0': 1, 'source:class-entry:1': 2, orphan: 4 } });
  render(<App />);

  await userEvent.click(await screen.findByRole('button', { name: 'Duplicate' }));
  await waitFor(async () => expect(await database.characters.count()).toBe(2));
  const duplicate = (await database.characters.toArray()).find((character) => character.id !== source.id)!;
  const duplicateState = await database.playState.get(duplicate.id);

  expect(duplicateState?.usedHitDice).toEqual({
    [duplicate.classes[0].id]: 1,
    [duplicate.classes[1].id]: 2,
  });
});

test('applies and remembers an explicitly selected dark theme', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: 'Use dark theme' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(window.localStorage.getItem('dnd-companion-theme')).toBe('dark');
});
