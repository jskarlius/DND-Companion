# D&D Companion Design Document

Status: Initial architecture approved for implementation  
Last updated: 2026-10-08

## 1. Purpose

D&D Companion is a private, local-first React application for creating,
leveling, and playing D&D fifth-edition characters. It is intended for the
owner and a small group of friends, with no hosted application database. It
combines a bundled rules knowledge base with optional private content owned and
imported by each user.

The first complete product slice will support:

- creating a character from a selected ruleset and installed content packs;
- using an editable character sheet during play;
- tracking HP, temporary HP, resources, spell slots, and other temporary state;
- calculating common derived statistics;
- leveling a character from knowledge-base progression data;
- importing and exporting characters and content packs; and
- operating without a database server or continuous network connection.

Accounts, cloud synchronization, a hosted database, public content publishing,
and complete automation of every possible feature interaction are out of scope.

## 2. Product principles

1. **Local first.** A character must remain usable when the network or an
   external rules API is unavailable.
2. **Editable, not rigid.** Calculated values may be overridden deliberately,
   and unsupported rules can still be tracked manually.
3. **Ruleset aware.** 2014 and 2024 rules and similarly named content must not
   be silently mixed.
4. **Content provenance.** Every rules entity records its source, version,
   license, and distribution classification.
5. **Private means private.** Non-redistributable content is not committed to
   the repository or shipped with the public application.
6. **Incremental automation.** A feature can begin as reference text, gain a
   usage tracker, and later receive full mechanical automation.
7. **Portable data.** Users can export characters and private packs instead of
   relying exclusively on browser storage.
8. **Dynamic collections.** The interface presents as many classes, attacks,
   spells, cantrips, features, items, and resources as the character has. The
   spreadsheet's visible row counts are not application limits.
9. **Multiclass from the start.** Calculations explicitly distinguish total
   character level from levels in an individual class.

## 3. High-level architecture

```text
Open5e v2 / official SRD       User-owned document or manual entry
             |                              |
      public importer              private import/editor
             |                              |
      validated public pack        validated private pack
             |                              |
             +--------------+---------------+
                            |
                     IndexedDB content
                            |
              rules engine + character data
                            |
                     React application
```

Open5e is an ingestion source, not a runtime dependency. The importer creates a
pinned, validated snapshot so that API changes or outages cannot break a game
session.

## 4. Storage model

The project uses JSON and IndexedDB for different responsibilities rather than
choosing one exclusively.

### 4.1 Distributable content

Curated SRD content packs are versioned JSON files shipped with the application.
They are read-only inputs and can be cached for offline use. Packs are separated
by ruleset and version, for example `srd-5.1` and `srd-5.2.1`.

The application loads these packs into its content repository. An installation
may avoid duplicating immutable records in IndexedDB if querying the static pack
is sufficient, but all content is exposed through one repository interface so
the UI does not care where a record originated.

### 4.2 Runtime database

IndexedDB is the on-device runtime database. A small wrapper such as Dexie will
provide schema versions, queries, transactions, and migrations.

Planned stores are:

| Store | Responsibility |
| --- | --- |
| `contentPacks` | Installed pack manifests and import status |
| `contentEntities` | Private and optionally cached public entities |
| `characters` | Character source data, choices, and manual overrides |
| `playState` | Current HP, used resources, conditions, and other session state |
| `settings` | Application and display preferences |

Private imports **do live in IndexedDB during normal application use**, next to
the public content from the perspective of the repository. Their source and
distribution metadata remain distinct so they cannot accidentally be included
in a public export.

### 4.3 Private staging directory

`private-imports/` is not the runtime database. It is an optional, Git-ignored
staging location for source PDFs, scans, extracted text, and generated draft
packs during development. After validation, a pack is imported into IndexedDB.
The source file may then be retained privately or removed by its owner.

### 4.4 Backups and portability

IndexedDB is not the only copy of important user data. The application will
support:

- character export/import as a versioned JSON file;
- content-pack export/import as a versioned JSON file;
- bulk backup of local characters and permitted private packs; and
- explicit warnings when an export contains records marked `private`.

