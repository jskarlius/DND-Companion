import { describe, expect, it } from 'vitest';

import { minimalContentFixture, validateContentFixture } from './fixtures';

describe('minimal content fixture', () => {
  it('passes runtime schema and cross-reference validation', () => {
    expect(() => validateContentFixture(minimalContentFixture)).not.toThrow();
  });

  it('keeps progression based on stable IDs rather than display names', () => {
    const renamedWizard = {
      ...minimalContentFixture,
      classes: minimalContentFixture.classes.map((characterClass) =>
        characterClass.id === 'srd-5.2.1:class:wizard'
          ? { ...characterClass, name: 'Renamed Wizard' }
          : characterClass,
      ),
    };

    expect(() => validateContentFixture(renamedWizard)).not.toThrow();
    expect(renamedWizard.classes[0]?.advancement[0]?.grants[0]).toMatchObject({
      type: 'feature',
      featureId: 'srd-5.2.1:feature:wizard-spellcasting',
    });
  });

  it('rejects broken references', () => {
    const brokenFixture = {
      ...minimalContentFixture,
      classes: minimalContentFixture.classes.map((characterClass) =>
        characterClass.id === 'srd-5.2.1:class:wizard'
          ? { ...characterClass, spellListIds: ['srd-5.2.1:spell:missing'] }
          : characterClass,
      ),
    };

    expect(() => validateContentFixture(brokenFixture)).toThrow('references missing spell');
  });
});
