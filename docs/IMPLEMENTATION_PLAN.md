# D&D Companion Implementation Plan

Last updated: 2026-10-07

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

## Slice 3: Minimal content fixture — complete (2026-10-07)

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

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. The minimal 2024 Wizard and Fighter fixture uses
stable source-qualified IDs, validates through Zod at runtime, and includes
cross-reference tests for duplicate or missing content and display-name
independence.

## Slice 4: Read-only dynamic character sheet — complete (2026-10-07)

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

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. The public synthetic Wizard 2/Fighter 2 fixture
renders dynamic class, attack, cantrip, spell, feature, resource, inventory,
and note collections through a typed character-sheet view model. Component
tests cover multiclass rendering, accessible proficiency markers, and local
Sheet/Character/Inventory tab panels; the character summary stays visible above
the selected tab. The Character tab provides an appearance/portrait placeholder,
backstory, and general notes; image persistence is deferred to Slice 6.

## Slice 5: Editable play state — complete (2026-10-07)

Goal: support play-session interactions before persistence.

- Current HP, temporary HP, inspiration, death saves, conditions, and resources.
- Real checkbox/toggle controls for boolean values.
- Rest actions driven by recharge metadata.
- Explicit manual overrides with reset-to-calculated behavior.

Acceptance:

- state changes never alter immutable content definitions;
- removing an override restores the calculated result; and
- component tests cover the main interactions.

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. The representative sheet now manages an in-memory,
separate play-state draft with accessible HP, inspiration, death-save,
condition, and resource controls. Short and long rests use resource recharge
metadata, while manual overrides remain explicit and reset to their calculated
values without mutating the fixture or content definitions.

## Slice 6: IndexedDB persistence and backups — complete (2026-10-07)

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

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. Dexie stores permanent character decisions and
temporary play state separately, while a repository keeps storage details out
of the UI and domain modules. Versioned character JSON exports validate before
import, and both backup-file and IndexedDB migrations add the later Aid
maximum-HP field without altering other values. Tests cover database reopen
persistence, export/delete/import restoration, and both migration paths. The
app requests persistent browser storage where available and shows local backup
guidance; no character-data network request is introduced.

## Slice 6.25: UI design-system foundation â€” complete (2026-10-08)

Goal: establish a professional, accessible component and styling foundation
before the application expands to multiple screens.

- Add Tailwind CSS using the Vite integration.
- Add and configure selected shadcn/ui primitives as owned source code.
- Define semantic color, typography, spacing, radius, shadow, focus, and state
  tokens following `docs/UI_DESIGN.md`.
- Bundle any selected fonts and icons locally; do not add runtime CDN
  dependencies.
- Extract generic Button, form-control, Tabs, Dialog/AlertDialog, Tooltip,
  Badge, Card, and Separator primitives only as they are needed.
- Refactor the existing sheet incrementally so D&D-specific components retain
  their meaning and behavior.
- Split the monolithic character-sheet presentation into focused components
  without moving domain logic into the UI layer.
- Make each character-sheet section independently collapsible with an
  accessible disclosure control. Movable/reorderable widgets are explicitly
  deferred to a future, separately scoped layout-customization slice.

Acceptance:

- the existing character-sheet workflows and automated tests still pass;
- generic controls have consistent default, hover, focus, active, disabled,
  and destructive states;
- dialogs trap and restore focus and can be dismissed by keyboard where
  appropriate;
- tabs implement expected keyboard navigation;
- semantic tokens, rather than repeated literal values, control the theme;
- the production build has no font, icon, or component CDN requirement; and
- `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` pass.

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. Tailwind CSS now compiles through the Vite plugin,
with semantic field-guide tokens derived from `docs/TECH_STACK_GUIDE.html` and
no runtime CDN dependency. The project owns its generic Button, Checkbox,
Tabs, Dialog, Tooltip, Badge, Card, and Separator source, with Radix providing
dialog focus trapping/Escape dismissal and tab semantics. The sheet now uses
the owned Dialog and Tabs primitives, has accessible collapsible sections,
keyboard tab navigation, compact ability abbreviations, and a responsive
field-guide visual layer with a persistent light/dark theme preference.
Movable/reorderable widgets remain explicitly
deferred to a future layout-customization slice.

## Slice 6.5: Character library and application navigation

Goal: make the home screen the entry point for multiple locally stored
characters and future application features.

- Add a home/library route that lists locally stored characters.
- Open a character sheet by stable character ID rather than a hard-coded
  fixture.
- Provide create, duplicate, delete, import, and export entry points; the
  creation workflow may begin with a minimal valid character before it gains
  the full guided choice flow.
- Add React Router only for the home and character-sheet routes required by
  this slice.
- Show an empty-library state and a recent-character affordance.
- Build new screens and actions from the Slice 6.25 tokens and primitives.
- Include deliberate loading, empty, unknown-character, error, and destructive
  confirmation states for manual UI review.

