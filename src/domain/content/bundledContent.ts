import { adaptProductionPack } from './canonicalAdapter';
import { bundledPublicContentRepository } from './bundledPublicPack';
import { validateContentFixture } from './fixtures';
import { applyReviewedEnrichment } from './reviewedEnrichment';
import type { ContentFixture } from './types';
import { BundledContentRepository } from './repository';

/**
 * The gameplay-facing view of the offline public pack. Reference records are
 * adapted only where the source has structured fields, then receive the small
 * reviewed enrichment required by the currently supported workflows.
 */
export const bundledContentFixture: ContentFixture = applyReviewedEnrichment(
  adaptProductionPack(bundledPublicContentRepository),
);

validateContentFixture(bundledContentFixture);

export const bundledContentRepository = new BundledContentRepository(bundledContentFixture);
