import { describe, expect, test } from 'vitest';
import { bundledContentRepository } from '../content/bundledContent';
import { representativeCharacter, representativePlayState } from '../../features/character-sheet/characterSheetFixture';
import { getCombinedSpellSlots, planAdvancement } from './advancement';

describe('advancement planner', () => {
  test('previews a Wizard level without mutating the saved character or play state', () => {
    const character = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 1 }], hitPointGains: representativeCharacter.hitPointGains.slice(0, 1) };
    const result = planAdvancement(character, representativePlayState, bundledContentRepository, {
      targetClassId: 'srd-2024:class:wizard', hitPointGain: { method: 'fixed', hitPoints: 4 },
      spellSelections: [
        { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 1, prepared: false },
        { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:sleep', acquiredAtClassLevel: 1, prepared: false },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.preview.character.classes[0]?.level).toBe(2);
    expect(result.preview.character.hitPointGains).toHaveLength(2);
    expect(result.preview.playState).toBe(representativePlayState);
    expect(character.classes[0]?.level).toBe(1);
  });

  test('requires a subclass at the Wizard subclass level and applies it to that class entry', () => {
    const character = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 2 }], hitPointGains: representativeCharacter.hitPointGains.slice(0, 2) };
    const incomplete = planAdvancement(character, representativePlayState, bundledContentRepository, { targetClassId: 'srd-2024:class:wizard', hitPointGain: { method: 'fixed', hitPoints: 4 }, spellSelections: [{ classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 1, prepared: false }, { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:sleep', acquiredAtClassLevel: 1, prepared: false }] });
    expect(incomplete).toMatchObject({ ok: false, issues: [{ field: 'subclass' }] });
    const complete = planAdvancement(character, representativePlayState, bundledContentRepository, { targetClassId: 'srd-2024:class:wizard', subclassId: 'srd-2024:subclass:evoker', hitPointGain: { method: 'fixed', hitPoints: 4 }, spellSelections: [{ classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 1, prepared: false }, { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:sleep', acquiredAtClassLevel: 1, prepared: false }] });
    expect(complete).toMatchObject({ ok: true });
  });

  test('enforces multiclass prerequisites but accepts the Fighter Dexterity alternative', () => {
    const wizardOnly = { ...representativeCharacter, classes: [representativeCharacter.classes[0]] };
    const result = planAdvancement(wizardOnly, representativePlayState, bundledContentRepository, { targetClassId: 'srd-2024:class:fighter', newClassEntryId: 'test:fighter', hitPointGain: { method: 'fixed', hitPoints: 10 }, classChoices: { 'srd-2024:choice:fighter-fighting-style': 'defense' } });
    expect(result).toMatchObject({ ok: true });
    const blocked = planAdvancement({ ...wizardOnly, abilityScores: { ...wizardOnly.abilityScores, strength: 10, dexterity: 10 } }, representativePlayState, bundledContentRepository, { targetClassId: 'srd-2024:class:fighter', newClassEntryId: 'test:fighter', hitPointGain: { method: 'fixed', hitPoints: 10 } });
    expect(blocked).toMatchObject({ ok: false, issues: [{ field: 'class' }] });
  });

  test('records Cleric cantrips and prepared spells when taking the supported multiclass level', () => {
    const character = { ...representativeCharacter, abilityScores: { ...representativeCharacter.abilityScores, wisdom: 13 }, classes: [{ ...representativeCharacter.classes[0], level: 1 }], spellSelections: [] };
    const result = planAdvancement(character, representativePlayState, bundledContentRepository, {
      targetClassId: 'srd-2024:class:cleric', newClassEntryId: 'test:cleric', hitPointGain: { method: 'fixed', hitPoints: 5 },
      spellSelections: [
        'guidance', 'sacred-flame', 'light', 'bless', 'cure-wounds', 'guiding-bolt', 'detect-magic',
      ].map((slug) => ({ classEntryId: 'test:cleric', spellId: `srd-2024:spell:${slug}`, acquiredAtClassLevel: 1, prepared: false })),
    });
    if (!result.ok) throw new Error(result.issues.map((issue) => issue.message).join(' '));
    expect(result.preview.character.preparedSpells).toContainEqual({ classEntryId: 'test:cleric', spellId: 'srd-2024:spell:bless' });
  });

  test('describes subclass feature grants and resolved class choices in the preview', () => {
    const character = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 2 }], hitPointGains: representativeCharacter.hitPointGains.slice(0, 2) };
    const result = planAdvancement(character, representativePlayState, bundledContentRepository, { targetClassId: 'srd-2024:class:wizard', subclassId: 'srd-2024:subclass:evoker', hitPointGain: { method: 'fixed', hitPoints: 4 }, spellSelections: [{ classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 3, prepared: false }, { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:sleep', acquiredAtClassLevel: 3, prepared: false }] });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.preview.changes).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'Feature', detail: 'Evocation Savant' })]));
  });

  test('uses the combined full-caster table for Wizard and Cleric levels', () => {
    expect(getCombinedSpellSlots([
      { ...representativeCharacter.classes[0], level: 2 },
      { id: 'test:cleric', classId: 'srd-2024:class:cleric', level: 1, choices: {} },
    ], bundledContentRepository)).toEqual({ 1: 4, 2: 2 });
  });

  test('keeps selected spells attached to their granting class entry', () => {
    const character = { ...representativeCharacter, classes: [{ ...representativeCharacter.classes[0], level: 1 }], spellSelections: [], knownSpellIds: [], preparedSpellIds: [] };
    const result = planAdvancement(character, representativePlayState, bundledContentRepository, {
      targetClassId: 'srd-2024:class:wizard', hitPointGain: { method: 'fixed', hitPoints: 4 },
      spellSelections: [
        { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:magic-missile', acquiredAtClassLevel: 1, prepared: true },
        { classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 1, prepared: false },
      ],
    });
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.preview.character.spellSelections).toEqual(expect.arrayContaining([
      expect.objectContaining({ classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:magic-missile', acquiredAtClassLevel: 2 }),
      expect.objectContaining({ classEntryId: character.classes[0]!.id, spellId: 'srd-2024:spell:shield', acquiredAtClassLevel: 2 }),
    ]));
  });
});
