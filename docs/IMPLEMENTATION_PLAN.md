# D&D Companion Implementation Plan

Last updated: 2026-10-06

This plan breaks implementation into small, verifiable slices so routine
coding can be handed to a less intensive model. Each coding task should include
only the relevant design-document sections and should end with tests and a short
handoff note. Architecture review is reserved for the checkpoints marked below.

## Working method

For each slice:

1. Start from a clean understanding of `docs/DESIGN.md` and the slice goal.
2. Inspect existing changes and preserve unrelated user work.
3. Implement only the stated scope.
4. Run the slice's verification commands.
5. Report changed files, tests, assumptions, and remaining risks.
6. When the slice is complete, update this plan with its completion status and
   the next-session starting point.
7. Do not begin the next slice automatically when an architecture checkpoint
   is listed.

The spreadsheet is reference material, not a request to duplicate its grid.
Repeated UI data must use dynamic collections.

## Slice 0: Repository safeguards and references

Goal: prepare the repository without changing application behavior.

- Keep private imports and private references ignored by Git.
- Move `Voltash Vryn.xlsx` to `reference/private/` only after confirming the
  desired location with the owner.
- Preserve the design and implementation documents.

Acceptance:

- private staging files do not appear in `git status`;
- public documentation and directory markers do appear; and
- no workbook content is copied into source code.

## Slice 1: Vite and TypeScript migration — complete (2026-10-06)

Goal: replace the untouched Create React App tooling while retaining the same
repository and React 19 application.

- Replace `react-scripts` with Vite and TypeScript.
- Create the application entry point and minimal application shell.
- Configure Vitest and Testing Library.
- Remove only obsolete generated CRA assets after verifying their targets.
- Add `dev`, `build`, `test`, and `typecheck` scripts.

Acceptance:

- development server starts;
- production build succeeds;
- typecheck succeeds; and
- one application smoke test passes.

Completed verification: `npm run typecheck`, `npm run test`, and `npm run
build` passed; the Vite development server was started and the application shell
was confirmed in the browser.

## Architecture checkpoint A: Canonical domain contracts — complete (2026-10-06)

Before feature coding, review and approve:

- character, class-entry, play-state, and content-entity types;
- stable ID conventions;
- ruleset strategy boundaries;
- source versus derived versus overridden values; and
- multiclass level/scaling terminology.

Approved decisions:

- Support 2024 rules only. Future, explicit compatibility exceptions may cover
  2014 spells or feats without a 2024 version; classes and subclasses remain
  2024 only.
- Store final ability scores and their origin (`standard-array`, `point-buy`,
  or `custom`); retain per-level HP outcomes for fixed-average, rolled, or
  custom HP gains.
- Initially allow separate, reversible overrides for AC, maximum HP, speed,
  spell attack bonus, and spell save DC.
- Preserve play state during level-up. Long and short rest actions apply only
  their declared recovery effects, while direct adjustments remain available.
- Return traceable calculation explanations for all core derived values.

## Slice 2: Rules-engine foundation — complete (2026-10-06)

Goal: implement pure, UI-independent calculations.

- Ability modifiers and total character level.
- Per-class level lookup.
- Proficiency bonus from total level.
- Saving throws and skill proficiency/expertise.
- A generic modifier pipeline with traceable calculation explanations.
- Manual overrides kept separate from calculated values.

Acceptance:

- table-driven unit tests cover levels 1-20;
- multiclass totals are tested; and
- calculations return both a value and enough detail to explain it in the UI.

Completed verification: `npm run typecheck`, `npm run test`, and `npm run
build` passed. The test suite includes table-driven proficiency coverage for
levels 1–20, multiclass total/per-class level tests, saving throw and skill
proficiency/expertise tests, modifier-trace tests, and manual-override tests.

## Slice 3: Minimal content fixture

Goal: prove progression without importing the complete knowledge base.

- Define canonical class, subclass, feature, resource, and spell schemas.
- Add a small hand-verified 2024 Wizard fixture.
- Add a small second-class fixture specifically for multiclass tests.
- Represent ASIs/features as explicit advancement grants.
- Represent cantrip scaling basis separately from cantrips known/prepared.

