# D&D Companion project guidance

Before planning, implementing, or reviewing application changes, read:

- `docs/DESIGN.md` for architecture, product constraints, data-model boundaries,
  and the intended technology stack.
- `docs/IMPLEMENTATION_PLAN.md` for the current work-package scope and its
  acceptance criteria.

Work one package at a time. Preserve unrelated user changes, keep private
reference material and imports out of source code, run the package's stated
verification commands, and report changed files, assumptions, risks, and test
results. Stop at architecture checkpoints unless explicitly asked to continue.

Treat the workbook as reference evidence rather than a fixed UI layout. Keep
repeated UI sections dynamic and do not copy private book text into the app.