The application should request persistent browser storage where supported, but
exports remain necessary because users can clear browser data or change devices.

### 4.5 No hosted database

PostgreSQL and other hosted databases are not part of the planned architecture.
The word "database" in this document normally means IndexedDB, which is local
to a user's browser. Static hosting may eventually distribute the application
files, but it does not receive or store characters or private rules content.
Exported files are the supported way to move data between devices or friends.

## 5. Private-use content posture and provenance

This is not a public content service or commercial product, so licensing work
should remain proportionate and should not slow down ordinary development. At
the same time, sharing the application or a content pack with friends is still
copying that content. The project therefore keeps simple source and
distribution metadata and avoids publishing book text in a public repository.
This is a practical project boundary, not a digital-rights-management system or
legal determination.

The public application will include only material that can be redistributed,
initially:

- SRD 5.1 under its applicable open license; and
- SRD 5.2.1 under CC BY 4.0.

Open5e records are imported only from an allowlist of known documents and
licenses. The importer must not assume that the Open5e software license applies
to all game content returned by its API.

Material from books owned by a user, such as *Forgotten Realms: Heroes of
Faerun*, is classified as private unless a compatible redistribution license is
verified. It can be stored and used locally. Keeping it out of public builds and
public repositories is the default; sharing a private pack remains an explicit
user action rather than something the application tries to police.

Each content pack has a manifest similar to:

```ts
type ContentPackManifest = {
  schemaVersion: number;
  id: string;
  name: string;
  version: string;
  ruleset: "5e-2014" | "5e-2024";
  distribution: "public" | "private";
  source: {
    title: string;
    publisher?: string;
    license: string;
    attribution?: string;
    url?: string;
  };
};
```

Stable entity IDs include a namespace, source, type, and local key. An example
is `private:frhof:subclass:bladesinger`. References use IDs instead of names so
two versions of Bladesinger or Wizard can coexist without ambiguity.

## 6. Import pipelines

### 6.1 Public Open5e/SRD import

1. Query Open5e API v2 for allowlisted documents.
2. Retain only required player-facing entity types.
3. Transform the API response into the application's canonical schema.
4. attach source, license, ruleset, and upstream-version metadata;
5. validate every record;
6. report broken references and duplicates; and
7. generate deterministic, versioned JSON packs.

Generated packs are reviewed and committed. The application never requires the
live API during play.

### 6.2 Private document import

Private ingestion is deliberately semi-automatic:

1. Accept a user-provided PDF, scan, or pasted text.
2. Extract embedded text or use OCR when necessary.
3. Divide the extracted material into candidate entities.
4. Produce a draft pack without silently inventing missing rules.
5. Present validation errors and a human-review screen.
6. Let the user correct fields and confirm the result against the source.
7. Import the approved private pack into IndexedDB.

PDF extraction can recover text, but it cannot reliably infer mechanical
semantics from layout and prose. Authenticated sites and DRM/access controls are
not scraped or bypassed.

### 6.3 Manual content editor

Every supported entity type will eventually have a form-based editor. This is
the dependable fallback for physical books, inaccessible layouts, homebrew, and
features that the automated importer cannot understand.

## 7. Content and automation model

Core entity categories include:

- classes and subclasses;
- class/subclass features;
- backgrounds, species, and feats;
- spells and spell-list membership;
- equipment and items;
- resources and recharge rules; and
- choices and advancement grants.

Class and subclass progression is declarative:

```ts
type AdvancementLevel = {
  level: number;
  grants: Array<
    | { type: "feature"; featureId: string }
    | { type: "choice"; choiceId: string }
    | { type: "resource"; resourceId: string; amount: number }
    | { type: "ability-score-improvement" }
  >;
};
```

Every feature declares an automation tier:

| Tier | Behavior |
| --- | --- |
| Reference | Display description/reference; player manages the effect |
| Tracked | App tracks uses, activation, duration, or recharge |
| Automated | App applies explicit modifiers and derived-stat changes |