Acceptance:

- fixtures validate at runtime;
- references resolve; and
- no progression logic depends on display names.

## Slice 4: Read-only dynamic character sheet

Goal: render a representative character from typed data.

- Identity and multiple class entries.
- Abilities, saves, skills, and proficiency.
- Combat and HP summary.
- Dynamic attacks, cantrips, spells, features, resources, inventory, and notes.
- Responsive sections inspired by the workbook rather than fixed spreadsheet
  coordinates.

Acceptance:

- no repeated section has a hard-coded display capacity;
- a multiclass fixture renders correctly; and
- keyboard and screen-reader labels exist for interactive-looking elements.

## Slice 5: Editable play state

Goal: support play-session interactions before persistence.

- Current HP, temporary HP, inspiration, death saves, conditions, and resources.
- Real checkbox/toggle controls for boolean values.
- Rest actions driven by recharge metadata.
- Explicit manual overrides with reset-to-calculated behavior.

Acceptance:

- state changes never alter immutable content definitions;
- removing an override restores the calculated result; and
- component tests cover the main interactions.

## Slice 6: IndexedDB persistence and backups

Goal: persist local data without a hosted service.

- Add Dexie and the versioned stores from the design document.
- Save characters and play state separately.
- Import/export versioned character JSON.
- Add database and file migrations.
- Request persistent storage and explain backup status to the user.

Acceptance:

- reload preserves edits;
- export/delete/import restores a character;
- migration tests pass; and
- the app performs no character-data network requests.

## Architecture checkpoint B: Level-up transaction

Review the proposed advancement diff format, multiclass prerequisites,
class-entry choices, combined spell-slot strategy, and rollback behavior before
implementing the workflow.

## Slice 7: Level-up and multiclass workflow

Goal: add one level to an existing class or take level 1 in another class.

- Validate ruleset-specific prerequisites.
- Distinguish total character level and target class level.
- Apply exact class advancement grants, including ASIs.
- Apply multiclass-specific initial grants/proficiencies.
- Calculate HP, proficiency, resources, cantrip scaling, and spell slots using
  their declared bases.
- Preview and atomically commit all changes.

Acceptance:

- single-class and multiclass scenarios are tested;
- proficiency changes only at total-level thresholds;
- class grants occur only at the correct class level;
- spell selection remains associated with its granting class; and
- canceling leaves the character unchanged.

## Slice 8: Content repository and public packs

Goal: unify bundled and locally installed content behind one interface.

- Add Zod validation and pack manifests.
- Load the small bundled fixture through the repository.
- Add source/ruleset filtering and reference resolution.
- Build an allowlisted Open5e v2 importer.
- Generate deterministic SRD packs after reviewing attribution output.

Acceptance:

- malformed packs fail with actionable errors;
- duplicate IDs and broken references are reported;
- application play remains independent of the live API; and
- generated output is reproducible.

## Slice 9: Private packs

Goal: install and use personally curated content locally.

- Import private pack JSON into IndexedDB.
- Add a minimal form editor for subclass features and spells.
- Add private-source labels and explicit export warnings.
- Use Bladesinger plus selected Wizard spells as the integration fixture.
- Keep PDF/OCR extraction a review-assisted development tool.

Acceptance:

- installed private content participates in character creation and level-up;
- removing a required pack reports unresolved references without corrupting the
  character; and
- private entities are not included in an ordinary public-pack export.

## Slice 10: Offline PWA and friend handoff

Goal: make installation and testing simple without a hosted database.

- Cache application assets and bundled public packs.
- Add install metadata and update behavior.
- Test offline startup and data retention.
- Document character/private-pack export and import for friends.

Acceptance:

- the installed app opens offline;
- local characters remain local; and
- a friend can install the app and import an explicitly shared backup or pack.

## Architecture checkpoint C: Product expansion

After the vertical slice is stable, decide whether to prioritize broader class
coverage, richer feature automation, print layout, document extraction, or
native packaging. A hosted backend is not assumed.

## Next session

Begin Slice 3: Minimal content fixture. Define the canonical content schemas
and fixtures needed to exercise the completed rules-engine foundation.
