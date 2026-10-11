# D&D Companion Implementation Plan

Last updated: 2026-10-11

This is the canonical, compact plan for active work. Completed-slice detail,
superseded sequencing, and verification history live in
`docs/IMPLEMENTATION_HISTORY.md`. Read that history only when an active item
links to it or an earlier decision needs context.

## Working method

For each slice:

1. Read `docs/DESIGN.md` and this active plan.
2. Inspect and preserve unrelated working-tree changes.
3. Implement only the stated scope and run its listed verification commands.
4. Report changed files, tests, assumptions, and remaining risks.
5. When the slice is complete, update this plan with its completion status and
   the next-session starting point.
6. Stop at architecture checkpoints unless the owner explicitly asks to
   continue.

The spreadsheet is reference material, not a request to duplicate its grid.
Repeated UI data must use dynamic collections.

## Current delivery strategy - approved (2026-10-11)

Delivery proceeds as explicit, end-to-end supported-class slices. A class is
available in character creation only when its currently promised workflow is
implemented and verified; the UI must not imply that partially supported
classes are ready to play.

Shared contracts are implemented once and reused by later slices. The first
complete vertical slice is Wizard from level 0 through level 20. Fighter then
provides the initial non-caster and multiclass validation path. A daily
preparer and a known-spell caster follow before the remaining classes.

This supersedes the prior requirement to finish creation readiness for all
twelve classes before creating the route. The prior all-class groundwork is
retained as reusable data, but unsupported class-specific options remain
unavailable until their class slice begins.

## Completed foundations

- Slices 0-7 established repository safeguards, Vite/TypeScript, domain and
  rules contracts, local storage and backup migrations, responsive sheet UI,
  play-state actions, and the initial advancement workflow.
- Slice 6.75 introduced the initial bundled-content repository and deterministic
  Open5e bootstrap ingestion. See the history for its scope and provenance
  notes.
- Slice 8 has produced the deterministic full-SRD reference pack, its offline
  verifier, production loader, repository composition/indexes, application
  adapter, structured items, starting-equipment packages, and the pure
  level-0-to-level-1 draft/planner. The pack remains offline at runtime.
- The character contract persists class-entry-owned spell selections and their
  separately owned prepared state; database v8 and character-backup v6 migrate
  existing records. It also persists structured inventory, weapon/armor
  training, tools, languages, and maximum-HP inputs.

Before declaring Slice 8 complete, conduct the owner-led full-pack review in
the product checkpoint below. The Wizard slice may use the completed repository
and pack contracts; it must not introduce a second fixture-shaped content path.

## Active slice: Wizard vertical slice

Goal: support an honest, complete Wizard character from level 0 through level
20 using the production content repository and persisted character/play-state
contracts.

### Scope

- Define and approve the Wizard-specific creation contract, including the
  supported SRD species/background scope and their grants. Unsupported grants
  must be explicit, never inferred from prose.
- Implement the level-0-to-level-1 draft route, accessible review screen,
  cancellation behavior, and one-transaction persistence path for Wizard.
- Collect and validate ability scores, Wizard class choices, skills,
  proficiencies, starting equipment, initial HP, six level-1 spellbook spells,
  and independently editable daily preparations.
- Complete Wizard advancement through level 20 using the same source-qualified
  content records: subclass timing, Wizard features/resources, ASI/feat
  choices, spellbook additions, spell replacement rules, prepared-spell
  validation, and all relevant calculation traces.
- Replace gold-only currency with a five-denomination purse, and add explicit,
  reversible skill and saving-throw proficiency overrides without overwriting
  their source grants.
- Verify reload, duplication, export/import, and advancement without orphaned
  class-entry references or fixture-only values.
- Keep species/background, feat, and feature effects within the approved shared
  contracts. Add a new shared contract only when it is necessary for Wizard and
  document it in `docs/DESIGN.md` before implementation.

### Deferred from this slice

