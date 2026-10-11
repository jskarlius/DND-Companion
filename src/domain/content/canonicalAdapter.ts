import { z } from 'zod';

import type { Ability } from '../character/types';
import type { AdvancementGrant, Background, Class, ContentFixture, Feat, Feature, Item, Species, Spell, Subclass } from './types';
import { ComposedContentRepository } from './repository';

const abilitySchema = z.enum(['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma']);
const tableValueSchema = z.object({ level: z.number().int().min(1).max(20), column_value: z.string() });
const featureReferenceSchema = z.object({
  feature_type: z.string().optional(),
  gained_at: z.array(z.object({ level: z.number().int().min(1).max(20), detail: z.string().nullable().optional() })).optional(),
  data_for_class_table: z.array(tableValueSchema).optional(),
}).passthrough();
const classReferenceSchema = z.object({
  hit_dice: z.string().regex(/^D(6|8|10|12)$/),
  saving_throws: z.array(z.object({ name: z.string() })),
  caster_type: z.string().optional(),
}).passthrough();
const spellReferenceSchema = z.object({
  level: z.number().int().min(0).max(9),
  classes: z.array(z.object({ key: z.string() })).default([]),
  casting_time: z.string().optional(), range_text: z.string().optional(), duration: z.string().optional(),
  verbal: z.boolean().optional(), somatic: z.boolean().optional(), material_specified: z.string().optional(),
  concentration: z.boolean().optional(), ritual: z.boolean().optional(), desc: z.string().optional(), higher_level: z.string().optional(),
  damage_roll: z.string().nullable().optional(), damage_types: z.array(z.string()).optional(),
}).passthrough();
const featReferenceSchema = z.object({ type: z.string().optional(), desc: z.string().optional(), prerequisite: z.string().nullable().optional(), benefits: z.array(z.object({ desc: z.string().optional() })).optional() }).passthrough();
const itemReferenceSchema = z.object({
  weapon: z.object({
    is_simple: z.boolean().optional(), is_martial: z.boolean().optional(),
    properties: z.array(z.object({ property: z.object({ name: z.string().optional(), type: z.string().optional() }).passthrough() })).optional(),
  }).nullable().optional(),
}).passthrough();

function reference<T>(value: unknown, schema: z.ZodType<T>): T | undefined {
  const result = schema.safeParse(value);
  return result.success ? result.data : undefined;
}

function ability(value: string): Ability | undefined {
  const normalized = value.toLocaleLowerCase();
  return abilitySchema.safeParse(normalized).data;
}

function tableAt(table: readonly { level: number; column_value: string }[] | undefined, level: number): number {
  const value = table?.find((entry) => entry.level === level)?.column_value;
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : 0;
}

function nonEmpty(value: string | null | undefined): string | undefined {
  return value?.trim() ? value : undefined;
}

/**
 * Converts only source fields with an unambiguous structural representation.
 * No prose is interpreted as a rule: absent choices, resources, and
 * multiclass data therefore remain absent for later reviewed enrichment.
 */
