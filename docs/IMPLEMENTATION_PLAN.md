# D&D Companion Implementation Plan

Last updated: 2026-10-08

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

## Slice 6.5: Character library and application navigation â€” complete (2026-10-08)

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

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test`, and
`npm.cmd run build` passed. The home route now lists IndexedDB-backed
characters, with empty, loading, missing-character, storage-error, and
delete-confirmation states. Characters open by stable ID, and the library
provides creation of a minimal valid character, duplicate, import, export, and
delete actions. The responsive application shell uses a sidebar on wider
screens and a compact navigation layout on narrow screens; the current
character remains contextual rather than a duplicate navigation destination.

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

Review adjustment pass (2026-10-08):

- **Correctness:** the headline Hit Dice display now derives every die group
  from the character's current class entries. A newly created level-1 Wizard
  therefore shows `1d6`, not the representative fixture's multiclass value.
- **Collapsible sections:** Character and Inventory no longer retain an empty,
  fixed-height card after their content is collapsed.
- **Multiclass responsiveness:** class entries in the identity summary can
  wrap across the full summary width, including four or more classes, without
  forcing the species, background, or player fields off-screen.
- **Spell density:** spells now group dynamically by level. Each group keeps
  its slot total and used count compactly beside the level, lists its spells
  beneath it with a persisted Prepared checkbox, and shows casting time/range
  when the content record supplies them. Spell attack bonus and save DC appear
  at the top of the same section. Full spell-description content remains a
  future content-pack concern.
- **Spellbook navigation:** a character now receives a dedicated Spells tab
  only when one of their current classes declares Spellcasting or Pact Magic.
  The tab uses independently collapsible level groups, a responsive three/two/
  one-column layout, spellcasting ability, and compact casting metadata
  (time, range, components, duration, concentration, and ritual). Cantrips
  have no preparation control. The tab reports current cantrip, known-spell,
  and prepared-spell counts; progression-derived permitted maxima are deferred
  until the level-up workflow can calculate them accurately. Pact Magic is modeled as a distinct slot kind
  with short-rest recovery metadata; its source-distinct slot calculation and
  recovery remain part of the level-up transaction work rather than sharing
  the current generic spell-slot counter.
- **Play-state density:** the Conditions/status area now spans the wide row,
  with compact Death Saves and unchanged rest actions beneath it. This prevents
  the condition entry control from collapsing beside three narrow panels.
- **Condition entry:** the Add action now sits beside the Condition label,
  above a visible full-width input. Death Saves uses the same section-label and
  body-text scale as Status and Rest.
- **Polish/performance:** the character sheet and backup validators now load on
  demand. The initial production JavaScript chunk is 447.38 kB (145.45 kB
  gzip), with the sheet and validation code in smaller deferred chunks; Vite's
  500 kB chunk warning no longer appears.
- **Deployment usability:** routing now uses hash URLs so direct character links
  work on static hosts without a provider-specific SPA fallback rule. A future
  host may restore path-based URLs after its rewrite behavior is configured.
- **Design-system acceptance:** Newsreader and Source Sans 3 variable fonts are
  bundled locally with Latin and Latin Extended subsets. No runtime font CDN is
  required.
- **Usability:** the library has distinct loading and storage-error states
  instead of briefly presenting the empty-library call to action while
  IndexedDB is still loading.
- **Responsive usability:** the navigation collapses by 820 px, and the sheet
  switches away from its three-column layout by 1100 px so the 1024 px laptop
  checkpoint does not overflow beside the desktop sidebar.
- **Accessibility:** all manual-override dialogs restore focus to their actual
  initiating control, the portrait placeholder names the current character,
  coarse-pointer targets receive additional height, and remaining focus/border
  colors use semantic theme tokens.

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test` (72 tests),
and `npm.cmd run build` passed. The available browser-control runtime exposed no
browser or native-app surface, so visual inspection at 1440 x 900, 1024 x 768,
768 x 1024, and 390 x 844 remains an owner checkpoint. Do not mark this product
checkpoint complete or proceed to Architecture checkpoint B until the owner
performs that pass and explicitly approves continuing.

