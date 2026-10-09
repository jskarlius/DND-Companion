import generatedBootstrapPack from '../../../content/generated/open5e-srd-2024-bootstrap.json';
import { contentFixtureSchema } from './schemas';
import type { ContentFixture } from './types';
import { minimalContentFixture, validateContentFixture } from './fixtures';

/** The reviewed build artifact used at runtime; it is never fetched by the browser. */
const validatedGeneratedPack = contentFixtureSchema.parse(generatedBootstrapPack);

// Slice 6.75 retains the existing Fighter progression as the deliberately
// minimal multiclass fixture. It is replaced by generated public data in Slice 8.
const fighterClass = minimalContentFixture.classes.find((entry) => entry.id === 'srd-5.2.1:class:fighter');
const fighterFeatures = minimalContentFixture.features.filter((entry) => entry.id.startsWith('srd-5.2.1:feature:fighter-'));
const fighterResources = minimalContentFixture.resources.filter((entry) => entry.id.startsWith('srd-5.2.1:resource:fighter-'));

export const bundledContentFixture: ContentFixture = {
  ...validatedGeneratedPack,
  classes: fighterClass ? [...validatedGeneratedPack.classes, fighterClass] : validatedGeneratedPack.classes,
  features: [...validatedGeneratedPack.features, ...fighterFeatures],
  resources: [...validatedGeneratedPack.resources, ...fighterResources],
};

validateContentFixture(bundledContentFixture);
