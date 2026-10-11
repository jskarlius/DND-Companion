# D&D Companion project guidance

Before planning, implementing, or reviewing application changes, read:

- `docs/DESIGN.md` for architecture, product constraints, data-model boundaries,
  and the intended technology stack.
- `docs/IMPLEMENTATION_PLAN.md` for the current slice scope and its
  acceptance criteria.

`docs/IMPLEMENTATION_PLAN.md` is the compact active plan.
`docs/IMPLEMENTATION_HISTORY.md` preserves completed-slice detail and
superseded sequencing; read it only when the active plan links to it or an
earlier decision needs context.

Work one slice at a time. When a slice is finished, update
`docs/IMPLEMENTATION_PLAN.md` to mark it complete and set the next-session
starting point before ending the work. Preserve unrelated user changes, keep
private reference material and imports out of source code, run the slice's
stated verification commands, and report changed files, assumptions, risks,
and test results. Stop at architecture checkpoints unless explicitly asked to
continue.

When the owner asks for an implementation or UI change, begin implementing it
in the same turn. Do not respond with only a proposed plan or wait for a second
request unless a genuine architecture decision, missing authority, dependency
failure, or stated manual-test checkpoint requires the owner's input. Brief
progress updates are welcome, but they do not replace doing the requested work.

Do not create commits automatically. Commit only when the user explicitly asks
in the current prompt, and make at most that one requested commit; after it,
assume further changes must remain uncommitted unless the user asks again.

If a required dependency download or `npm install` fails or times out, stop and
ask the owner to run the install manually. Do not retry the download, substitute
another implementation, or continue the affected slice until the owner confirms
the dependencies are available.

Treat the workbook as reference evidence rather than a fixed UI layout. Keep
repeated UI sections dynamic and do not copy private book text into the app.

When the owner asks a design question or challenges a proposal, give candid,
evidence-based analysis. Do not agree merely to be accommodating: explain
material trade-offs, identify risks or flawed assumptions, recommend the best
option, and clearly distinguish a recommendation from an owner decision.
