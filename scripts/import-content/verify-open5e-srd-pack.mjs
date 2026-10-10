#!/usr/bin/env node
/**
 * Offline integrity check for the generated, owner-oriented SRD pack modules.
 * It verifies the manifest hashes before flattening nested owner records into
 * one graph, mirroring the later repository loader without requiring a network.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packDirectory = resolve('content/packs/srd-2024');
const ruleset = '5e-2024';
const hash = (text) => createHash('sha256').update(text, 'utf8').digest('hex');

async function readJson(path) {
  const text = await readFile(resolve(packDirectory, path), 'utf8');
  try { return { text, value: JSON.parse(text) }; }
  catch (error) { throw new Error(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`); }
}

function requireEntity(entity, path) {
  if (entity === null || typeof entity !== 'object') throw new Error(`${path} contains a non-object entity.`);
  for (const field of ['id', 'kind', 'name', 'ruleset']) if (typeof entity[field] !== 'string' || entity[field] === '') throw new Error(`${path} entity is missing ${field}.`);
  if (entity.ruleset !== ruleset) throw new Error(`${path} entity ${entity.id} has unexpected ruleset.`);
  if (!entity.source || typeof entity.source.title !== 'string' || typeof entity.source.license !== 'string') throw new Error(`${path} entity ${entity.id} has incomplete provenance.`);
}

function moduleEntities(module) {
  return Object.values(module).flatMap((value) => Array.isArray(value) ? value.filter((entry) => entry?.kind) : value?.kind ? [value] : []);
}

/** Object key order is formatting, not content; compare every count by name. */
function sameCounts(left, right) {
  const keys = new Set([...Object.keys(left ?? {}), ...Object.keys(right ?? {})]);
  return [...keys].every((key) => left?.[key] === right?.[key]);
}

async function main() {
  const { value: manifest } = await readJson('manifest.json');
  if (manifest?.schemaVersion !== 2 || manifest.id !== 'srd-2024' || manifest.ruleset !== ruleset || !Array.isArray(manifest.modules)) throw new Error('manifest.json does not identify the expected module-based SRD pack.');
  const { text: reportText, value: report } = await readJson(manifest.report.path);
  if (hash(reportText) !== manifest.report.sha256) throw new Error('import-report.json does not match its manifest SHA-256.');

  const entities = new Map();
  for (const expected of manifest.modules) {
    const { text, value: module } = await readJson(expected.path);
    if (hash(text) !== expected.sha256) throw new Error(`${expected.path} does not match its manifest SHA-256.`);
    if (module.schemaVersion !== 1 || typeof module.moduleKind !== 'string') throw new Error(`${expected.path} is not a pack module.`);
    const counts = {};
    for (const entity of moduleEntities(module)) {
      requireEntity(entity, expected.path);
      if (entities.has(entity.id)) throw new Error(`Duplicate entity ID ${entity.id} in ${expected.path}.`);
      entities.set(entity.id, entity);
      counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
    }
    if (!sameCounts(counts, expected.counts)) throw new Error(`${expected.path} entity counts differ from its manifest entry.`);
  }

  for (const entity of entities.values()) {
    for (const featureId of entity.featureIds ?? []) if (entities.get(featureId)?.kind !== 'feature') throw new Error(`${entity.id} references missing feature ${featureId}.`);
    if (entity.kind === 'subclass' && entities.get(entity.parentClassId)?.kind !== 'class') throw new Error(`${entity.id} references missing parent class ${entity.parentClassId}.`);
    if (entity.kind === 'feature' && !entities.has(entity.ownerId)) throw new Error(`${entity.id} has missing owner ${entity.ownerId}.`);
  }

  const actualCounts = {};
  for (const entity of entities.values()) actualCounts[entity.kind] = (actualCounts[entity.kind] ?? 0) + 1;
  if (!sameCounts(actualCounts, report.importedEntityCounts)) throw new Error('import-report.json entity counts are incorrect.');
  console.log(`Verified ${entities.size} entities across ${manifest.modules.length} modules in ${packDirectory}.`);
}

main().catch((error) => { console.error(`Generated SRD pack verification failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; });