This permits private Bladesinger content to work first as a readable feature
with a Bladesong use tracker. Conditional statistics can be automated later
without redesigning the subclass record.

New private spells are normal spell entities associated with both their private
source and the relevant Wizard spell list. Installing or removing the pack
changes what can be selected without altering the base SRD Wizard record.

### 7.1 Inventory interaction

Inventory is a dynamic, structured collection rather than one large free-text
field. Once the content repository and item schema exist, the normal add-item
flow searches the enabled public and private content packs. An inventory entry
records its referenced item and quantity, with per-entry notes and state such
as worn/equipped, attuned, or charges added as their item mechanics are
modeled.

An explicit local custom-item flow remains available when an item is not in an
installed pack. It permits a player to record a name, quantity, and notes
without first creating a reusable content-pack entity. A user may later promote
such an entry into a private pack through the manual editor. Character creation
will resolve class and background starting-equipment choices into the same
inventory collection; multiclassing does not silently re-grant starting
equipment.

### 7.2 Advancement bootstrap data

Level-up development does not require the complete public content library, but
it does require the character sheet and advancement workflow to consume the
same production data contracts. Before implementing level-up, the application
will place a small, pinned, license-verified SRD 5.2.1 subset behind the content
repository read interface.

The bootstrap subset includes the 2024 Wizard through a deliberately limited
level range, its spellcasting progression, advancement grants, resources, and
a representative selection of redistributable cantrips and leveled spells. It
also retains a second-class progression for multiclass tests and may include a
minimal second-caster test fixture when needed to verify combined spell-slot
behavior. The data must be sufficient to exercise subclass timing, an
ability-score improvement, the total-level proficiency threshold, spell
selection by granting class, cantrip scaling, and prepared/known-spell limits.

This subset is application data rather than a live API dependency. It records
source, license, ruleset, and version metadata and is validated through the
same repository boundary planned for full public packs. Pulling it forward
does not pull forward the broad Open5e importer, content-library search,
inventory queries, or complete SRD generation; those remain in the later
content-system phase.

Normal persisted-character routes never receive representative-character
fixture details. Rules-facing sheet values are derived from the character,
play state, rules functions, and repository content. Data not yet chosen or
modeled is shown honestly as empty or not chosen instead of borrowing values
from a demo character.

## 8. Character model

Character records store player decisions and source values, not copies of every
calculated result.

```ts
type Character = {
  schemaVersion: number;
  id: string;
  name: string;
  ruleset: "5e-2024";
  longRestHitDiceRecovery: "2024-all" | "2014-half";
  enabledContentPackIds: string[];
  abilityScoreGeneration: "standard-array" | "point-buy" | "custom";
  abilityScores: Record<Ability, number>;
  classes: Array<{
    id: string;
    classId: string;
    subclassId?: string;
    level: number;
    choices: Record<string, string | string[]>;
  }>;
  choices: Record<string, string | string[]>;
  proficiencies: ProficiencySelection[];
  knownSpellIds: string[];
  preparedSpellIds: string[];
  inventory: InventoryEntry[];
  manualOverrides: Record<string, unknown>;
};
```

Temporary play state is persisted independently:

```ts
type CharacterPlayState = {
  characterId: string;
  currentHp: number;
  temporaryHp: number;
  usedHitDice: Record<string, number>;
  usedResources: Record<string, number>;
  usedSpellSlots: Record<number, number>;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  conditions: string[];
};
```

Selectors/pure functions derive proficiency bonus, modifiers, saves, skills,
initiative, armor class, maximum HP, spell statistics, and other calculated
values. A manual override is explicit, visible, and reversible; it does not
overwrite the underlying calculation.

### 8.1 Approved character-contract decisions

The initial application supports the 2024 ruleset only. It does not offer a
general 2014/2024 ruleset switch or silently mix entities from both rulesets.
An explicitly marked 2014 compatibility entity may later be made available only
for a spell or feat with no 2024 version. Classes and subclasses remain 2024
only. The compatibility entity retains its original source and ruleset metadata
so that the exception is visible and auditable.

