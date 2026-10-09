# D&D Companion

A private, local-first React companion for creating and playing 2024 D&D
characters. Characters and temporary play state stay in the browser's
IndexedDB; public rules data is generated into versioned JSON packs and bundled
with the application.

## Development

```powershell
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Content bootstrap

The current Slice 6.75 bootstrap pack provides Wizard, Evoker, spell, feat,
and representative multiclass data. It is generated only when deliberately
requested; the running application makes no Open5e request.

```powershell
npm.cmd run content:bootstrap
```

See [content/README.md](content/README.md) for pack storage and provenance, and
[scripts/import-content/README.md](scripts/import-content/README.md) for the
importer workflow.

## Documentation

- `docs/DESIGN.md` — product architecture and data-model boundaries
- `docs/IMPLEMENTATION_PLAN.md` — completed slices and current checkpoint
- `docs/UI_DESIGN.md` — UI review requirements
