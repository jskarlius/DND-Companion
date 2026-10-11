#!/usr/bin/env node
/**
 * Applies reviewed SRD starting-equipment facts to an already-generated pack.
 * This deliberately consumes no network data: the choices below were reviewed
 * against the SRD class tables and retain item IDs rather than copied prose.
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('content/packs/srd-2024');
const item = (itemId, quantity = 1) => ({ type: 'item', itemId: `srd-2024:item:${itemId}`, quantity });
const chosen = (choiceId) => ({ type: 'chosen-item', choiceId, quantity: 1 });
const packageOf = (id, currencyGp, entries) => ({ id, currencyGp, entries });
const packages = {
  barbarian: [packageOf('a', 15, [item('greataxe'), item('handaxe', 4), item('explorers-pack')]), packageOf('b', 75, [])],
  bard: [packageOf('a', 19, [item('leather-armor'), item('dagger', 2), chosen('musical-instrument'), item('entertainers-pack')]), packageOf('b', 90, [])],
  cleric: [packageOf('a', 7, [item('chain-shirt'), item('shield'), item('mace'), chosen('holy-symbol'), item('priests-pack')]), packageOf('b', 110, [])],
  druid: [packageOf('a', 9, [item('leather-armor'), item('shield'), item('sickle'), item('quarterstaff'), item('explorers-pack'), item('herbalism-kit')]), packageOf('b', 50, [])],
  fighter: [packageOf('a', 4, [item('chain-mail'), item('greatsword'), item('flail'), item('javelin', 8), item('dungeoneers-pack')]), packageOf('b', 11, [item('studded-leather-armor'), item('scimitar'), item('shortsword'), item('longbow'), item('arrows-20'), item('quiver'), item('dungeoneers-pack')]), packageOf('c', 155, [])],
  monk: [packageOf('a', 11, [item('spear'), item('dagger', 5), chosen('tool-proficiency'), item('explorers-pack')]), packageOf('b', 50, [])],
  paladin: [packageOf('a', 9, [item('chain-mail'), item('shield'), item('longsword'), item('javelin', 6), chosen('holy-symbol'), item('priests-pack')]), packageOf('b', 150, [])],
  ranger: [packageOf('a', 7, [item('studded-leather-armor'), item('scimitar'), item('shortsword'), item('longbow'), item('arrows-20'), item('quiver'), item('druidic-focus-sprig-of-mistletoe'), item('explorers-pack')]), packageOf('b', 150, [])],
  rogue: [packageOf('a', 8, [item('leather-armor'), item('dagger', 2), item('shortsword'), item('shortbow'), item('arrows-20'), item('quiver'), item('thieves-tools'), item('burglars-pack')]), packageOf('b', 100, [])],
  sorcerer: [packageOf('a', 28, [item('spear'), item('dagger', 2), item('arcane-focus-crystal'), item('dungeoneers-pack')]), packageOf('b', 50, [])],
  warlock: [packageOf('a', 15, [item('leather-armor'), item('sickle'), item('dagger', 2), item('arcane-focus-orb'), item('book'), item('scholars-pack')]), packageOf('b', 100, [])],
  wizard: [packageOf('a', 5, [item('dagger', 2), item('quarterstaff'), item('robe'), item('spellbook'), item('scholars-pack')]), packageOf('b', 55, [])],
};

const backgroundProfiles = {
  acolyte: { skillGrants: ['insight', 'religion'], toolGrants: ['srd-2024:item:calligraphers-supplies'], abilityScoreOptions: ['intelligence', 'wisdom', 'charisma'], featIds: ['srd-2024:feat:magic-initiate'], spellGrants: [{ id: 'magic-initiate-cleric', spellListClassId: 'srd-2024:class:cleric', cantripCount: 2, spellCount: 1, spellLevel: 1, castingAbilityChoiceId: 'magic-initiate-ability', replacement: 'on-level-up' }], choices: [], equipmentPackages: [packageOf('a', 8, [item('calligraphers-supplies'), item('book'), chosen('holy-symbol'), item('parchment', 10), item('robe')]), packageOf('b', 50, [])] },
  criminal: { skillGrants: ['sleightOfHand', 'stealth'], toolGrants: ['srd-2024:item:thieves-tools'], abilityScoreOptions: ['dexterity', 'constitution', 'intelligence'], featIds: ['srd-2024:feat:alert'], choices: [], equipmentPackages: [packageOf('a', 16, [item('dagger', 2), item('thieves-tools'), item('crowbar'), item('pouch', 2), item('clothes-travelers')]), packageOf('b', 50, [])] },
  sage: { skillGrants: ['arcana', 'history'], toolGrants: ['srd-2024:item:calligraphers-supplies'], abilityScoreOptions: ['constitution', 'intelligence', 'wisdom'], featIds: ['srd-2024:feat:magic-initiate'], spellGrants: [{ id: 'magic-initiate-wizard', spellListClassId: 'srd-2024:class:wizard', cantripCount: 2, spellCount: 1, spellLevel: 1, castingAbilityChoiceId: 'magic-initiate-ability', replacement: 'on-level-up' }], choices: [], equipmentPackages: [packageOf('a', 8, [item('quarterstaff'), item('calligraphers-supplies'), item('book'), item('parchment', 8), item('robe')]), packageOf('b', 50, [])] },
  soldier: { skillGrants: ['athletics', 'intimidation'], toolGrants: [], abilityScoreOptions: ['strength', 'dexterity', 'constitution'], featIds: ['srd-2024:feat:savage-attacker'], choices: [{ id: 'gaming-set', label: 'Gaming Set', count: 1, optionIds: ['srd-2024:item:gaming-set-dice', 'srd-2024:item:gaming-set-dragonchess', 'srd-2024:item:gaming-set-playing-cards', 'srd-2024:item:gaming-set-three-dragon-ante'] }], equipmentPackages: [packageOf('a', 14, [item('spear'), item('shortbow'), item('arrows-20'), chosen('gaming-set'), item('healers-kit'), item('quiver'), item('clothes-travelers')]), packageOf('b', 50, [])] },
};

// These are the initial no-choice species slice. Traits needing an additional
// lineage, feat, spell, or ancestry choice stay unavailable until their
// source-owned choice contract is implemented.
const speciesTraits = {
  dwarf: { size: 'Medium', speed: 30, senses: ['Darkvision 120 ft.'], damageResistances: ['Poison'], maximumHpPerCharacterLevel: 1 },
  halfling: { size: 'Small', speed: 30, senses: [], damageResistances: [] },
  orc: { size: 'Medium', speed: 30, senses: ['Darkvision 120 ft.'], damageResistances: [] },
  goliath: { size: 'Medium', speed: 35, senses: [], damageResistances: [] },
};
const speciesChoices = {
  goliath: [{ id: 'giant-ancestry', label: 'Giant Ancestry', options: [
    ['cloud', "Cloud's Jaunt", 'Bonus Action: teleport up to 30 feet to an unoccupied space you can see.'],
    ['fire', "Fire's Burn", 'When you hit with an attack roll and deal damage, deal an extra 1d10 Fire damage.'],
    ['frost', "Frost's Chill", 'When you hit with an attack roll and deal damage, deal an extra 1d6 Cold damage and reduce the target’s Speed by 10 feet until your next turn.'],
    ['hill', "Hill's Tumble", 'When you hit a Large or smaller creature with an attack roll and deal damage, you can give it the Prone condition.'],
    ['stone', "Stone's Endurance", 'Reaction when you take damage: roll 1d12 + your Constitution modifier and reduce the damage by that total.'],
    ['storm', "Storm's Thunder", 'Reaction when a creature within 60 feet damages you: deal 1d8 Thunder damage to it.'],
  ].map(([id, label, description]) => ({ id, label, description, resource: { recharge: 'long-rest', maximum: 'proficiency-bonus' } })) }],
};

const sort = (value) => Array.isArray(value) ? value.map(sort) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sort(value[key])])) : value;
const text = (value) => `${JSON.stringify(sort(value), null, 2)}\n`;
const hash = (value) => createHash('sha256').update(value, 'utf8').digest('hex');
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
const writeJson = async (path, value) => writeFile(join(root, path), text(value));
const entities = (module) => Object.values(module).flatMap((value) => Array.isArray(value) ? value.filter((entry) => entry?.kind) : value?.kind ? [value] : []);

const classPaths = (await readdir(join(root, 'classes'))).filter((name) => name.endsWith('.json')).map((name) => `classes/${name}`);
for (const path of classPaths) {
  const module = await readJson(path);
  const key = module.class.id.split(':').at(-1);
  module.class.equipmentPackages = packages[key];
  if (!module.class.equipmentPackages) throw new Error(`No reviewed equipment package for ${module.class.id}.`);
  delete module.equipmentPackages;
  await writeJson(path, module);
}

const backgroundPaths = (await readdir(join(root, 'backgrounds'))).filter((name) => name.endsWith('.json')).map((name) => `backgrounds/${name}`);
for (const path of backgroundPaths) {
  const module = await readJson(path);
  const key = module.background.id.split(':').at(-1);
  const profile = backgroundProfiles[key];
  if (!profile) throw new Error(`No reviewed background profile for ${module.background.id}.`);
  module.background.creation = profile;
  module.background.equipmentPackages = profile.equipmentPackages;
  await writeJson(path, module);
}

const speciesPaths = (await readdir(join(root, 'species'))).filter((name) => name.endsWith('.json')).map((name) => `species/${name}`);
for (const path of speciesPaths) {
  const module = await readJson(path);
  const key = module.species.id.split(':').at(-1);
  if (speciesTraits[key]) module.species.traits = speciesTraits[key];
  if (speciesChoices[key]) module.species.choices = speciesChoices[key];
  await writeJson(path, module);
}

const focusPath = 'items/by-type/spellcasting-focuses.json';
const focusModule = await readJson(focusPath);
const source = focusModule.items[0]?.source;
if (!source) throw new Error('Spellcasting focus module has no source metadata.');
for (const [id, name] of [['arcane-focus-crystal', 'Arcane Focus, Crystal'], ['arcane-focus-orb', 'Arcane Focus, Orb'], ['spellbook', 'Spellbook']]) {
  if (!focusModule.items.some((entry) => entry.id === `srd-2024:item:${id}`)) focusModule.items.push({ id: `srd-2024:item:${id}`, kind: 'item', name, ruleset: '5e-2024', source, reference: { reviewedStartingEquipmentItem: true } });
}
await writeJson(focusPath, focusModule);

const manifest = await readJson('manifest.json');
for (const descriptor of manifest.modules) {
  const raw = await readFile(join(root, descriptor.path), 'utf8');
  const value = JSON.parse(raw);
  const counts = {};
  for (const entity of entities(value)) counts[entity.kind] = (counts[entity.kind] ?? 0) + 1;
  descriptor.counts = counts;
  descriptor.kinds = Object.keys(counts).sort();
  descriptor.sha256 = hash(raw);
}
const report = await readJson('import-report.json');
report.deferredStructuredModeling = report.deferredStructuredModeling.filter((item) => item !== 'class and background starting-equipment alternatives');
report.deferredStructuredModeling = report.deferredStructuredModeling.filter((item) => item !== 'background starting-equipment alternatives');
report.importedEntityCounts = {};
for (const descriptor of manifest.modules) for (const [kind, count] of Object.entries(descriptor.counts)) report.importedEntityCounts[kind] = (report.importedEntityCounts[kind] ?? 0) + count;
await writeJson('import-report.json', report);
manifest.report.sha256 = hash(text(report));
await writeJson('manifest.json', manifest);
console.log(`Applied reviewed creation data to ${classPaths.length} class, ${backgroundPaths.length} background, and ${Object.keys(speciesTraits).length} species modules.`);