Ability scores always store their final values. Character creation also records
whether those values came from the standard array, point buy, or custom entry;
the selected method is provenance for the creation workflow, not an alternate
calculation of the stored scores.

Maximum HP is derived from class progression and records the per-level choice or
result needed to reproduce it (for example, fixed average, rolled result, or a
custom adjustment). Level-up adds only the newly gained HP and other grants; it
does not reconstruct or reset prior choices.

Calculated values are read-only by default. The first supported manual override
targets are armor class, maximum HP, speed, spell attack bonus, and spell save
DC. An override stores a separate replacement value and reason/label; removing
it immediately returns to the underlying calculation. The data model remains
extensible for additional override targets after play testing.

All core calculation results provide a final value plus a trace of contributing
terms so the interface can expose an explanation, such as on hover or focus.
The trace is an explanation of the calculation, never a second editable source
of truth.

### 8.2 Temporary play state and rests

Permanent character choices remain separate from temporary play state. A
level-up preserves current HP, temporary HP, used resources, used spell slots,
death saves, and conditions unless a specific applied rule changes one of them.

Rest actions are explicit player actions rather than consequences of level-up:

- a long rest restores the state dictated by the applicable rules, including
  resources and spell slots. Under the supported 2024 ruleset, it restores all
  spent Hit Point Dice;
- a short rest applies only the resources whose declared recharge metadata says
  they recover on a short rest, such as Pact Magic slots or Action Surge where
  applicable; and
- players can still directly adjust play state for healing, consumables, and
  table rulings.

Hit Point Dice are temporary play state, not a static character-sheet label.
Each class entry contributes Hit Point Dice equal to its class level and of its
class die type, so a multiclass character can have multiple independently
tracked groups even when two classes share a die type. A newly created
character starts with `usedHitDice` at zero for every class entry. The sheet
renders one dynamic tracker per class entry, using the same compact
adjustment/dropdown pattern as maximum-HP effects where appropriate. During a
Short Rest, a player selects an available die from a group to spend; the app
records the resulting number used and never permits it to exceed that class
entry's level. A 2024 Long Rest resets every group's used count to zero.

The application remains a 2024-ruleset application, but a character can opt
into the 2014 half-total Hit Point Dice recovery rule as an explicit table-rule
setting. This setting does not enable 2014 classes or other rules content. The
default is `2024-all`; its Long Rest resets every group's used count to zero.
For the `2014-half` option, the Long Rest confirmation flow permits the player
to allocate up to `max(1, floor(total character level / 2))` recovered dice
among the spent class-entry groups, without exceeding a group's used count.

### 8.3 Character level and class level

The rules engine exposes both concepts explicitly:

```ts
const characterLevel = character.classes.reduce(
  (total, classEntry) => total + classEntry.level,
  0,
);

const wizardLevel = getClassLevel(character, "srd-5.2.1:class:wizard");
```

They are never treated as interchangeable:

- proficiency bonus is based on total character level;
- class and subclass features are granted by the level in that class;
- ability-score improvements and feats are advancement grants at the exact
  levels specified by the selected class, not a universal `level % 4` rule;
- the number of cantrips learned or prepared is normally read from the relevant
  class progression;
- damage or other scaling for many cantrips uses total character level, as
  declared by the spell's scaling rule;
- hit points gained at level-up use the class receiving the new level;
- spell preparation/knowledge remains associated with its granting class;
- multiclass spell slots use the selected ruleset's combined-caster-level
  strategy, while systems such as Pact Magic remain separately modeled; and
- features with similar effects do not stack unless the applicable rule says
  that they do.

Scaling is data driven rather than assumed globally:

```ts
type ScalingBasis =
  | "character-level"
  | "class-level"
  | "ability-modifier"
  | "proficiency-bonus"
  | "fixed";
```

This supports ruleset differences and unusual class features without embedding
Wizard-specific behavior in generic UI components.

## 9. Level-up workflow

Level-up is a staged transaction that supports advancing an existing class or
adding a new class:

