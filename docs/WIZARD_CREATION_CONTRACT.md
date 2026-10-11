# Wizard Creation Contract Review

Status: approved 2026-10-11; contract implementation in progress

This is the architecture-checkpoint review for the first supported-class
slice. It defines the reusable creation contract required to create and
advance a 2024 SRD Wizard. It authorizes implementation in the dependency
order below; the existing Wizard draft route is a constrained test checkpoint,
not completion of this contract, until species/background facts and choices
are structured, persisted, and validated.

## Recommendation

Support all nine bundled SRD species and all four bundled SRD backgrounds at
creation, but distinguish recording a feature from automating every rule in
that feature. Every mandatory selection is collected and persisted; a feature
without an approved structured effect is displayed as reference content rather
than guessed.

## Current content audit

| Content | Mandatory level-1 decisions | Shared contract needed |
| --- | --- | --- |
| Dragonborn | ancestry | source-owned choice; reference breath/resistance |
| Dwarf | none | automated maximum-HP effect; other traits reference |
| Elf | lineage, spellcasting ability, one skill | source-owned choices; non-class spell grants |
| Gnome | lineage, spellcasting ability | source-owned choice; non-class spell grants |
| Goliath | giant ancestry | source-owned choice; reference resource/effect |
| Halfling | none | reference traits |
| Human | size, one skill, one Origin Feat and any feat choices | source-owned choices; feat grants |
| Orc | none | reference resource/effect |
| Tiefling | size, legacy, spellcasting ability | source-owned choices; non-class spell grants |
| Acolyte | ability increases, equipment A/B, Magic Initiate (Cleric) choices | background equipment; feat grant; non-class spell grants |
| Criminal | ability increases, equipment A/B | background equipment; automated skill/tool grants; Alert as reference |
| Sage | ability increases, equipment A/B, Magic Initiate (Wizard) choices | background equipment; feat grant; non-class spell grants |
| Soldier | ability increases, equipment A/B, gaming-set choice | background equipment; source-owned tool choice; Savage Attacker as reference |

All four backgrounds grant two fixed skills, one fixed or selected tool, one
Origin Feat, and an equipment alternative. Their ability-score benefit is one
of two allocations among the background's listed three abilities: +2 to one
and +1 to a different one, or +1 to all three. No resulting score can exceed
20. The raw Open5e description alone is not sufficient validation data.

## Proposed persisted source of truth

Add source-qualified `speciesId` and `backgroundId` to `Character`.

Keep player decisions in owner-qualified choice records, rather than copied
descriptions or display names. Each record identifies its owning species,
background, feat, feature, or class entry, its stable choice ID, and one or
more selected stable option IDs. Character-wide selections remain only for
choices that genuinely have no content owner.

Add a general spell-grant collection separate from class-entry spell
selections. Each entry records the granting content ID, selected spell ID,
acquisition level, casting ability, preparation/always-prepared state, and
replacement history when the grant permits replacement. Wizard spellbook
ownership remains class-entry-owned and is never merged with this collection.

The creation result resolves class and background equipment packages into the
same `inventory` and currency-purse fields. It records source choices, not a
copy of item definitions.

## Currency and manual proficiency additions

Replace the gold-only `currencyGp` field with one character-owned currency
purse containing non-negative integer `cp`, `sp`, `ep`, `gp`, and `pp` values.
Starting-equipment packages use the same purse shape. The UI preserves each
denomination rather than automatically exchanging coins; a helper may expose a
total copper-piece value for display or arithmetic. Database and backup
migrations convert every existing `currencyGp` value to the `gp` field without
changing its value.

Add a separate, reversible `proficiencyOverrides` overlay rather than editing
the source grants in `proficiencies`. It supports a per-skill value of `none`,
`proficient`, or `expertise`, and a per-ability saving-throw value of `none` or
`proficient`. Each override may include an optional reason and is visibly
marked on the sheet. Resetting it restores the calculated class/background/
feature grant. This first contract covers skills and saving throws; weapons,
armor, tools, and languages have set-like add/remove behavior and require a
separate training-override design when their manual editing UI is scheduled.

## Automation boundary

The creation engine validates and persists all mandatory choices below.

| Grant type | Initial behavior |
| --- | --- |
| Background ability-score increase, skills, and tools | automated into the source character fields with calculation trace/source IDs |
| Class and background starting equipment | automated into inventory and currency |
| Dwarven Toughness | automated as a permanent maximum-HP term that scales by total character level |
| Species/background/feat granted spells | selected and persisted as non-class grants; description/reference behavior initially |
| Size, speed, senses, damage resistance, advantage, and combat-rule changes | reference unless a separate structured effect has been approved |
| Uses, recharge, durations, temporary HP, and attack effects from species features | reference initially; later tracked or automated by explicit effect contracts |
| Alert and Savage Attacker | reference initially |

Every displayed feature keeps its stable source ID and automation tier. A
reference feature is a supported record, not omitted content.

## Required reviewed pack enrichment

The generated modules currently retain these facts only as prose. Add
deterministic reviewed enrichment for:

- species/background choice entities and stable option IDs;
- background ability-score allocation rules;
- background equipment packages and selected gaming-set options;
- fixed background skill/tool grants;
- source-qualified origin-feat grants;
- species and Magic Initiate spell-grant/replacement definitions; and
- Dwarven Toughness's structured permanent maximum-HP effect.

The enrichment must be idempotent, regenerate module hashes and the import
report, and never depend on a live API at application runtime.

## Creation validation cases

- a Sage Wizard with six Wizard spellbook spells and a separately prepared
  legal subset;
- a Dwarf Wizard with the permanent maximum-HP term included in its trace;
- an Elf, Gnome, Tiefling, Acolyte, or Sage whose non-class spell grants are
  legal for the selected lineage, legacy, or feat;
- a Human Wizard with a valid extra skill and Origin Feat;
- rejection of duplicate selections, wrong-list spells, invalid score
  allocations, unavailable options, and missing equipment choices;
- cancellation performs no writes; accepted review creates one character and
  one fresh play-state record; and
- reload, duplicate, export/import, and later Wizard advancement retain every
  source-qualified reference and choice owner.

## Approved owner decisions

1. The full nine-species/four-background initial scope is supported.
2. The proposed automation boundary is approved, including reference-only
   combat traits and non-class granted spells at first.
3. The source-owned choice and non-class spell-grant contracts are approved.
4. Background ability-score allocation and background equipment are mandatory
   creation choices.
5. The five-denomination currency purse and reversible skill/saving-throw
   override overlay are approved.

After approval, update `docs/DESIGN.md` with the durable contracts, enrich the
pack deterministically, migrate persisted characters/backups, extend the pure
planner and tests, and only then build the Wizard creation route.