Architecture review on 2026-10-08 classified representative-character details
on normal routes and the absence of a credible long Wizard spell list as data-
integration limitations rather than reasons to pull the complete content system
forward. Their fixes are assigned to Slice 6.75, and long-spell-list verification
is repeated in the post-level-up product checkpoint. The current checkpoint may
record those explicit deferrals, but the class-entry-keyed duplication defect
and any serious keyboard or accessibility issue remain in its bounded correction
pass.

## Required follow-up: Hit-dice play state — complete (2026-10-08)

Goal: close the omitted hit-dice tracking requirement before level-up work.

The 2024 design requires a long rest to restore all spent Hit Point Dice, but
the current sheet only displays a static hit-dice summary. This is a functional
omission from Slice 5, not an intentional deferral.

- Store spent hit dice separately in `CharacterPlayState`, preserving each
  class entry's stable identity and die type for multiclass characters. New
  characters start with zero used dice in every group.
- Render a dynamic, accessible hit-dice tracker for every class entry, using
  the maximum-HP-effect dropdown/adjustment pattern as its interaction model.
  Each group shows its die type, total dice (the class-entry level), and used
  dice; same-die groups remain separate.
- During a short rest, let players spend only an available die from their
  selected group. A character-level dropdown defaults to 2024 full recovery
  and may select the 2014 half-total table rule; the latter requires the
  player to allocate recovery between spent groups during Long Rest
  confirmation.
- Add IndexedDB and character-backup migrations plus validation for the new
  play-state field.
- Add unit and component tests for single-class and multiclass recovery.

Acceptance:

- a short-rest player can spend only an available hit die from the selected
  class-entry group;
- a long rest restores every spent die without over-restoring any class entry;
  and