1. Select an existing class or choose a new multiclass.
2. Validate ruleset-specific multiclass prerequisites when applicable.
3. Calculate the new total character level and new level in the target class.
4. Compare the target class's current and next advancement grants.
5. Apply only the starting proficiencies/grants allowed for a multiclass entry.
6. Resolve required choices such as subclass, feat, spells, or ability scores.
7. Recompute proficiency bonus, class resources, cantrip scaling, HP, and
   multiclass spell-slot progression using the appropriate level basis.
8. Preview every addition, lost option, and calculated-stat change.
9. Warn about missing or incompatible content packs.
10. Commit the class level and all choices together.
11. Recalculate derived values without resetting temporary play state unless the
   applicable rule explicitly requires it.

The preview and atomic commit prevent partially completed level-ups.

## 10. Workbook-derived character-sheet requirements

The reference workbook `Voltash Vryn.xlsx` contains four worksheets:

- `Base Sheet`: an empty reusable character template;
- `Voltash Vryn`: the active level 7 character;
- `Voltash Notes`: free-form character and world notes; and
- `World Tree Barb`: another populated character example.

The character sheets contain approximately 250 merged regions, 44-45 formulas,
and 124 boolean cells each. Important spreadsheet sections include:

- identity, class, level, species, and background;
- ability scores and modifiers;
- saving throws, skills, proficiency, and expertise;
- inspiration and exhaustion;
- initiative, speed, armor class, HP, temporary HP, hit dice, and death saves;
- attacks and spellcasting;
- proficiencies and languages;
- features and feats;
- inventory and item descriptions;
- spell attack/save values and spell preparation; and
- free-form notes.

Google Sheets checkboxes were exported as boolean cell values, not Excel form
controls. For example, proficiency and spell-preparation cells contain actual
`TRUE` or `FALSE` values. The data therefore remains recoverable even though
Excel displays plain booleans. The React UI will render these values as native,
accessible checkboxes or equivalent toggle controls.

The spreadsheet's formulas are requirements evidence, not code to reproduce
literally. Several formulas contain character-specific or name-based conditions.
The application will replace those formulas with tested rules functions and
content-driven modifiers.

The workbook is a reference for useful information and workflows, not a rigid
screen specification. The application is not constrained by its exact cell
grid, formulas, page size, or number of rows. Cantrips, spells, attacks,
features, inventory, class entries, and other repeated data are dynamic lists.
Rules may show an expected or allowed count, but the interface does not reserve
an arbitrary fixed number of slots such as eight cantrip rows.

Desktop can provide a dense sheet view, while narrow screens can arrange the
same sections as cards, tabs, or collapsible groups. Print layout remains a
separate design decision. The application UI direction, component-system
boundaries, responsive principles, and review process are defined in
`docs/UI_DESIGN.md`.

### 10.1 Interface design system

The application uses Tailwind CSS for design tokens, responsive styling, and
composable utility classes. It adopts selected shadcn/ui components as owned
source code for generic interface primitives such as buttons, form controls,
tabs, dialogs, tooltips, badges, and separators. This is not a request to
replace the character sheet with a stock template or to express every layout
as utility classes.

D&D-specific presentation remains application code. Ability summaries, saving
throws, spell slots, resources, death saves, inventory entries, and other game
concepts compose the shared primitives while retaining semantic HTML and the
dynamic collections required by this design. Ordinary CSS remains acceptable
when it communicates a complex sheet layout more clearly than inline utility
classes.

The visual direction is a restrained arcane field journal: warm neutral
backgrounds, ink or forest-green primary actions, muted metallic accents, and
danger colors reserved for destructive or harmful states. Display typography
may use a restrained serif, while controls, dense data, and body text use a
highly readable sans-serif. Fonts and icons used by the installed application
are bundled locally rather than fetched from a runtime CDN.

The design system is introduced before application navigation expands. A
manual product checkpoint after the character-library slice validates the
library, character sheet, responsive behavior, keyboard operation, and visual
hierarchy before level-up work begins.

