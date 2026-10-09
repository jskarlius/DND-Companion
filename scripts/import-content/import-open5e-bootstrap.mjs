#!/usr/bin/env node
/**
 * Build-time only importer for the reviewed public bootstrap pack.
 *
 * It fetches the Open5e v2 `srd-2024` document, rejects any unexpected source,
 * converts the small supported field set to our canonical schema, validates it
 * in a separate TypeScript test, then writes sorted deterministic JSON. The
 * application never invokes this script or makes a network request.
 *
 * Open5e currently labels this source "System Reference Document 5.2". That
 * exact label is retained as upstreamVersion; do not relabel it 5.2.1 unless
 * the generated data has been reconciled to the official 5.2.1 document.
 */
// Node's file APIs are used only after all remote data has been transformed.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

// The base URL and the sole approved upstream document for this importer.
const api = 'https://api.open5e.com/v2';
const documentKey = 'srd-2024';
// Existing persisted characters already reference this canonical namespace.
// The manifest's upstreamVersion keeps the Open5e source label distinct.
const canonicalNamespace = 'srd-5.2.1';
// `resolve` makes the output location absolute from the project root.
const output = resolve('content/generated/open5e-srd-2024-bootstrap.json');
// This is copied onto every generated entity, rather than trusting an API
// response to supply all of our required provenance fields.
const source = {
  title: 'System Reference Document 5.2',
  license: 'CC BY 4.0',
  url: 'https://www.dndbeyond.com/srd',
  upstreamVersion: 'Open5e document key srd-2024 (label: System Reference Document 5.2)',
  attribution: 'This work includes material from the System Reference Document 5.2 by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd, licensed under CC BY 4.0.',
};

