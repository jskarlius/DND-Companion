#!/usr/bin/env node
/**
 * Build the reviewed Open5e SRD 2024 reference pack.
 *
 * The output deliberately mirrors how a person reviews rules: a class module
 * owns its class features and choices, spells are grouped by spell level, and
 * feats/items are grouped by their explicit upstream categories. The app never
 * contacts Open5e; this is a deliberate build-time snapshot generator only.
 */
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const apiBaseUrl = 'https://api.open5e.com/v2/';
const apiHost = new URL(apiBaseUrl).host;
const documentKey = 'srd-2024';
const rulesetKey = '5e-2024';
const packId = 'srd-2024';
const outputDirectory = resolve('content/packs/srd-2024');
const endpointByCategory = Object.freeze({ classes: 'classes', spells: 'spells', feats: 'feats', species: 'species', backgrounds: 'backgrounds', items: 'items' });
const kindByCategory = Object.freeze({ spells: 'spell', feats: 'feat', species: 'species', backgrounds: 'background', items: 'item' });

function requireString(value, description) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`Expected ${description} to be a non-empty string.`);
  return value;
}

function slug(value) {
  return requireString(value, 'slug value').trim().toLowerCase().replaceAll('&', 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'other';
}

function contentId(kind, upstreamKey) {
  const prefix = `${documentKey}_`;
  const key = requireString(upstreamKey, `${kind} upstream key`);
  if (!key.startsWith(prefix)) throw new Error(`Refused ${kind} key outside ${documentKey}: ${key}`);
  return `${packId}:${kind}:${key.slice(prefix.length).replaceAll('_', '-')}`;
}

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  return value;
}

function jsonText(value) { return `${JSON.stringify(sortJson(value), null, 2)}\n`; }
function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }

function verifiedApiUrl(value, description) {
  const url = new URL(value, apiBaseUrl);
  if (url.protocol !== 'https:' || url.host !== apiHost || !url.pathname.startsWith('/v2/')) throw new Error(`Refused unexpected ${description} URL: ${url}`);
  return url;
}

