#!/usr/bin/env node
/**
 * Upgrade an already-generated public pack to the spell-list relationship
 * introduced by the production ContentPack contract. This is intentionally
 * deterministic so its output can be reviewed with the normal pack verifier.
 */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packDirectory = resolve('content/packs/srd-2024');

function sortJson(value) {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortJson(value[key])]));
  return value;
}

function text(value) { return `${JSON.stringify(sortJson(value), null, 2)}\n`; }
function sha256(value) { return createHash('sha256').update(value, 'utf8').digest('hex'); }

function classId(upstreamKey) {
  if (typeof upstreamKey !== 'string' || !upstreamKey.startsWith('srd-2024_')) throw new Error(`Invalid spell-list class key: ${String(upstreamKey)}.`);
  return `srd-2024:class:${upstreamKey.slice('srd-2024_'.length).replaceAll('_', '-')}`;
}

const manifestPath = resolve(packDirectory, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const descriptor of manifest.modules) {
  if (!descriptor.kinds.includes('spell')) continue;
  const path = resolve(packDirectory, descriptor.path);
  const module = JSON.parse(await readFile(path, 'utf8'));
  module.spells = module.spells.map((spell) => ({
    ...spell,
    spellListClassIds: [...new Set((spell.reference?.classes ?? []).map((entry) => classId(entry.key)))].sort(),
  }));
  const moduleText = text(module);
  await writeFile(path, moduleText);
  descriptor.sha256 = sha256(moduleText);
}
await writeFile(manifestPath, text(manifest));