export function adaptProductionPack(repository: ComposedContentRepository): ContentFixture {
  const entities = repository.list();
  const rawFeatures = entities.filter((entity) => entity.kind === 'feature');
  const features: Feature[] = rawFeatures.map((entity) => ({
    id: entity.id, name: entity.name, kind: 'feature', ruleset: entity.ruleset, source: entity.source, automation: 'reference',
  }));
  const spells: Spell[] = entities.filter((entity) => entity.kind === 'spell').flatMap((entity) => {
    const raw = reference(entity.reference, spellReferenceSchema);
    if (!raw) return [];
    return [{
      id: entity.id, name: entity.name, kind: 'spell' as const, ruleset: entity.ruleset, source: entity.source, level: raw.level,
      castingTime: nonEmpty(raw.casting_time), range: nonEmpty(raw.range_text), duration: nonEmpty(raw.duration),
      components: raw.verbal || raw.somatic || raw.material_specified ? { verbal: raw.verbal, somatic: raw.somatic, material: raw.material_specified || undefined } : undefined,
      concentration: raw.concentration, ritual: raw.ritual, description: nonEmpty(raw.desc), higherLevelDescription: nonEmpty(raw.higher_level),
      damage: nonEmpty(raw.damage_roll), damageTypes: raw.damage_types?.filter((type) => type.trim() !== ''),
    }];
  });
  const spellIdsByClass = new Map<string, string[]>();
  for (const entity of entities.filter((entry) => entry.kind === 'spell')) {
    const classIds = entity.spellListClassIds ?? [];
    for (const classId of classIds) if (entities.some((candidate) => candidate.id === classId && candidate.kind === 'class')) {
      spellIdsByClass.set(classId, [...(spellIdsByClass.get(classId) ?? []), entity.id]);
    }
  }
  const makeAdvancement = (ownerId: string): Class['advancement'] => Array.from({ length: 20 }, (_, index) => {
    const level = index + 1;
    const grants: AdvancementGrant[] = rawFeatures.flatMap<AdvancementGrant>((feature) => {
      if (feature.ownerId !== ownerId) return [];
      const raw = reference(feature.reference, featureReferenceSchema);
      if (!raw?.gained_at?.some((gain) => gain.level === level)) return [];
      return feature.name === 'Ability Score Improvement'
        ? [{ type: 'ability-score-improvement' as const }]
        : [{ type: 'feature' as const, featureId: feature.id }];
    });
    return { level, grants };
  });
  const classes: Class[] = entities.filter((entity) => entity.kind === 'class').flatMap((entity) => {
    const raw = reference(entity.reference, classReferenceSchema);
    if (!raw) return [];
    const savingThrowAbilities = raw.saving_throws.map((entry) => ability(entry.name)).filter((entry): entry is Ability => entry !== undefined);
    if (savingThrowAbilities.length === 0) return [];
    const ownerFeatures = rawFeatures.filter((feature) => feature.ownerId === entity.id);
    const table = (name: string) => reference(ownerFeatures.find((feature) => feature.name === name)?.reference, featureReferenceSchema)?.data_for_class_table;
    const slotTables = Array.from({ length: 9 }, (_, index) => table(`${index + 1}${index === 0 ? 'st' : index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`));
    const caster = raw.caster_type && raw.caster_type !== 'NONE';
    return [{
      id: entity.id, name: entity.name, kind: 'class' as const, ruleset: entity.ruleset, source: entity.source,
      hitDie: Number(raw.hit_dice.slice(1)), savingThrowAbilities, spellListIds: spellIdsByClass.get(entity.id) ?? [],
      startingEquipmentPackages: entity.equipmentPackages ?? [],
      subclassSelectionLevel: ownerFeatures.some((feature) => feature.name.endsWith(' Subclass')) ? 3 : undefined,
      advancement: makeAdvancement(entity.id),
      spellcasting: caster ? {
        ability: entity.name === 'Cleric' || entity.name === 'Druid' || entity.name === 'Ranger' ? 'wisdom' : entity.name === 'Bard' || entity.name === 'Paladin' || entity.name === 'Sorcerer' || entity.name === 'Warlock' ? 'charisma' : 'intelligence',
        slotKind: raw.caster_type === 'PACT' ? 'pact-magic' : 'spell-slots', slotRecharge: raw.caster_type === 'PACT' ? 'short-rest' : 'long-rest',
        selectionMode: entity.name === 'Wizard' ? 'known-and-prepared' : entity.name === 'Bard' || entity.name === 'Sorcerer' ? 'level-up-list' : 'prepared-from-list',
        multiclassContribution: raw.caster_type === 'FULL' ? 'full' : raw.caster_type === 'HALF' ? 'half-round-up' : 'none',
        progression: Array.from({ length: 20 }, (_, index) => ({ level: index + 1, cantripsKnown: tableAt(table('Cantrips'), index + 1), preparedSpells: tableAt(table('Prepared Spells'), index + 1), slots: Object.fromEntries(slotTables.map((slots, slotIndex) => [slotIndex + 1, tableAt(slots, index + 1)]).filter(([, count]) => count > 0)) })),
      } : undefined,
    }];
  });
  const subclasses: Subclass[] = entities.filter((entity) => entity.kind === 'subclass' && entity.parentClassId).map((entity) => ({
    id: entity.id, name: entity.name, kind: 'subclass', ruleset: entity.ruleset, source: entity.source, classId: entity.parentClassId!, advancement: makeAdvancement(entity.id),
  }));
  const feats: Feat[] = entities.filter((entity) => entity.kind === 'feat').map((entity) => {
    const raw = reference(entity.reference, featReferenceSchema);
    return {
      id: entity.id, name: entity.name, kind: 'feat', ruleset: entity.ruleset, source: entity.source,
      category: nonEmpty(raw?.type) ?? 'Other', prerequisite: nonEmpty(raw?.prerequisite),
      benefits: [raw?.benefits?.flatMap((benefit) => {
        const description = nonEmpty(benefit.desc);
        return description ? [description] : [];
      }).join(' ') ?? nonEmpty(raw?.desc)].filter((benefit): benefit is string => Boolean(benefit)), automation: 'reference',
    };
  });
  const species: Species[] = entities.filter((entity) => entity.kind === 'species').map((entity) => ({
    id: entity.id, name: entity.name, kind: 'species', ruleset: entity.ruleset, source: entity.source,
    featureIds: entity.featureIds ?? rawFeatures.filter((feature) => feature.ownerId === entity.id).map((feature) => feature.id),
    creation: entity.creation,
  }));
  const backgrounds: Background[] = entities.filter((entity) => entity.kind === 'background').map((entity) => ({
    id: entity.id, name: entity.name, kind: 'background', ruleset: entity.ruleset, source: entity.source,
    featureIds: entity.featureIds ?? rawFeatures.filter((feature) => feature.ownerId === entity.id).map((feature) => feature.id),
    creation: entity.creation,
  }));
  // Only source fields that are already structured become creation metadata;
  // this never attempts to infer weapon properties from item prose.
  const items: Item[] = entities.filter((entity) => entity.kind === 'item').map((entity) => {
    const raw = reference(entity.reference, itemReferenceSchema);
    const weapon = raw?.weapon;
    const training = weapon?.is_simple ? 'simple' as const : weapon?.is_martial ? 'martial' as const : undefined;
    return {
      ...entity,
      ...(training ? {
        weapon: {
          training,
          properties: weapon?.properties?.flatMap((entry) => entry.property.name ? [entry.property.name.toLocaleLowerCase()] : []) ?? [],
          mastery: weapon?.properties?.find((entry) => entry.property.type === 'Mastery')?.property.name?.toLocaleLowerCase(),
        },
      } : {}),
    } as Item;
  });
  return {
    manifest: repository.packs[0]!.manifest, classes, subclasses, features, choices: [], resources: [], spells,
    feats, species, backgrounds,
    items,
  };
}