- the state persists through reload, export, delete, and import.

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test` (68 tests),
and `npm.cmd run build` passed. `CharacterPlayState` now stores used dice by
stable class-entry ID, and the sheet displays dynamic per-class groups. Short
Rest confirmation supports dice spending; Long Rest defaults to restoring all
spent dice under 2024 rules, while the persisted, exported per-character
dropdown supports the explicit 2014 half-total table rule with player-selected
allocation. IndexedDB version 3 and character-backup format version 2 migrate
existing data with zero used dice and the 2024 default.

## Slice 6.75: Advancement data integration — complete (2026-10-09)

Goal: establish a production-shaped data path for the character sheet and
level-up workflow without pulling the complete public-content system forward.

- Define the read-only content-repository contract required by sheet selectors
  and advancement calculations, with the current bundled data as its first
  implementation.
- Pull and pin a license-verified SRD 5.2.1 Wizard subset for a deliberately
  limited level range. Include class progression, spellcasting progression,
  advancement grants, resources, and enough redistributable cantrips and
  leveled spells to test preparation, known spells, slot use, and scaling.
- Preserve the existing second-class progression for multiclass tests. Add a
  minimal second-caster test fixture if Architecture checkpoint B requires it
  for combined spell-slot verification.
- Record source, license, attribution, ruleset, and upstream-version metadata
  for every pulled record. Commit only the transformed, validated public
  subset; runtime behavior must not depend on the live source.
- Derive rules-facing sheet values from `Character`, `CharacterPlayState`,
  rules functions, and repository content. Remove representative-character
  details from normal persisted-character routes.
- Render explicit empty or not-chosen states for narrative or rules data that a
  character does not yet contain.
- Correct duplication so every play-state map keyed by class-entry ID is
  remapped consistently when new class-entry IDs are assigned.

Acceptance:

- a newly created character never displays identity, combat, spell, attack,
  inventory, or narrative values borrowed from the representative character;
- the same repository-backed Wizard data drives both the visible sheet and
  advancement calculations;
- the pinned Wizard subset validates deterministically and has complete public
  provenance without a runtime network request;
- the subset covers at least one subclass grant, one ability-score improvement,
  the total-level 5 proficiency threshold, cantrip scaling, and multiple spell
  levels;
- duplicating a character preserves or deliberately resets all play state
  without leaving class-entry-keyed orphan records; and
- typecheck, tests, build, and the affected manual sheet scenarios pass.

## Architecture checkpoint B: Level-up transaction

After Slice 6.75, review the proposed advancement diff format, repository access
boundary, multiclass prerequisites, class-entry choices, combined spell-slot
strategy, spell choice ownership, derived-sheet updates, and rollback behavior
before implementing the workflow.

Checkpoint review approved by the owner (2026-10-10):

- The level-up engine will be a pure planner: it receives an immutable
  `Character`, `CharacterPlayState`, and `ContentRepository`, then returns
  either actionable validation issues or an `AdvancementPreview`. The preview
  contains a complete candidate `Character`, a list of permanent changes,
  derived-stat before/after traces, and a required-choice list. The UI may edit
  only an in-memory draft; it will commit the candidate character and the
  unchanged play state together through one repository transaction. Cancel or a
  validation failure performs no write.
- The repository boundary will gain explicit lookups for subclasses, features,
  resources, and the class metadata needed to plan an advancement. The planner
  must not read the bundled JSON directly. Missing referenced content becomes a
  displayed blocking validation issue, never a partial commit.
- A class entry is the durable owner of class-specific choices. Slice 7 will
  allow one entry for each class ID: advancing selects the existing entry;
  taking a new class creates one new entry with a fresh stable ID. The entry
  stores its chosen subclass and choice values. This keeps Hit Dice, resources,
  spells, and future grants addressable when a character is copied or exported.
- Class data will declare multiclass prerequisites and the limited initial
  proficiencies/grants for a newly added class. The initial Wizard/Fighter
  scope will model only the data needed for those paths; unsupported content
  reports that it cannot yet be selected rather than guessing a grant.
- Replace global `knownSpellIds` and `preparedSpellIds` with versioned spell
  selections that include `classEntryId`, `spellId`, acquisition level, and
  prepared state where applicable. Migration assigns existing selections to the
  sole compatible spellcasting entry; ambiguous or incompatible legacy data is
  retained as an explicit unresolved-import error rather than silently being
  assigned.
- Ordinary Spellcasting uses a ruleset-owned combined-caster-level calculation
  and slot table, not the current sum of each class's own progression rows.
  Pact Magic remains a separate short-rest slot pool. The first implementation
  will add a minimal second full-caster fixture and tests for the combined-table
  path; no Pact Magic class is introduced in this slice.
- HP is recorded as a per-class-entry, per-level advancement choice (fixed,
  rolled result, or custom adjustment) so only the new level's HP is added.
  Existing play state — HP, temporary HP, used resources and slots, Hit Dice,
  death saves, conditions, and rest setting — is preserved verbatim. Derived
  sheet values are recomputed only after the atomic commit; manual overrides
  remain separate and visible.

Current implementation gaps identified by this review: the repository lacks
subclass/resource lookups and multiclass metadata; the character contract has
no HP advancement history or spell-selection ownership; and the sheet currently
sums full-caster slot progressions. These changes belong to Slice 7 and its
required migrations/tests, not to the checkpoint itself.

The owner approved this contract on 2026-10-10. Slice 7 may implement it.

## Slice 7: Level-up and multiclass workflow — complete (2026-10-10)

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

Completed implementation:

- Added a pure, preview-first advancement planner and an atomic repository
  commit path. The character sheet now provides a Level up dialog that selects
  an existing or new class, captures HP, requests an available subclass or ASI
  when required, displays the complete change list, and writes only after
  confirmation.
- Added class-entry-owned spell selections and per-level HP decisions, with
  IndexedDB version 4 and backup-format version 3 migrations. Existing HP
  remains on the prior derived calculation when historical choice data was not
  recorded; new levels always retain their exact HP decision.
- Added multiclass prerequisites, class/subclass/resource repository lookups,
  a ruleset-owned combined full-caster slot table, and a small public Cleric
  bootstrap fixture. Cleric proves prepare-from-list behavior and a second
  full caster; it is explicitly not a complete Cleric content pack.
- Added planner and component tests for preview/cancel/confirm, subclass
  timing, class-entry spell ownership, multiclass prerequisites, combined
  Wizard/Cleric slots, and Cleric available spells.

Completed verification: `npm.cmd run typecheck`, `npm.cmd run test` (87 tests),
and `npm.cmd run build` passed. Owner testing is now required at the following
product checkpoint before beginning Slice 8.

## Product checkpoint: Advancement and integrated character flow

Stop before Slice 8. Review the complete fixture-backed workflow as one product
surface rather than reviewing the level-up wizard in isolation.

- Create and reopen a Wizard whose sheet is derived from the pinned SRD subset.
- Exercise single-class advancement across a subclass grant, ability-score
  improvement, proficiency threshold, cantrip-scaling threshold, and multiple
  spell levels.
- Add the supported second class, verify multiclass prerequisites and grants,
  and exercise combined spell-slot behavior when the approved strategy applies.
- Confirm that the preview explains every permanent and derived change, cancel
  leaves no changes, and commit applies all choices atomically.
- Confirm that HP, temporary HP, resources, spell slots, Hit Point Dice, death
  saves, conditions, overrides, and rest settings survive advancement unless a
  displayed rule explicitly changes them.
- Review prepared, known, and available spell counts, source-class ownership,
  grouped spell levels, and a deliberately long spell list.
- Re-run create, duplicate, reload, direct-link, export, delete, and import
  scenarios after advancement.
- Repeat the visual, 200 percent zoom, reduced-motion, touch-target, complete
  keyboard, dialog-focus, and responsive checks at the representative widths in
  `docs/UI_DESIGN.md`.

This checkpoint is complete only after correctness blockers and serious
accessibility issues are resolved, deferred scope is recorded, and the owner
explicitly approves proceeding to the full content repository and public-pack
work.

### Post-checkpoint correction pass (2026-10-10)

- Corrected the level-up control contrast, label/control collision, ability-score
  editor crash, and inconsistent placement of its edit affordance.
- Corrected character-sheet text encoding for spell metadata and death-save
  markers; inventory entries without loaded item content now use a readable ID
  fallback instead of exposing their storage key.
- Made level-up HP entry explicitly a Hit Die result. Its fixed-average default,
  input range, and planner validation now follow the selected class's Hit Die;
  Constitution and other maximum-HP effects remain separate calculations.
- Added class-entry-owned Wizard spell choices to level-up and validation for
  duplicate or too-high spell choices.
- Replaced the fragile death-save icon treatment with visible native checkboxes
  using success/failure accent colors. Added class-entry choice data and the
  supported Fighter Fighting Style selection; advancement previews now resolve
  feature, resource, choice, and subclass grants by name. Cleric multiclass
  level 1 now collects its cantrips and prepared spells from the bootstrap list.
- Deferred the temporary in-sheet level-1 spell picker. Initial spells, skills,
  and all other first-level choices belong to character creation, not a recovery
  control on an already-created sheet.

The owner identified a product gap during this pass: the current “new
character” action creates a minimal Wizard 1 bootstrap record. It is not a
usable or representative character-creation workflow and must not be used as
the acceptance path for level-1 play.

## Architecture checkpoint: Level 0 to level 1 character creation — approved, amended (2026-10-10)

Before beginning more content work, review and approve the creation contract
and its initial supported content scope. The workflow must collect choices in a
draft and save one valid character plus play state only after review.

- Define the source-of-truth references and choices for starting class, ability
  scores, species, background, skills/proficiencies, equipment, spells,
  cantrips, and initial HP.
- Use a reviewed, deterministic full public SRD pack generated through the
  Slice 8 repository/import pipeline rather than a new hand-curated creation
  bootstrap subset. The application remains offline at runtime; Open5e is a
  deliberate, allowlisted build-time ingestion source only.
- Model maximum HP as separate, traceable terms: class Hit Die history,
  Constitution by total character level, permanent content-derived effects,
  and temporary play-state effects. Feats and species traits such as Tough and
  Dwarven Toughness must use structured permanent maximum-HP effects rather
  than being folded into an HP gain.
- Specify which grants are automated, tracked, or explicit manual choices;
  unsupported grants must be shown as unavailable rather than guessed.
- Define validation, cancel/review behavior, and tests for a complete level-1
  Wizard and at least one other supported starting class.
- Replace the current two-mode spell-selection contract before creation work:
  persist a class-entry-owned spell collection separately from its prepared
  state, with an explicit class casting model. Wizard creation must collect a
  six-spell level-1 spellbook and an independently editable daily prepared
  subset; Druid and Paladin creation must collect a daily prepared subset from
  their eligible class list without inventing a known-spell collection; and
  Bard creation must collect its level-up-selected spell list, which is not a
  daily preparation list. Preserve the source class entry, acquisition level,
  and replacement history needed to validate later advancement. Migrate current
  `spellSelections` and legacy known/prepared arrays without losing references.
- Apply the same model to level-up: Wizard gains add to the spellbook and never
  overwrite daily preparations; daily preparers adjust their prepared subset at
  the permitted time; and Bard selections follow its level-up replacement rule.
  Spell selection controls must expose eligible spell-level tabs while keeping
  search, keyboard operation, and the accessible full-description dialog.
- Confirm the creation result can be duplicated, reloaded, exported, imported,
  and advanced without fixture-only data or orphaned class-entry references.

Do not replace this checkpoint with incremental sheet controls. The approved
creation flow is the level 0 to level 1 transaction; ordinary level-up begins
only after that initial character exists.

### Spell-state and sheet follow-up (2026-10-10)

- Completed the separate, class-entry-owned prepared-spell migration (IndexedDB
  v6 and backup v4), retaining spell ownership independently from daily
  preparation state and migrating existing persisted data without dropping
  references.
- The sheet now presents spellcasting classes through an All view plus
  per-caster tabs. Each spell identifies its source class; daily-preparation
  controls appear only for caster models that can change preparations. Bard and
  Sorcerer-style level-up spell lists show their selected spell total instead.
- Spell attack bonuses and save DCs are derived per casting class. When a
  multiclass character uses more than one spellcasting ability, the sheet shows
  separately labeled class values rather than presenting the first caster's
  statistics as a shared value.
- Next session starting point: owner-review the level-0-to-level-1 creation
  contract against the full public pack, then begin that transaction workflow;
  do not add further sheet-only first-level controls.

## Slice 8: Content repository and public packs — next

Goal: unify bundled and locally installed content behind one interface.

- Replace the fixture-shaped bundled-content contract with a `ContentPack`
  contract. A bundled pack is a structured directory of deterministic modules:
  one module per class, subclass, species, and background; spells grouped by
  level; feats grouped by category; and items grouped by explicit item type.
  Owner modules colocate their features, choices, resources, and equipment
  packages. The manifest hashes/counts every module and the import report
  records categories the source cannot structure safely. Its portable
  import/export representation may be one JSON file with the identical modules.
- Build a composed repository that validates enabled bundled and installed
  packs, indexes entities by ID, rejects duplicate IDs/ruleset conflicts, and
  reports broken cross-pack references. Consumers query this repository rather
  than bundled JSON or pack arrays.
- Normalize spell-list membership onto spells as class IDs so an installed
  pack can add a spell to a base class's list without rewriting that class.
- Extend Zod validation and pack manifests from the pinned bootstrap subset to
  complete public packs, including species, backgrounds, items, equipment
  packages, and reviewed structured mechanical effects.
- Add source/ruleset filtering and reference resolution.
- Define item entities and searchable repository queries for inventory.
- Replace the bootstrap script with an allowlisted Open5e v2 full-SRD importer
  that emits the structured category files and a deterministic review report.
  It must stop on malformed or unrepresentable required relationships and must
  never run at application startup.
- Reconcile Open5e's upstream label to the official SRD document before
  claiming verified 5.2.1 provenance. Use `srd-2024` as the durable canonical
  namespace until that review is complete, with a migration for development
  character references that use the old namespace.

Acceptance:

- malformed packs fail with actionable errors;
- duplicate IDs and broken references are reported;
- application play remains independent of the live API; and
- generated module output, manifest hashes, and report are reproducible.

Initial implementation progress (2026-10-10):

- Replaced the Wizard-only bootstrap generator with a deterministic,
  allowlisted full-SRD reference-pack generator. It writes 62 owner-oriented
  modules, a manifest with per-module hashes/counts, and an import report.
- Added an offline verifier for module hashes, provenance, duplicate IDs,
  ownership links, class/subclass feature links, and aggregate counts. A second
  generation produced identical hashes.
- The source exposes no structured magic-item or rarity field, so item modules
  are grouped only by explicit item type; the import report records this limit.
- This is reference data only. The production `ContentPack` schemas, repository
  composition/indexes, structured parsers, and migration from the legacy
  bootstrap pack remain in this slice.
- Normalized spell-list membership is now stored on every spell as class IDs,
  validated by both the runtime composition boundary and the offline verifier.
  The generated snapshot no longer infers that relationship from Open5e's
  opaque reference payload at runtime.

## Product checkpoint: Full public-pack integration and manual testing

After Slice 8, stop for extensive owner-led testing before beginning private
packs. Exercise the generated SRD packs through creation, single-class and
multiclass advancement, spell preparation and selections, class/subclass
choices, sheet play state, content-pack installation/removal, and backup
round-trips. Re-run the responsive, keyboard, touch-target, and 200 percent
zoom scenarios in `docs/UI_DESIGN.md` against a deliberately varied set of
classes and long content lists. Record blockers and intentional deferrals
before approving Slice 9.

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

Slice 6.75 is complete (2026-10-09). It introduced a read-only bundled content
repository and deterministic Open5e bootstrap importer; generated 110 Wizard
spells (levels 0-3), 17 reference-tier feats, and the Evoker subclass; added
spell descriptions/higher-level reference text; and added declarative Wizard
cantrip, prepared-spell, and slot progression. The live sheet derives these
values from persisted character data and the repository, rather than from the
representative character. Fighter remains a deliberately minimal multiclass
fixture. The pack validates IDs and references, and copied Hit Dice remain
remapped by class-entry ID.

The generated manifest preserves Open5e's exact upstream source label
("System Reference Document 5.2", document key `srd-2024`). Reconcile it to
the official SRD 5.2.1 document before claiming verified 5.2.1 provenance.
This is a provenance-review follow-up, not a runtime dependency.

The advancement product checkpoint surfaced and resolved its bounded sheet and
level-up corrections. It also established that a minimal Wizard fixture cannot
stand in for character creation.

The owner approved the amended creation checkpoint: build the full public SRD
content foundation before implementing character creation. Bundled packs use
owner-oriented JSON modules behind one composed repository; portable pack
import/export may use one equivalent JSON file. Maximum HP will trace base
class gains, Constitution, permanent content effects, and temporary effects
separately.

Slice 8 is in progress. The deterministic reference-pack generator, module
verifier, production loader, composition/indexes, and application adapter are
in place. The app now derives its gameplay-facing data from the bundled full
pack, with spell-to-class list membership normalized and validated on spell
records rather than inferred from the Open5e reference payload.

Provenance review (2026-10-10): the official SRD page identifies the current
download as SRD v5.2.1, while the pinned Open5e records identify their source
only as “System Reference Document 5.2.” The records are therefore retained as
that exact upstream label under the durable `srd-2024` namespace; the project
does not claim they are verified v5.2.1 data.

Next: complete the owner-led Slice 8 pack review, then begin the approved
level-0-to-level-1 creation work with the separate spell-collection/prepared
state migration. Do not add incremental first-level controls to the sheet.
