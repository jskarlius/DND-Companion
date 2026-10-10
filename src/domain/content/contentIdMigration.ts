import type { Character, CharacterPlayState } from '../character/types';

const legacyNamespace = 'srd-5.2.1';
const canonicalNamespace = 'srd-2024';

function contentId(id: string): string {
  return id.startsWith(`${legacyNamespace}:`) ? `${canonicalNamespace}${id.slice(legacyNamespace.length)}` : id;
}

function choiceRecord(choices: Readonly<Record<string, string | readonly string[]>>): Record<string, string | readonly string[]> {
  return Object.fromEntries(Object.entries(choices).map(([id, value]) => [contentId(id), value]));
}

/** Migrates only development SRD references; user-owned namespaces remain untouched. */
export function migrateDevelopmentContentIds(character: Character, playState: CharacterPlayState): { character: Character; playState: CharacterPlayState } {
  return {
    character: {
      ...character,
      enabledContentPackIds: character.enabledContentPackIds.map((id) => id === legacyNamespace ? canonicalNamespace : id),
      classes: character.classes.map((entry) => ({ ...entry, classId: contentId(entry.classId), subclassId: entry.subclassId && contentId(entry.subclassId), choices: choiceRecord(entry.choices) })),
      choices: choiceRecord(character.choices),
      knownSpellIds: character.knownSpellIds.map(contentId),
      preparedSpellIds: character.preparedSpellIds.map(contentId),
      spellSelections: character.spellSelections.map((selection) => ({ ...selection, spellId: contentId(selection.spellId) })),
      inventory: character.inventory.map((entry) => ({ ...entry, itemId: contentId(entry.itemId) })),
    },
    playState: { ...playState, usedResources: Object.fromEntries(Object.entries(playState.usedResources).map(([id, value]) => [contentId(id), value])) },
  };
}
