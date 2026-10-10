import { expect, test } from 'vitest';

import { representativeCharacter, representativePlayState } from '../../features/character-sheet/characterSheetFixture';
import { migrateDevelopmentContentIds } from './contentIdMigration';

test('migrates only legacy development SRD references', () => {
  const legacyCharacter = {
    ...representativeCharacter,
    enabledContentPackIds: ['srd-5.2.1', 'private:owner-pack'],
    classes: representativeCharacter.classes.map((entry) => ({ ...entry, classId: entry.classId.replace('srd-2024', 'srd-5.2.1') })),
    knownSpellIds: representativeCharacter.knownSpellIds.map((id) => id.replace('srd-2024', 'srd-5.2.1')),
    spellSelections: representativeCharacter.spellSelections.map((entry) => ({ ...entry, spellId: entry.spellId.replace('srd-2024', 'srd-5.2.1') })),
  };
  const legacyState = { ...representativePlayState, usedResources: { 'srd-5.2.1:resource:wizard-arcane-recovery': 1, 'private:resource:focus': 2 } };
  const migrated = migrateDevelopmentContentIds(legacyCharacter, legacyState);

  expect(migrated.character.enabledContentPackIds).toEqual(['srd-2024', 'private:owner-pack']);
  expect(migrated.character.classes[0]?.classId).toBe('srd-2024:class:wizard');
  expect(migrated.character.spellSelections[0]?.spellId).toMatch(/^srd-2024:/);
  expect(migrated.playState.usedResources).toEqual({ 'srd-2024:resource:wizard-arcane-recovery': 1, 'private:resource:focus': 2 });
});