## 11. Frontend and packaging technology

The application uses React 19, TypeScript, and Vite. The original Create React
App scaffold was migrated in place during Slice 1; `react-scripts` is no longer
part of the project.

Technologies will be introduced only when their responsibility is needed:

| Technology | Responsibility |
| --- | --- |
| React | Component-based interface |
| TypeScript | Compile-time contracts for characters, rules, and UI props |
| Vite | Development server and production build |
| Zod | Runtime validation of packs, imports, and backups |
| IndexedDB/Dexie | Local persistence and schema migrations |
| React Router | Multi-screen navigation |
| Tailwind CSS | Design tokens, responsive styling, and static utility CSS |
| shadcn/ui | Owned, accessible source components for generic UI primitives |
| Vitest + Testing Library | Rules and interface tests |
| Service worker/PWA | Installable shell and offline application assets |
| Tauri 2 | Planned Windows and Android native packaging after the PWA |

Routing, validation, persistence, PWA support, and native packaging are added
only alongside the first slices that require them.

### 11.1 Deployment targets

The application has three planned forms that share the same React interface and
domain logic:

1. the browser development build;
2. an installable offline PWA; and
3. Tauri 2 packages for Windows and Android.

Tauri is a native shell around the compiled Vite application. Windows uses the
system WebView2 runtime and Android uses the system Android WebView. Tauri may
also provide narrowly scoped native capabilities such as file dialogs, local
filesystem access, and—only if later justified—a native SQLite or inference
adapter. Tauri is not a hosted backend, and packaging the application must not
introduce accounts or network storage.

The Windows target is implemented before Android so native packaging, upgrades,
file import/export, and data retention can be learned and tested on the primary
development platform. Android follows after the desktop shell is stable.

### 11.2 Storage portability

IndexedDB/Dexie remains the planned implementation through the web and PWA
milestones and is the default for the first Tauri prototypes. Both Windows and
Android webviews provide IndexedDB, so native packaging alone is not a reason to
rewrite storage.

Application code accesses data through repository and backup interfaces rather
than importing Dexie directly into UI or domain modules. A future native SQLite
adapter is considered only after measurements show a material need, such as
full-text-search performance, very large content libraries, more controlled
database-file backups, or webview-storage limitations. PostgreSQL remains out
of scope.

The versioned character, content-pack, and full-backup formats are independent
of the storage adapter. They are the supported interchange mechanism between
browser, Windows, and Android installations and provide the migration route if
SQLite is adopted later.

### 11.3 Native package boundaries

- The compiled public application and redistributable public packs may be
  included in installers.
- Private packs, private reference files, characters, and model files are never
  compiled into release artifacts.
- Native capabilities follow least privilege; only required Tauri permissions
  are enabled.
- Windows package identity and Android application ID remain stable so upgrades
  address the same application data.
- Android signing keys and other release secrets remain outside the repository
  and require a documented backup procedure.
- Uninstalling the native application may remove its local data, so exportable
  backups remain necessary even if a native database is introduced.

## 12. Proposed project structure

