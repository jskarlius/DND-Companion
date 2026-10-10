import { contentPackManifestSchema, contentPackModuleSchema, contentPackSchema, packEntitySchema } from './schemas';
import type { Choice, Class, ContentFixture, ContentPack, ContentPackModule, Feat, Feature, Item, PackEntity, ProductionContentPackManifest, Resource, Spell, Subclass } from './types';

/**
 * Read-only boundary used by both presentation and future advancement code.
 * Installed-pack search belongs to Slice 8; this first implementation exposes
 * the bundled, validated bootstrap pack only.
 */
export interface ContentRepository {
  getClass(id: string): Class | undefined;
  getSpell(id: string): Spell | undefined;
  getFeat(id: string): Feat | undefined;
  getSubclass(id: string): Subclass | undefined;
  getFeature(id: string): Feature | undefined;
  getChoice(id: string): Choice | undefined;
  getResource(id: string): Resource | undefined;
  getItem(id: string): Item | undefined;
  searchItems(query: string): readonly Item[];
  getFixture(): ContentFixture;
}

export class BundledContentRepository implements ContentRepository {
  constructor(private readonly fixture: ContentFixture) {}

  getFixture(): ContentFixture { return this.fixture; }
  getClass(id: string): Class | undefined { return this.fixture.classes.find((entity) => entity.id === id); }
  getSpell(id: string): Spell | undefined { return this.fixture.spells.find((entity) => entity.id === id); }
  getFeat(id: string): Feat | undefined { return this.fixture.feats.find((entity) => entity.id === id); }
  getSubclass(id: string): Subclass | undefined { return this.fixture.subclasses.find((entity) => entity.id === id); }
  getFeature(id: string): Feature | undefined { return this.fixture.features.find((entity) => entity.id === id); }
  getChoice(id: string): Choice | undefined { return this.fixture.choices.find((entity) => entity.id === id); }
  getResource(id: string): Resource | undefined { return this.fixture.resources.find((entity) => entity.id === id); }
  getItem(_id: string): Item | undefined { return undefined; }
  searchItems(_query: string): readonly Item[] { return []; }
}
/** Actionable validation error for an enabled pack graph. */
export class ContentPackValidationError extends Error {}

function entitiesFromModule(module: ContentPack['modules'][number]): PackEntity[] {
  return Object.values(module).flatMap((value) => Array.isArray(value)
    ? value.filter((entry) => entry !== null && typeof entry === 'object' && 'kind' in entry).map((entry) => packEntitySchema.parse(entry))
    : value !== null && typeof value === 'object' && 'kind' in value ? [packEntitySchema.parse(value)] : []);
}

/**
 * Load a directory-form pack after its files are read by the host. The caller
 * is responsible for byte-level SHA-256 verification; this synchronous domain
 * boundary checks the declared module shape before data becomes queryable.
 */
export function loadContentPack(
  manifestInput: unknown,
  modulesByPath: Readonly<Record<string, unknown>>,
): ContentPack {
  const manifest = contentPackManifestSchema.parse(manifestInput) as ProductionContentPackManifest;
  const expectedPaths = new Set(manifest.modules.map((descriptor) => descriptor.path));
  for (const path of Object.keys(modulesByPath)) {
    if (!expectedPaths.has(path)) throw new ContentPackValidationError(`Module ${path} is not declared in manifest ${manifest.id}.`);
  }
  const modules: ContentPackModule[] = manifest.modules.map((descriptor) => {
    const rawModule = modulesByPath[descriptor.path];
    if (rawModule === undefined) throw new ContentPackValidationError(`Manifest ${manifest.id} is missing module ${descriptor.path}.`);
    const module = contentPackModuleSchema.parse(rawModule);
    const entities = entitiesFromModule(module);
    const counts = entities.reduce<Partial<Record<PackEntity['kind'], number>>>((result, entity) => {
      result[entity.kind] = (result[entity.kind] ?? 0) + 1;
      return result;
    }, {});
    const actualKinds = Object.keys(counts).sort();
    const declaredKinds = [...descriptor.kinds].sort();
    if (actualKinds.join(',') !== declaredKinds.join(',')) throw new ContentPackValidationError(`Module ${descriptor.path} kinds do not match its manifest entry.`);
    for (const [kind, count] of Object.entries(descriptor.counts)) {
      if (counts[kind as PackEntity['kind']] !== count) throw new ContentPackValidationError(`Module ${descriptor.path} ${kind} count does not match its manifest entry.`);
    }
    return module;
  });
  return { manifest, modules };
}

/**
 * Validates and flattens enabled packs.  It is purposefully source-preserving:
 * mechanics are only available when a later canonical adapter models them.
 */
export class ComposedContentRepository {
  readonly packs: readonly ContentPack[];
  private readonly entities = new Map<string, PackEntity>();
  private readonly items: readonly Item[];

  constructor(packs: readonly unknown[]) {
    this.packs = packs.map((pack) => contentPackSchema.parse(pack));
    const packIds = new Set<string>();
    for (const pack of this.packs) {
      if (packIds.has(pack.manifest.id)) throw new ContentPackValidationError(`Duplicate enabled content pack ID: ${pack.manifest.id}`);
      packIds.add(pack.manifest.id);
      for (const module of pack.modules) {
        for (const entity of entitiesFromModule(module)) {
          if (entity.ruleset !== pack.manifest.ruleset) throw new ContentPackValidationError(`Entity ${entity.id} has ruleset ${entity.ruleset}, not ${pack.manifest.ruleset}.`);
          if (this.entities.has(entity.id)) throw new ContentPackValidationError(`Duplicate content ID: ${entity.id}`);
          this.entities.set(entity.id, entity);
        }
      }
    }
    for (const entity of this.entities.values()) {
      for (const featureId of entity.featureIds ?? []) this.requireKind(entity.id, featureId, 'feature');
      if (entity.ownerId && !this.entities.has(entity.ownerId)) throw new ContentPackValidationError(`${entity.id} references missing owner ${entity.ownerId}.`);
      if (entity.kind === 'subclass') this.requireKind(entity.id, entity.parentClassId, 'class');
      if (entity.kind === 'spell') for (const classId of entity.spellListClassIds ?? []) this.requireKind(entity.id, classId, 'class');
    }
    this.items = [...this.entities.values()]
      .filter((entity) => entity.kind === 'item')
      .map((entity) => entity as Item)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  get(id: string): PackEntity | undefined { return this.entities.get(id); }
  list(kind?: PackEntity['kind']): readonly PackEntity[] {
    return [...this.entities.values()]
      .filter((entity) => kind === undefined || entity.kind === kind)
      .sort((left, right) => left.id.localeCompare(right.id));
  }
  getItem(id: string): Item | undefined {
    const entity = this.entities.get(id);
    return entity?.kind === 'item' ? entity as Item : undefined;
  }
  searchItems(query: string): readonly Item[] {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized === '' ? this.items : this.items.filter((item) => item.name.toLocaleLowerCase().includes(normalized));
  }
  private requireKind(ownerId: string, referenceId: string | undefined, kind: PackEntity['kind']): void {
    const entity = referenceId ? this.entities.get(referenceId) : undefined;
    if (!entity || entity.kind !== kind) throw new ContentPackValidationError(`${ownerId} references missing ${kind} ${referenceId ?? '<unset>'}.`);
  }
}