async function fetchAll(endpoint) {
  // `endpoint` is one of "classes", "spells", or "feats". This asks Open5e
  // for up to 100 records at a time, restricted server-side to srd-2024.
  const records = [];
  let url = `${api}/${endpoint}/?document__key__in=${documentKey}&limit=100`;
  while (url) {
    // Node's built-in fetch sends the HTTPS request and waits for the JSON API
    // response. `url` becomes the API-provided next-page link below.
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${endpoint} request failed: ${response.status}`);
    const page = await response.json();
    for (const record of page.results) {
      // Defence in depth: the query asks for this source, but we also verify
      // every received record before it can enter the generated pack.
      if (record.document?.key !== documentKey || record.document?.gamesystem?.key !== '5e-2024') {
        throw new Error(`Rejected non-allowlisted ${endpoint} record: ${record.key}`);
      }
    }
    // Add this page's results, then continue until the API says there is no
    // next page. The result is every record in this endpoint/source pair.
    records.push(...page.results);
    url = page.next;
  }
  return records;
}

// Convert an upstream key such as `srd-2024_fireball` into the local portion
// of a stable app ID: `fireball`.
const slug = (value) => value.replace(/^srd-2024_/, '').replaceAll('_', '-');
// The app references this ID, never an upstream display name. Names may change;
// IDs preserve links among classes, spells, features, and characters.
const id = (kind, record) => `${canonicalNamespace}:${kind}:${slug(record.key)}`;
const titleCase = (value) => value.replace(/\b\w/g, (character) => character.toUpperCase());

// Independent endpoint requests can happen simultaneously. Each still runs
// its own pagination loop before this importer continues.
const [classes, spells, feats] = await Promise.all([fetchAll('classes'), fetchAll('spells'), fetchAll('feats')]);
// Select the parent class from the complete allowed class response.
const wizard = classes.find((entry) => entry.name === 'Wizard' && entry.subclass_of === null);
if (!wizard) throw new Error('Allowlisted Wizard class was not returned by Open5e.');

// This bootstrap pack is intentionally limited. Increasing this set is a
// conscious content-scope change, not something the API decides for us.
const supportedLevels = new Set([1, 2, 3, 4, 5]);
const wizardFeatures = wizard.features
  .filter((feature) => feature.feature_type === 'CLASS_LEVEL_FEATURE')
  .flatMap((feature) => feature.gained_at.filter(({ level }) => supportedLevels.has(level)).map(({ level }) => ({ feature, level })))
  .sort((left, right) => left.level - right.level || left.feature.name.localeCompare(right.feature.name));
// Open5e stores class-table columns as feature records. Convert the requested
// column into level -> numeric value maps our app can query directly.
const tableValues = (name) => new Map((wizard.features.find((feature) => feature.name === name)?.data_for_class_table ?? []).map(({ level, column_value }) => [level, Number(column_value)]));
const cantripTable = tableValues('Cantrips');
const preparedSpellTable = tableValues('Prepared Spells');
// Open5e exposes the two count columns above but not a structured slot table.
// This direct transcription is deliberately limited to the imported level range.
const wizardSlots = new Map([
  [1, { 1: 2 }], [2, { 1: 3 }], [3, { 1: 4, 2: 2 }],
  [4, { 1: 4, 2: 3 }], [5, { 1: 4, 2: 3, 3: 2 }],
]);

// Convert class-feature grants to the app's declarative advancement format.
// A Map both gives features stable lookup IDs and prevents duplicates.
const canonicalFeatures = new Map();
const advancement = new Map([...supportedLevels].map((level) => [level, []]));
for (const { feature, level } of wizardFeatures) {
  // ASI is a first-class grant in our rules model, not merely display text.
  if (feature.name === 'Ability Score Improvement') {
    advancement.get(level).push({ type: 'ability-score-improvement' });
    continue;
  }
  const featureId = id('feature', feature);
  canonicalFeatures.set(featureId, {
    id: featureId, name: feature.name, kind: 'feature', ruleset: '5e-2024', source,
    automation: feature.name === 'Arcane Recovery' ? 'tracked' : 'reference',
    ...(feature.name === 'Arcane Recovery' ? { resourceId: `${canonicalNamespace}:resource:wizard-arcane-recovery` } : {}),
  });
  advancement.get(level).push({ type: 'feature', featureId });
}

// Subclasses appear in the same endpoint. Select only the Wizard's Evoker
// record and express the parent relationship through the stable Wizard ID.
const evoker = classes.find((entry) => entry.name === 'Evoker' && entry.subclass_of?.key === wizard.key);
if (!evoker) throw new Error('Allowlisted Evoker subclass was not returned by Open5e.');
const evokerAdvancement = new Map([...supportedLevels].map((level) => [level, []]));
for (const feature of evoker.features.filter((entry) => entry.feature_type === 'CLASS_LEVEL_FEATURE')) {
  const featureId = id('feature', feature);
  canonicalFeatures.set(featureId, { id: featureId, name: feature.name, kind: 'feature', ruleset: '5e-2024', source, automation: 'reference' });
  for (const { level } of feature.gained_at.filter(({ level }) => supportedLevels.has(level))) evokerAdvancement.get(level).push({ type: 'feature', featureId });
}

// Narrow the full SRD spell response to the planned Wizard bootstrap subset,
// then map Open5e field names and shapes to our `Spell` entity contract.
const wizardSpells = spells
  .filter((spell) => spell.classes?.some((entry) => entry.key === wizard.key) && spell.level <= 3)
  .map((spell) => ({
    id: id('spell', spell), name: spell.name, kind: 'spell', ruleset: '5e-2024', source,
    level: spell.level, castingTime: titleCase(spell.casting_time), range: spell.range_text,
    duration: titleCase(spell.duration), components: {
      ...(spell.verbal ? { verbal: true } : {}), ...(spell.somatic ? { somatic: true } : {}),
      ...(spell.material ? { material: spell.material_specified || 'Material component' } : {}),
    }, concentration: spell.concentration, ritual: spell.ritual,
    ...(spell.desc ? { description: spell.desc } : {}),
    ...(spell.higher_level ? { higherLevelDescription: spell.higher_level } : {}),
    ...(spell.damage_roll ? { damage: spell.damage_roll } : {}),
    ...(spell.damage_types?.length ? { damageTypes: spell.damage_types } : {}),
    ...(spell.level === 0 && spell.casting_options?.some((option) => option.type?.startsWith('player_level_')) ? { scalingBasis: 'character-level' } : {}),
  }))
  .sort((left, right) => left.level - right.level || left.name.localeCompare(right.name));

// Assemble one versioned pack. It contains entities in separate collections;
// references between them use IDs (for example spellListIds), not copied data.
const pack = {
  manifest: { schemaVersion: 1, id: canonicalNamespace, name: 'Open5e SRD 2024 Wizard bootstrap', version: '2026-10-09', ruleset: '5e-2024', distribution: 'public', source },
  classes: [{
    id: id('class', wizard), name: wizard.name, kind: 'class', ruleset: '5e-2024', source,
    hitDie: Number(String(wizard.hit_dice).match(/\d+/)?.[0]), savingThrowAbilities: wizard.saving_throws.map((savingThrow) => savingThrow.name.toLowerCase()),
    spellListIds: wizardSpells.map((spell) => spell.id), spellcasting: { ability: 'intelligence', slotKind: 'spell-slots', slotRecharge: 'long-rest', progression: [...supportedLevels].map((level) => ({ level, cantripsKnown: cantripTable.get(level), preparedSpells: preparedSpellTable.get(level), slots: wizardSlots.get(level) })) },
    advancement: [...advancement].map(([level, grants]) => ({ level, grants })).filter(({ grants }) => grants.length > 0),
  }],
  subclasses: [{ id: id('subclass', evoker), name: evoker.name, kind: 'subclass', ruleset: '5e-2024', source, classId: id('class', wizard), advancement: [...evokerAdvancement].map(([level, grants]) => ({ level, grants })).filter(({ grants }) => grants.length > 0) }], features: [...canonicalFeatures.values()],
  resources: [{ id: `${canonicalNamespace}:resource:wizard-arcane-recovery`, name: 'Arcane Recovery uses', kind: 'resource', ruleset: '5e-2024', source, maximum: 1, recharge: 'long-rest' }],
  spells: wizardSpells,
  feats: feats.map((feat) => ({ id: id('feat', feat), name: feat.name, kind: 'feat', ruleset: '5e-2024', source, category: feat.type, ...(feat.prerequisite ? { prerequisite: feat.prerequisite } : {}), benefits: feat.benefits.map((benefit) => benefit.desc), automation: 'reference' })).sort((left, right) => left.name.localeCompare(right.name)),
};

// Create the output folder if necessary, then write stable, human-reviewable
// indented JSON. Nothing here is executed by the browser at runtime.
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(pack, null, 2)}\n`);
console.log(`Wrote ${output}: ${pack.spells.length} spells, ${pack.feats.length} feats.`);