```text
dnd-companion/
|-- content/
|   |-- srd-5.1/
|   `-- srd-5.2.1/
|-- docs/
|   |-- DESIGN.md
|   |-- IMPLEMENTATION_PLAN.md
|   |-- NATIVE_PACKAGING.md
|   |-- RAG_IDEA.md
|   |-- UI_DESIGN.md
|   `-- TECH_STACK_GUIDE.html
|-- private-imports/           # Git-ignored private ingestion staging
|-- reference/                 # Shareable design/reference files
|   `-- private/               # Git-ignored private references
|-- scripts/
|   `-- import-content/
|-- src/
|   |-- app/                   # Application shell and routes
|   |-- components/            # Reusable presentation components
|   |   `-- ui/                # Owned generic UI primitives
|   |-- domain/
|   |   |-- character/         # Character types and calculations
|   |   |-- content/           # Canonical rules entity types
|   |   `-- rules/             # Ruleset-specific logic
|   |-- features/
|   |   |-- character-creation/
|   |   |-- character-sheet/
|   |   |-- content-library/
|   |   `-- level-up/
|   |-- storage/               # IndexedDB and file import/export
|   |-- styles/
|   `-- main.tsx
|-- index.html
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
`-- src-tauri/                   # Added in the post-PWA native phase
```

## 13. Delivery plan

### Phase 1: Foundation

- Migrate the starter from Create React App to Vite and TypeScript.
- Establish domain types and automated testing.
- Add a small, hand-verified SRD fixture rather than the full database.

### Phase 2: Character-sheet vertical slice

- Create/load one Wizard character modeled from the workbook.
- Render abilities, saves, skills, combat statistics, features, and notes.
- Support HP and boolean/toggle tracking.
- Add explicit manual overrides.

### Phase 3: Persistence and portability

- Add versioned IndexedDB storage.
- Add character JSON export/import and migration tests.
- Request persistent browser storage and provide backup guidance.

### Phase 3.5: Application shell and UI foundation

- Establish the Tailwind and shadcn/ui foundation without replacing domain
  components or rules behavior.
- Extract reusable generic controls and apply the approved visual direction.
- Add the character library and application routes.
- Perform a manual UI and accessibility review at representative desktop,
  tablet, and mobile widths before advancement work begins.

### Phase 4: Advancement and multiclassing

- Put a pinned, license-verified 2024 Wizard subset and the existing second
  class behind the content-repository read contract.
- Replace live-route representative details with sheet values derived from the
  persisted character, play state, rules functions, and repository content.
- Model Wizard and a second class through a small range of levels.
- Implement single-class and multiclass level-up previews, choices, and atomic
  commit.
- Test total-level proficiency/cantrip scaling against class-level grants, ASIs,
  HP, and spell progression.
- Verify that existing play state is preserved.
- Perform a product checkpoint covering the integrated character sheet,
  spellcasting, level-up, multiclassing, persistence, responsive behavior, and
  keyboard operation before expanding to the full content system.

### Phase 5: Content system

- Build the allowlisted Open5e v2 importer.
- Generate and validate SRD 5.1 and 5.2.1 packs.
- Add content-library inspection and source/license display.
- Define item entities and repository queries needed by structured inventory.

### Phase 6: Private content

- Add private pack import and form-based editing.
- Add semi-automatic PDF/text extraction as a development aid.
- Add warnings and filtering for private exports.
- Use Bladesinger plus selected Wizard spells as the first private-pack test.

### Phase 7: Offline installation

- Add a service worker and installable PWA manifest.
- Test fresh install, offline launch, updates, and recovery from backups.

### Phase 8: Native packaging

- Package the existing Vite build with Tauri 2 for Windows first.
- Verify offline startup, IndexedDB persistence, upgrades, and native
  import/export dialogs.
- Package and test the same application for Android.
- Keep IndexedDB unless the native-storage checkpoint demonstrates a concrete
  reason to add a SQLite adapter.
- Document package identity, signing, release artifacts, and friend handoff.

## 14. Testing strategy

- Pure unit tests for modifiers, proficiency, saves, skills, HP, spell values,
  advancement grants, and ruleset differences.
- Schema tests for every bundled and imported content pack.
- Migration tests using older character and database versions.
- Integration tests for creating, editing, saving, exporting, importing, and
  leveling a character.
- Browser tests for offline startup and local persistence.
- Native smoke tests for Windows and Android offline startup, import/export,
  restart persistence, and upgrade data retention.
- Regression fixtures based on the workbook's Base Sheet, Voltash Vryn, and
  World Tree Barbarian examples without publishing private book text.

## 15. Decisions intentionally deferred

- Print/PDF presentation and any print-specific visual theme.
- The exact percentage of complex class features that should be automated.
- Whether measured native requirements justify a SQLite storage adapter.
- Windows installer format and whether Android distribution uses direct APK
  handoff, an app bundle, or both.
- The deferred local knowledge assistant described in `docs/RAG_IDEA.md`.

These decisions do not block the initial character-sheet vertical slice.