- Rogue language choices and Warlock Eldritch Invocation data/automation;
  these belong to their respective class slices.
- Non-Wizard creation routes and their class-specific grants.
- A live Open5e dependency, private-pack work, broad library search, and
  inventory-management UI.

### Acceptance

- A player can create a valid level-1 Wizard through the UI and save exactly
  one character plus fresh play state only after review.
- Wizard spellbook ownership and daily preparation are independently editable
  and remain correct through level 20 advancement.
- Every supported grant, selection, derived value, and manual override is
  traceable to character data and source-qualified repository content.
- Invalid choices display actionable validation; cancel writes nothing.
- Wizard records survive reload, duplication, export/import, and level-up.
- `npm.cmd run typecheck`, `npm.cmd run test`, `npm.cmd run build`, and
  `npm.cmd run content:verify-srd` pass.

### First task: Wizard creation-contract review

Resolve the Wizard's level-1 species/background and grant boundaries before
building the creation UI. Produce a small, reviewed matrix that identifies:

- the initial supported SRD species and backgrounds;
- each level-1 grant and whether it is automated, tracked, explicit choice, or
  unavailable;
- ability-score, skill, tool, language, feat, equipment, and HP interactions;
- required source-qualified entities and choice IDs; and
- validation cases for a complete Wizard draft.

This is an architecture checkpoint. Do not build the creation route until the
owner approves this contract. The current proposal is in
`docs/WIZARD_CREATION_CONTRACT.md`.

Implementation progress (2026-10-11): added the IndexedDB v9 migration for a
five-denomination currency purse and empty skill/saving-throw override overlay.
The calculation layer now applies that overlay without mutating source grants;
backup schemas preserve the new optional data during the migration rollout.
The sheet now exposes currency inputs and calculated/none/proficient/expertise
controls for skills plus calculated/none/proficient controls for saving throws.
The controls persist through the normal character-save path. A dedicated backup
format version and required-field cleanup remain in progress before the broader
Wizard creation migration is complete.

Owner UX revision (2026-10-11): proficiency markers are read-only during play.
One override button in each section opens an intentional edit dialog. Inside
that dialog, markers cycle none, proficient, and expertise for skills or none
and proficient for saving throws; changes apply only after explicit save.
The Ability Scores, Saving Throws, and Skills edit actions sit directly after
their title and collapse indicator, so the repeated sections share one header
alignment. The sheet uses compact status tags in a dedicated column: `E` for
expertise and `O` for an active override. This keeps long names and multiple
tags readable at narrow widths.

## Next supported-class slices

1. Fighter: complete level 0-20 non-caster progression, then verify a bounded
   Wizard/Fighter multiclass path.
2. One daily-preparation caster (Druid, Cleric, or Paladin): validate the
   distinct prepared-spell model.
3. One known-spell caster (Bard, Sorcerer, or Warlock): validate selected-spell
   progression and, for Warlock, Eldritch Invocation contracts.
4. Remaining classes, grouped only where their mechanical contracts genuinely
   overlap.

## Product checkpoint: full public-pack integration and manual testing

Before private packs, perform owner-led tests with the generated SRD pack:
creation, supported single-class and multiclass advancement, spell selection
and preparation, class/subclass choices, sheet play state, content-pack
installation/removal, backup round-trips, responsive layouts, keyboard use,
touch targets, and 200-percent zoom. Record blockers and deliberate deferrals
before approving private packs.

## Later slices

- Private packs: local import/editor, private-source labeling, export warnings,
  and Bladesinger/private-spell integration.
- Offline PWA and friend handoff.
- Tauri Windows packaging, then Android packaging.
- Native-storage decision checkpoint. IndexedDB/Dexie remains the default;
  SQLite requires measured justification and a tested migration.

See `docs/IMPLEMENTATION_HISTORY.md` for the original detailed slice scopes,
completed verification, and the full text of deferred product checkpoints.
