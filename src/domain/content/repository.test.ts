import { describe, expect, it } from 'vitest';

import { ComposedContentRepository, ContentPackValidationError, loadContentPack } from './repository';
import { bundledPublicContentPack, bundledPublicContentRepository } from './bundledPublicPack';
import { adaptProductionPack } from './canonicalAdapter';
import { applyReviewedEnrichment } from './reviewedEnrichment';

const source = { title: 'Test SRD', license: 'CC BY 4.0' };
const descriptor = (path: string, kinds: string[], counts: Record<string, number>) => ({
  path, kinds, counts, sha256: 'a'.repeat(64),
});
const pack = (overrides: Record<string, unknown> = {}) => ({
  manifest: {
    schemaVersion: 2, id: 'test-pack', name: 'Test pack', version: '1', ruleset: '5e-2024', distribution: 'public', source,
    modules: [descriptor('items.json', ['item'], { item: 1 })], report: { path: 'report.json', sha256: 'b'.repeat(64) },
  },
  modules: [{
    schemaVersion: 1, moduleKind: 'item-type-module',
    items: [{ id: 'test:item:rope', kind: 'item', name: 'Rope', ruleset: '5e-2024', source }],
  }],
  ...overrides,
});

describe('ComposedContentRepository', () => {
  it('indexes entities from independent modules and searches items', () => {
    const repository = new ComposedContentRepository([pack()]);
    expect(repository.getItem('test:item:rope')?.name).toBe('Rope');
    expect(repository.searchItems('rop').map((item) => item.id)).toEqual(['test:item:rope']);
  });

  it('rejects duplicate IDs across enabled packs', () => {
    expect(() => new ComposedContentRepository([pack(), pack({ manifest: { ...pack().manifest, id: 'another-pack' } })]))
      .toThrow(ContentPackValidationError);
  });

  it('rejects broken owner and subclass references', () => {
    const broken = pack({
      manifest: { ...pack().manifest, modules: [descriptor('class.json', ['class', 'feature'], { class: 1, feature: 1 })] },
      modules: [{ schemaVersion: 1, moduleKind: 'class-module', class: { id: 'test:class:wizard', kind: 'class', name: 'Wizard', ruleset: '5e-2024', source, featureIds: ['test:feature:missing'] }, features: [{ id: 'test:feature:unowned', kind: 'feature', name: 'Unowned', ruleset: '5e-2024', source, ownerId: 'test:class:missing' }] }],
    });
    expect(() => new ComposedContentRepository([broken])).toThrow('references missing feature');
  });

  it('rejects a spell list that names a missing class', () => {
    const broken = pack({
      manifest: { ...pack().manifest, modules: [descriptor('spells.json', ['spell'], { spell: 1 })] },
      modules: [{ schemaVersion: 1, moduleKind: 'spell-level-module', spells: [{ id: 'test:spell:missing-class', kind: 'spell', name: 'Missing class', ruleset: '5e-2024', source, spellListClassIds: ['test:class:missing'] }] }],
    });
    expect(() => new ComposedContentRepository([broken])).toThrow('references missing class');
  });

  it('rejects an entity whose ruleset conflicts with its manifest', () => {
    const conflicting = pack({ modules: [{ schemaVersion: 1, moduleKind: 'item-type-module', items: [{ id: 'test:item:rope', kind: 'item', name: 'Rope', ruleset: '5e-2014', source }] }] });
    expect(() => new ComposedContentRepository([conflicting])).toThrow();
  });

  it('requires every declared directory module and validates its declared counts', () => {
    const input = pack();
    expect(() => loadContentPack(input.manifest, {})).toThrow('missing module items.json');
    expect(() => loadContentPack(input.manifest, { 'items.json': { ...input.modules[0], items: [] } }))
      .toThrow('kinds do not match');
    expect(() => loadContentPack(input.manifest, { 'items.json': input.modules[0] })).not.toThrow();
  });
});

describe('bundled public SRD pack', () => {
  it('loads all reviewed modules offline through the production loader', () => {
    expect(bundledPublicContentPack.modules).toHaveLength(62);
    expect(bundledPublicContentRepository.get('srd-2024:class:wizard')?.name).toBe('Wizard');
    expect(bundledPublicContentRepository.searchItems('rope').map((item) => item.name)).toContain('Rope');
  });

  it('adapts only structurally represented mechanics into the gameplay contract', () => {
    const adapted = adaptProductionPack(bundledPublicContentRepository);
    const wizard = adapted.classes.find((entry) => entry.id === 'srd-2024:class:wizard');
    expect(wizard).toMatchObject({ hitDie: 6, savingThrowAbilities: ['intelligence', 'wisdom'] });
    expect(wizard?.spellListIds).toContain('srd-2024:spell:fire-bolt');
    expect(wizard?.advancement[2]?.grants.some((grant) => grant.type === 'feature')).toBe(true);
    expect(wizard?.spellcasting?.progression[2]?.slots).toMatchObject({ 1: 4, 2: 2 });
    expect(adapted.choices).toEqual([]);
    expect(adapted.resources).toEqual([]);
  });

  it('adds reviewed choices, resources, and multiclass facts only for supported classes', () => {
    const enriched = applyReviewedEnrichment(adaptProductionPack(bundledPublicContentRepository));
    const wizard = enriched.classes.find((entry) => entry.id === 'srd-2024:class:wizard');
    const fighter = enriched.classes.find((entry) => entry.id === 'srd-2024:class:fighter');
    expect(wizard?.multiclassing?.prerequisiteGroups).toEqual([{ intelligence: 13 }]);
    expect(wizard?.spellcasting?.progression[0]?.spellsLearned).toBe(6);
    expect(enriched.features.find((entry) => entry.id === 'srd-2024:feature:wizard-arcane-recovery')).toMatchObject({ automation: 'tracked', resourceId: 'srd-2024:resource:wizard-arcane-recovery' });
    expect(fighter?.advancement[0]?.grants).toContainEqual({ type: 'choice', choiceId: 'srd-2024:choice:fighter-fighting-style' });
  });
});
