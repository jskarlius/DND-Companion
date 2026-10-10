import manifest from '../../../content/packs/srd-2024/manifest.json';

import { ComposedContentRepository, loadContentPack } from './repository';
import type { ContentPack } from './types';

type JsonModule = { readonly default: unknown };

// Eager, build-time imports keep gameplay independent of the Open5e API and
// ensure every reviewed module is present in the offline application build.
const importedJson = import.meta.glob('../../../content/packs/srd-2024/**/*.json', {
  eager: true,
}) as Record<string, JsonModule>;

const packRoot = '../../../content/packs/srd-2024/';
const modulesByPath = Object.fromEntries(
  Object.entries(importedJson)
    .filter(([path]) => path !== `${packRoot}manifest.json` && path !== `${packRoot}import-report.json`)
    .map(([path, json]) => [path.slice(packRoot.length), json.default]),
);

/** The deterministic public SRD snapshot bundled with the application. */
export const bundledPublicContentPack: ContentPack = loadContentPack(manifest, modulesByPath);

/** Source-preserving repository for full-pack content and inventory search. */
export const bundledPublicContentRepository = new ComposedContentRepository([bundledPublicContentPack]);
