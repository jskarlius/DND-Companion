# Content import scripts

Build-time importers and canonical-schema transformations will live here.
Open5e is an ingestion source rather than a runtime dependency.

## SRD 2024 full reference-pack importer

`import-open5e-srd.mjs` fetches the allowlisted Open5e v2 `srd-2024` document's
classes, spells, feats, species, backgrounds, and items. It verifies every
record's document and ruleset, then writes sorted owner-oriented modules, a
hashed manifest, and an import report to `content/packs/srd-2024/`. Class,
subclass, species, and background modules colocate their owned features;
spells are grouped by level, while feats and items are grouped only by explicit
upstream category fields.

The generated records are complete **reference data**. The report explicitly
lists parts of the upstream prose that still require a reviewed structured
parser before they can drive character creation or automated rules. The script
does not infer those choices or mechanics.

Run it deliberately during data review; it is never part of app startup:

```powershell
npm.cmd run content:import-srd
```

After generation, run the offline verifier. It checks every manifest hash,
category count, entity ID, provenance object, and class/subclass feature link
without contacting Open5e:

```powershell
npm.cmd run content:verify-srd
```

Open5e currently labels the selected document "System Reference Document 5.2".
The generated manifest records that exact upstream label. Do not describe the
snapshot as verified SRD 5.2.1 until it is reconciled against the official 5.2.1
document.

The generated files are immutable public application data. The future content
repository will validate them at application load rather than copying them into
IndexedDB. IndexedDB is reserved for characters, play state, and later
installed public/private packs.
