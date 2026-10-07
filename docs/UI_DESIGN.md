# D&D Companion UI Design and Review Guide

Status: Direction approved; implementation pending  
Last updated: 2026-10-07

## 1. Purpose

This document records the interface direction, component-system boundaries,
and the manual review process for D&D Companion. It supplements `DESIGN.md`;
domain behavior, storage boundaries, and product scope remain authoritative in
that document.

The goal is a cohesive, accessible application that remains comfortable during
long play sessions. The workbook is requirements evidence, not a visual layout
to reproduce.

## 2. Chosen approach

Use Tailwind CSS with selected shadcn/ui components.

- Tailwind provides design tokens, responsive utilities, and static generated
  CSS. It is also the project's chosen path for learning utility-first CSS.
- shadcn/ui provides owned source code for polished generic primitives. Add
  only components that the application needs and review generated code before
  keeping it.
- Application-specific components continue to represent D&D concepts and own
  the sheet's information architecture.
- Ordinary CSS is allowed for complex layout rules or when it is clearer than
  a long utility-class expression.

Mantine is the fallback if maintaining owned primitives proves too costly.
Material UI and Chakra UI are not planned because their styling systems and
default visual character provide less benefit for this custom, local-first
interface.

## 3. Visual direction

The working direction is a **restrained arcane field journal**, not an ornate
fantasy prop and not a generic administration dashboard.

- Warm neutral page backgrounds and calm, lightly elevated surfaces.
- Ink or forest green for primary actions and active navigation.
- A muted copper or gold accent used sparingly for important details.
- Ruby or red reserved for destructive actions, failure, and harmful states.
- A restrained serif for character names and section headings.
- A readable sans-serif for body copy, controls, tables, and dense statistics.
- Tabular numerals for frequently changing game values.
- Modest radii and shadows, with hierarchy created by spacing and typography
  rather than placing every section inside an equally prominent box.
- Locally bundled fonts and icons so the PWA and native packages do not depend
  on a network request.

Exact color values, typefaces, density, and elevation remain provisional until
the product checkpoint. They must be expressed through semantic tokens rather
than repeated component-local values.

## 4. Semantic design tokens

The initial token vocabulary should cover:

- canvas, surface, raised surface, foreground, and muted foreground;
- primary, primary foreground, accent, and accent foreground;
- border, input, focus ring, destructive, warning, and success;
- spacing, content widths, radii, shadows, and motion durations; and
- display, body, and numeric typography.

Components consume semantic roles such as `surface` or `destructive`, not
literal fantasy color names. Light mode is the first requirement. Dark mode is
allowed later but must not delay the initial review checkpoint.

## 5. Component boundaries

Initial generic primitives:

- Button, Input, Textarea, Label, and Checkbox;
- Tabs;
- Dialog and AlertDialog;
- Tooltip;
- Badge;
- Card and Separator; and
- Select, Popover, Command, or ScrollArea only when a workflow requires them.

Application components remain responsible for game meaning, including ability
blocks, saving throws, skills, HP, death saves, attacks, spell slots, features,
resources, inventory entries, override indicators, and rest actions.

Do not turn every section into a generic Card or move domain state into shared
UI primitives. Shared components must not import fixtures, storage adapters, or
rules-engine modules.

## 6. Responsive and interaction principles

- Preserve a dense, scannable desktop sheet without copying spreadsheet
  coordinates.
- Establish an intentional reading order before collapsing to one column.
- Keep primary play values and frequent actions easy to reach on narrow
  screens.
- Use at least comfortable touch targets for mobile controls.
- Avoid horizontal page scrolling; data tables may use a clearly bounded
  horizontal scroller when necessary.
- Do not rely on hover for required information or actions.
- Show loading, empty, error, disabled, destructive, and successful states
  deliberately.
- Preserve user-entered state across responsive layout changes.

## 7. Accessibility baseline

- All workflows must be usable by keyboard alone.
- Focus must be visible, logically ordered, trapped inside modal dialogs, and
  restored when a dialog closes.
- Tabs implement the expected arrow-key behavior and expose correct roles and
  relationships.
- Every form control has an accessible name and understandable validation.
- Color is never the sole indicator of proficiency, preparation, failure,
  override state, or selection.
- Text and interactive states meet WCAG 2.2 AA contrast expectations.
- Reduced-motion preferences are respected for nonessential motion.
- Automated component tests cover semantics, but the product checkpoint also
  includes manual keyboard and screen-reader-oriented inspection.

## 8. Product checkpoint test matrix

Run this review after the character library and application navigation are
implemented. Stop before the level-up slice until feedback is resolved or
explicitly deferred.

Review at minimum:

| Context | Suggested viewport | Main concern |
| --- | --- | --- |
| Wide desktop | 1440 x 900 or larger | Scanability, line length, unused space |
| Laptop | 1024 x 768 | Density, wrapping, reachable actions |
| Tablet/narrow desktop | 768 x 1024 | Column order and navigation behavior |
| Mobile | 390 x 844 | Touch targets, single-column flow, no page overflow |

Exercise these states and workflows:

1. Empty character library and first-character entry point.
2. Library containing several characters with a clear recent-character cue.
3. Open a character, reload it, and navigate directly to its stable URL.
4. Unknown character URL and recoverable error state.
5. Create, duplicate, import, export, and destructive delete confirmation.
6. Switch Sheet, Character, and Inventory tabs by pointer and keyboard.
7. Edit HP, temporary HP, inspiration, death saves, conditions, resources, and
   spell slots.
8. Apply, explain, and remove a manual override.
9. Confirm and cancel short- and long-rest dialogs.
10. Inspect empty and long dynamic collections for wrapping and overflow.
11. Traverse the complete visible workflow using only the keyboard.
12. Verify browser zoom at 200 percent and reduced-motion behavior.

Do not include private book text or other private reference material in shared
screenshots or feedback artifacts.

## 9. Feedback format

UI feedback may be informal, but each actionable report should identify:

- page or component;
- viewport/device and input method;
- steps or state needed to reproduce it;
- what currently feels wrong or unclear;
- the preferred result, if known;
- severity: blocker, usability, polish, or preference; and
- a screenshot when visual context materially helps.

Accepted feedback is implemented as a bounded UI review adjustment pass. New
product capabilities or domain behavior discovered during review return to the
implementation plan instead of being hidden inside visual-polish work.

## 10. Definition of checkpoint completion

The UI checkpoint is complete when:

- the library and character sheet use the shared token and primitive system;
- the test matrix has been exercised at the representative widths;
- no known blocker or serious keyboard/accessibility defect remains;
- accepted usability changes have been verified;
- intentionally deferred feedback is recorded with a future slice; and
- the owner approves continuing to the level-up architecture checkpoint.
