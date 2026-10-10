import { describe, expect, it } from 'vitest';

import { minimalContentFixture, validateContentFixture } from './fixtures';
import { bundledContentFixture } from './bundledContent';

describe('minimal content fixture', () => {
  it('passes runtime schema and cross-reference validation', () => {
    expect(() => validateContentFixture(minimalContentFixture)).not.toThrow();
  });

  it('keeps progression based on stable IDs rather than display names', () => {
    const renamedWizard = {
      ...minimalContentFixture,
      classes: minimalContentFixture.classes.map((characterClass) =>
        characterClass.id === 'srd-2024:class:wizard'
          ? { ...characterClass, name: 'Renamed Wizard' }
          : characterClass,
      ),
    };

    expect(() => validateContentFixture(renamedWizard)).not.toThrow();
    expect(renamedWizard.classes[0]?.advancement[0]?.grants[0]).toMatchObject({
      type: 'feature',
      featureId: 'srd-2024:feature:wizard-spellcasting',
    });
  });

  it('rejects broken references', () => {
    const brokenFixture = {
      ...minimalContentFixture,
      classes: minimalContentFixture.classes.map((characterClass) =>
        characterClass.id === 'srd-2024:class:wizard'
          ? { ...characterClass, spellListIds: ['srd-2024:spell:missing'] }
          : characterClass,
      ),
    };

    expect(() => validateContentFixture(brokenFixture)).toThrow('references missing spell');
  });
});

describe('bundled Open5e bootstrap pack', () => {
  it('has public provenance, Wizard progression, a long spell list, and selectable feats', () => {
    expect(() => validateContentFixture(bundledContentFixture)).not.toThrow();
    expect(bundledContentFixture.manifest.distribution).toBe('public');
    expect(bundledContentFixture.manifest.source.upstreamVersion).toContain('srd-2024');
    const wizard = bundledContentFixture.classes.find((entry) => entry.name === 'Wizard');
    expect(wizard).toBeDefined();
    expect(wizard?.advancement.some((level) => level.level === 3)).toBe(true);
    expect(wizard?.advancement.some((level) => level.grants.some((grant) => grant.type === 'ability-score-improvement'))).toBe(true);
    expect(bundledContentFixture.spells.length).toBeGreaterThan(30);
    expect(bundledContentFixture.feats.length).toBeGreaterThan(0);
  });
});
