# Content import scripts

Build-time importers and canonical-schema transformations will live here.
Open5e is an ingestion source rather than a runtime dependency.

## SRD 2024 bootstrap importer

`import-open5e-bootstrap.mjs` fetches only the Open5e v2 `srd-2024` document's
classes, spells, and feats. It rejects a result whose document or game-system
does not match the allowlist, narrows spells to the Wizard list through level
3, converts field names into `ContentFixture`, adds the project's stable IDs
and fixed CC-BY attribution, and writes a sorted JSON snapshot to
`content/generated/`.

Run it deliberately during data review; it is never part of app startup:

```powershell
npm.cmd run content:bootstrap
```

Open5e currently labels the selected document "System Reference Document 5.2".
The generated manifest records that exact upstream label. Do not describe the
snapshot as verified SRD 5.2.1 until it is reconciled against the official 5.2.1
document.

The generated JSON is bundled as immutable public application data. It is
validated through the content repository at application load rather than copied
into IndexedDB. IndexedDB is reserved for characters, play state, and later
installed public/private packs.