Acceptance:

- multiple characters can be opened independently and retain distinct play
  state;
- direct navigation to a valid character ID loads its sheet, while an unknown
  ID is handled gracefully; and
- deleting a character never removes unrelated characters or content packs;
- the library and character sheet remain usable at the representative widths
  in `docs/UI_DESIGN.md`; and
- the UI product checkpoint can be exercised without fixture-only shortcuts.

## Product checkpoint: UI foundation and navigation

Stop before the level-up architecture checkpoint. The owner performs the full
manual review in `docs/UI_DESIGN.md` and reports visual, responsive, keyboard,
and usability feedback.

- Classify reports as blocker, usability, polish, preference, or new product
  scope.
- Implement accepted UI fixes as a bounded review-adjustment pass.
- Add regression tests for behavioral and accessibility defects where useful.
- Record intentionally deferred items under the most relevant future slice.
- Re-run typecheck, tests, build, and the affected manual scenarios.

This checkpoint is complete only after blocker and serious accessibility issues
are resolved and the owner explicitly approves proceeding. New domain features
found during review do not expand the polish pass automatically.

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
- Define item entities and searchable repository queries for inventory.
- Build an allowlisted Open5e v2 importer.
- Generate deterministic SRD packs after reviewing attribution output.

Acceptance:

- malformed packs fail with actionable errors;
- duplicate IDs and broken references are reported;
- application play remains independent of the live API; and
- generated output is reproducible.

## Later inventory-management follow-on (after Slice 8)

Goal: turn the read-only Inventory tab into a structured, editable collection.

- Add items by searching enabled public/private packs.
- Permit standalone local custom items with a name, quantity, and notes.
- Add per-entry notes and, when the item model supports them, worn/equipped,
  attuned, and charge state.
- Resolve class/background starting-equipment choices during character creation;
  multiclass entries do not re-grant starting equipment.

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

## Architecture checkpoint C: Native packaging readiness

After Slice 10 is stable, review the native plan in
`docs/NATIVE_PACKAGING.md` before adding Tauri. Confirm:

- PWA persistence and backup formats are stable and tested;
- storage is accessed through repository interfaces rather than directly from
  React components or domain code;
- Windows package identity and Android application ID;
- the minimum native file-dialog/filesystem capabilities required for
  import/export;
- release-signing and secret-backup responsibilities; and
- a representative device list for Windows and Android testing.

Do not introduce SQLite or native inference at this checkpoint.

## Slice 11: Tauri Windows packaging

Goal: package the existing offline application for Windows without changing its
domain model or introducing a hosted service.

- Add a Tauri 2 shell around the existing Vite production build.
- Preserve the normal browser/PWA build as a supported target.
- Configure a stable application identifier, version, icons, and Windows build
  artifact.
- Add only the native permissions required for explicit import/export dialogs.
- Keep IndexedDB/Dexie as the first native persistence implementation.
- Document local development and release-build commands.

Acceptance:

- a Windows release artifact builds and launches without a development server;
- the application starts and remains usable offline;
- characters and packs survive application restart and an upgrade test;
- character, pack, and full-backup import/export work through native dialogs;
- no private pack, character, reference file, or model is embedded in the
  artifact; and
- the web/PWA build and its automated tests continue to pass.

## Slice 12: Tauri Android packaging

Goal: package the same application as an Android APK after the Windows shell is
stable.

- Initialize the Tauri Android target and document required SDK/NDK tooling.
- Configure a stable Android application ID, versioning, icons, and signing
  workflow without committing signing secrets.
- Verify responsive character-sheet and library behavior in Android WebView.
- Adapt import/export to the Android document-picker/file-sharing workflow.
- Keep IndexedDB/Dexie unless the following storage checkpoint approves a
  change.

Acceptance:

- a release-capable APK builds and installs on at least one representative
  physical device;
- the application launches and performs its core workflows offline;
- local data survives restart and an application upgrade test;
- character, pack, and full-backup import/export work on-device;
- uninstall/data-removal behavior is documented; and
- Windows and web/PWA targets remain functional.

## Architecture checkpoint D: Native storage decision

Compare IndexedDB/Dexie on the tested Windows and Android packages against the
actual content volume, search latency, backup behavior, upgrade behavior, and
operational complexity.

Continue with IndexedDB by default. Approve a separate SQLite-adapter slice only
if measurements demonstrate a material benefit. Any SQLite work must retain the
same repository contracts and versioned interchange formats and include a
tested IndexedDB-to-SQLite migration path. PostgreSQL and hosted synchronization
remain out of scope.

The local knowledge assistant is a parked idea in `docs/RAG_IDEA.md`; it has no
implementation slice or delivery commitment.

## Next session

Begin Slice 6.5: Character library and application navigation. Add the library
and character routes, then introduce the tech-guide-inspired responsive
application shell: Library is the primary navigation destination; the active
character is contextual rather than a duplicate sidebar destination.
