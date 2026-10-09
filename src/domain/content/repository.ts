import type { Class, ContentFixture, Feat, Spell } from './types';
import { bundledContentFixture } from './bundledContent';

/**
 * Read-only boundary used by both presentation and future advancement code.
 * Installed-pack search belongs to Slice 8; this first implementation exposes
 * the bundled, validated bootstrap pack only.
 */
export interface ContentRepository {
  getClass(id: string): Class | undefined;
  getSpell(id: string): Spell | undefined;
  getFeat(id: string): Feat | undefined;
  getFixture(): ContentFixture;
}

export class BundledContentRepository implements ContentRepository {
  constructor(private readonly fixture: ContentFixture) {}

  getFixture(): ContentFixture { return this.fixture; }
  getClass(id: string): Class | undefined { return this.fixture.classes.find((entity) => entity.id === id); }
  getSpell(id: string): Spell | undefined { return this.fixture.spells.find((entity) => entity.id === id); }
  getFeat(id: string): Feat | undefined { return this.fixture.feats.find((entity) => entity.id === id); }
}

export const bundledContentRepository = new BundledContentRepository(bundledContentFixture);