async function fetchJson(url, description) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${description} request failed with HTTP ${response.status}.`);
  return response.json();
}

async function fetchAll(endpoint) {
  const records = [];
  let nextUrl = verifiedApiUrl(`${endpoint}/?document__key__in=${documentKey}&limit=100`, endpoint);
  while (nextUrl) {
    const page = await fetchJson(nextUrl, endpoint);
    if (!Array.isArray(page.results)) throw new Error(`${endpoint} returned no results array.`);
    records.push(...page.results);
    nextUrl = page.next === null ? null : verifiedApiUrl(page.next, `${endpoint} pagination`);
  }
  return records;
}

function assertAllowedRecord(record, category) {
  if (record?.document?.key !== documentKey || record.document.gamesystem?.key !== rulesetKey) {
    throw new Error(`Rejected ${category} record outside ${documentKey}/${rulesetKey}: ${record?.key ?? '<missing key>'}`);
  }
}

function entitySource(document) {
  return {
    title: requireString(document.name, 'source document name'), license: 'CC BY 4.0', url: requireString(document.permalink, 'source document permalink'),
    upstreamVersion: `Open5e document key ${document.key} (label: ${document.name})`,
    attribution: 'This work includes material from the System Reference Document by Wizards of the Coast LLC, available under CC BY 4.0.',
  };
}

/** Reference records preserve source evidence without claiming automation. */
function referenceEntity(category, record, reference = record) {
  assertAllowedRecord(record, category);
  const kind = kindByCategory[category];
  if (!kind) throw new Error(`No entity-kind mapping exists for ${category}.`);
  const spellListClassIds = category === 'spells'
    ? (record.classes ?? []).map((entry) => contentId('class', requireString(entry.key, `${record.key} spell-list class key`))).sort()
    : undefined;
  return {
    id: contentId(kind, record.key), kind, name: requireString(record.name, `${category} name`), ruleset: rulesetKey,
    source: entitySource(record.document), ...(spellListClassIds ? { spellListClassIds } : {}), reference: sortJson(reference),
  };
}

function ownerFeature(ownerKind, ownerRecord, sourceFeature, fallbackIndex) {
  const upstreamKey = typeof sourceFeature.key === 'string' ? sourceFeature.key : `${ownerRecord.key}_${ownerKind}-feature-${fallbackIndex}`;
  return {
    id: contentId('feature', upstreamKey), kind: 'feature', name: requireString(sourceFeature.name, `${ownerRecord.key} feature name`), ruleset: rulesetKey,
    source: entitySource(ownerRecord.document), ownerId: contentId(ownerKind, ownerRecord.key), reference: sortJson(sourceFeature),
  };
}

/** Open5e stores subclasses alongside classes; emit a module for each owner. */
function classModule(record) {
  assertAllowedRecord(record, 'classes');
  const isSubclass = record.subclass_of !== null && record.subclass_of !== undefined;
  const ownerKind = isSubclass ? 'subclass' : 'class';
  const features = (record.features ?? []).map((feature, index) => ownerFeature(ownerKind, record, feature, index + 1));
  // Features have their own records, so omit their duplicated upstream list in
  // the owner reference. This keeps the generated module reviewable.
  const { features: ignoredFeatures, ...ownerReference } = record;
  const owner = {
    id: contentId(ownerKind, record.key), kind: ownerKind, name: requireString(record.name, `${ownerKind} name`), ruleset: rulesetKey,
    source: entitySource(record.document), featureIds: features.map((feature) => feature.id).sort(),
    ...(isSubclass ? { parentClassId: contentId('class', requireString(record.subclass_of?.key, `${record.key} parent class key`)) } : {}),
    reference: sortJson(ownerReference),
  };
  return {
    path: isSubclass ? `subclasses/${slug(record.subclass_of.key.replace(`${documentKey}_`, ''))}/${slug(record.key.replace(`${documentKey}_`, ''))}.json` : `classes/${slug(record.key.replace(`${documentKey}_`, ''))}.json`,
    value: { schemaVersion: 1, moduleKind: `${ownerKind}-module`, [ownerKind]: owner, features, choices: [], resources: [], equipmentPackages: [] },
  };
}

function speciesModule(record) {
  const species = referenceEntity('species', record);
  const features = (record.traits ?? []).map((trait, index) => ownerFeature('species', record, { ...trait, key: `${record.key}_trait-${trait.order ?? index + 1}` }, index + 1));
  return { path: `species/${slug(record.key.replace(`${documentKey}_`, ''))}.json`, value: { schemaVersion: 1, moduleKind: 'species-module', species, features, choices: [], resources: [] } };
}

function backgroundModule(record) {
  const background = referenceEntity('backgrounds', record);
  const features = (record.benefits ?? []).map((benefit, index) => ownerFeature('background', record, { ...benefit, key: `${record.key}_benefit-${index + 1}` }, index + 1));
  return { path: `backgrounds/${slug(record.key.replace(`${documentKey}_`, ''))}.json`, value: { schemaVersion: 1, moduleKind: 'background-module', background, features, choices: [], resources: [], equipmentPackages: [] } };
}

function groupModule(path, moduleKind, property, entities) {
  return { path, value: { schemaVersion: 1, moduleKind, [property]: entities.sort((left, right) => left.id.localeCompare(right.id)) } };
}

function groupBy(records, keyOf) {
  const groups = new Map();
  for (const record of records) {
    const key = keyOf(record);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return groups;
}

/**
 * Items are grouped only by explicit upstream type. Current Open5e responses
 * contain no structured magic/rarity field, so the script intentionally does
 * not guess whether a potion, scroll, or wondrous item is magical.
 */
function itemPath(record) {
  const categories = {
    Armor: 'armor', Weapon: 'weapons', Ammunition: 'ammunition', 'Adventuring Gear': 'adventuring-gear', Tools: 'tools', 'Equipment Pack': 'packs',
    Mount: 'mounts-and-vehicles', 'Land Vehicle': 'mounts-and-vehicles', 'Waterborne Vehicle': 'mounts-and-vehicles', 'Spellcasting Focus': 'spellcasting-focuses',
    Potion: 'potions', Scroll: 'scrolls', 'Wondrous Item': 'wondrous-items',
  };
  return categories[record.category?.name] ?? 'other';
}

async function writePack(modules, document) {
  const stagingDirectory = `${outputDirectory}.staging`;
  await rm(stagingDirectory, { recursive: true, force: true });
  await mkdir(stagingDirectory, { recursive: true });
  const manifestModules = [];
  const completedFiles = [];

  for (const module of modules.sort((left, right) => left.path.localeCompare(right.path))) {
    const text = jsonText(module.value);
    const target = resolve(stagingDirectory, module.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text);
    completedFiles.push({ path: module.path, text });
    const counts = {};
    for (const value of Object.values(module.value)) {
      if (Array.isArray(value)) {
        for (const entity of value) {
          if (entity?.kind) counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
        }
      } else if (value?.kind) {
        counts[value.kind] = (counts[value.kind] ?? 0) + 1;
      }
    }
    manifestModules.push({ path: module.path, kinds: Object.keys(counts).sort(), counts, sha256: sha256(text) });
  }

  const report = {
    schemaVersion: 1, packId, importedEntityCounts: Object.assign({}, ...manifestModules.map((module) => module.counts).flatMap((counts) => Object.entries(counts).map(([kind, count]) => ({ [kind]: count })))),
    deferredStructuredModeling: ['class and background starting-equipment alternatives', 'species and background player choices', 'feature resources and recharge rules', 'feature/feat mechanical effects', 'class spellcasting and advancement tables'],
    sourceLimitations: ['Open5e item responses for this document provide no structured magic-item or rarity field; items are grouped only by explicit type.'],
  };
  // Sum counts rather than allowing similarly named kinds to overwrite each other.
  report.importedEntityCounts = {};
  for (const module of manifestModules) for (const [kind, count] of Object.entries(module.counts)) report.importedEntityCounts[kind] = (report.importedEntityCounts[kind] ?? 0) + count;
  const reportText = jsonText(report);
  await writeFile(resolve(stagingDirectory, 'import-report.json'), reportText);
  completedFiles.push({ path: 'import-report.json', text: reportText });

  const manifest = { schemaVersion: 2, id: packId, name: 'Open5e SRD 2024 reference pack', version: requireString(document.publication_date, 'source publication date'), ruleset: rulesetKey, distribution: 'public', source: entitySource(document), modules: manifestModules, report: { path: 'import-report.json', sha256: sha256(reportText) } };
  const manifestText = jsonText(manifest);
  await writeFile(resolve(stagingDirectory, 'manifest.json'), manifestText);
  completedFiles.push({ path: 'manifest.json', text: manifestText });

  // Windows can reject a same-volume directory rename even after a successful
  // staged write (for example when antivirus briefly inspects the directory).
  // Install the completed files instead and write the manifest last: consumers
  // treat a missing manifest as an incomplete pack. The staging copy remains
  // intact until every destination file has been written successfully.
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(dirname(outputDirectory), { recursive: true });
  for (const file of completedFiles.filter((file) => file.path !== 'manifest.json')) {
    const target = resolve(outputDirectory, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.text);
  }
  await writeFile(resolve(outputDirectory, 'manifest.json'), manifestText);
  await rm(stagingDirectory, { recursive: true, force: true });
}

async function main() {
  const document = await fetchJson(verifiedApiUrl(`documents/${documentKey}/`, 'source document'), 'source document');
  if (document.key !== documentKey || document.gamesystem?.key !== rulesetKey || !document.licenses?.some((license) => license.key === 'cc-by-40')) throw new Error(`Rejected source document ${documentKey}: expected 2024 CC BY 4.0 source.`);
  const fetched = Object.fromEntries(await Promise.all(Object.entries(endpointByCategory).map(async ([category, endpoint]) => [category, await fetchAll(endpoint)])));
  for (const [category, records] of Object.entries(fetched)) for (const record of records) assertAllowedRecord(record, category);

  const modules = [
    ...fetched.classes.map(classModule), ...fetched.species.map(speciesModule), ...fetched.backgrounds.map(backgroundModule),
    ...[...groupBy(fetched.spells, (spell) => `spells/level-${spell.level}.json`).entries()].map(([path, records]) => groupModule(path, 'spell-level-module', 'spells', records.map((record) => referenceEntity('spells', record)))),
    ...[...groupBy(fetched.feats, (feat) => `feats/${({ origin: 'origin', general: 'general', 'epic boon': 'epic-boon' })[String(feat.type).toLowerCase()] ?? 'other'}.json`).entries()].map(([path, records]) => groupModule(path, 'feat-category-module', 'feats', records.map((record) => referenceEntity('feats', record)))),
    ...[...groupBy(fetched.items, (item) => `items/by-type/${itemPath(item)}.json`).entries()].map(([path, records]) => groupModule(path, 'item-type-module', 'items', records.map((record) => referenceEntity('items', record)))),
  ];
  await writePack(modules, document);
  console.log(`Wrote ${outputDirectory} (${modules.length} deterministic modules).`);
}

main().catch((error) => { console.error(`Open5e SRD import failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
