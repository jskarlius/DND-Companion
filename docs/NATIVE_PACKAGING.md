# Native Packaging Plan

Status: Planned after the offline PWA and friend-handoff milestone  
Last updated: 2026-10-07

## 1. Decision

D&D Companion will use Tauri 2 as the planned native packaging layer for
Windows and Android. The existing React, TypeScript, and Vite application
remains the shared frontend. Tauri adds a platform shell and narrowly scoped
native capabilities; it does not add a hosted backend, accounts, or cloud
synchronization.

Implementation begins only after Slice 10. Windows is the first target, followed
by Android. This sequencing limits the number of unfamiliar toolchains being
introduced at once and lets the project validate packaging and data retention
on its primary development platform before adding Android Studio, SDK, and NDK
requirements.

## 2. Target architecture

```text
Shared React/Vite application
├── Browser and offline PWA
│   `-- IndexedDB through Dexie
└── Tauri 2
    ├── Windows / WebView2
    │   `-- IndexedDB initially
    `-- Android / Android WebView
        `-- IndexedDB initially
```

The domain and feature layers do not import Tauri APIs. Platform differences
are isolated behind interfaces such as:

- `CharacterRepository`;
- `ContentRepository`;
- `PlayStateRepository`;
- `BackupService`; and
- `FilePicker`.

The browser implementation uses web APIs. The Tauri implementation may use
native dialogs/filesystem APIs while returning the same application-level data.

## 3. Why Tauri

- It can package the existing Vite output rather than requiring a separate UI.
- It targets both Windows and Android.
- It uses each platform's system webview instead of bundling a complete browser
  runtime with every installation.
- It provides an explicit bridge for native capabilities that may be useful
  later, including file access and optional native database or inference code.
- Its permission model allows the application to expose only the native
  operations it needs.

Tauri introduces Rust and platform build tooling. That cost is deferred until
the core application, persistence, content packs, and backups are already
working in the browser.

## 4. Storage decision

IndexedDB/Dexie remains the first implementation in both native packages. The
Windows and Android system webviews support IndexedDB, and using it initially
keeps browser and native behavior aligned.

SQLite is a possible future native adapter, not a prerequisite for Tauri. It is
considered only if measured requirements justify the additional implementation
and migration cost, such as:

- unacceptable full-text-search performance with the real content library;
- content volume that is awkward for the IndexedDB repository;
- a need for direct, controlled database-file backups; or
- material persistence or upgrade problems in a target webview.

PostgreSQL is not considered because the application has no database server.

Regardless of storage engine, versioned character, content-pack, and full-backup
files remain the portable source of truth for device transfer. A SQLite adapter
must implement the same repository contracts and import existing backups; UI and
domain modules must not require SQLite-specific queries.

## 5. Windows packaging sequence

1. Complete and verify Slice 10.
2. Establish the stable application identifier and product metadata.
3. Add `src-tauri/` without changing the browser build entry point.
4. Configure Tauri to consume the Vite development server in development and
   the Vite production output in release builds.
5. Add icons and the selected Windows installer/bundle target.
6. Enable only the native dialog/filesystem permissions required by explicit
   backup import and export.
7. Verify offline launch and all core character/content workflows.
8. Test restart and application-upgrade data retention.
9. Build a release artifact and document installation for friends.

Windows code signing may be evaluated for distribution warnings and trust, but
it is not required to prove the packaging architecture.

## 6. Android packaging sequence

1. Install and document the supported Rust targets, Android Studio, SDK, NDK,
   platform tools, and build tools.
2. Initialize Tauri's Android project from the working Windows shell.
3. Configure a stable application ID, version code/name, orientation behavior,
   icons, and minimum supported Android version.
4. Test responsive layouts and touch targets in Android WebView.
5. Implement import/export through Android-compatible document selection and
   file sharing rather than assuming desktop filesystem paths.
6. Test offline startup, restart persistence, and an application upgrade on a
   representative physical device.
7. Define the release signing workflow and keep the signing key, passwords, and
   backup material outside the repository.
8. Produce an APK for direct testing; decide later whether an Android App Bundle
   is also needed.

## 7. Data and release safety

- Private content and characters are installed/imported after installation and
  are never included in release builds.
- Exportable backups are required because browser data, app data, device loss,
  or uninstall can remove local state.
- Imports validate schema versions before writing data and use transactions so
  partial imports do not corrupt an installation.
- Updates must run database migrations before features read newer fields.
- Release upgrades are tested with an existing character and private-pack
  fixture, not only with a clean installation.
- Package/application identifiers must not change casually because platform
  storage and upgrade identity depend on them.

## 8. Verification matrix

| Capability | Browser/PWA | Windows | Android |
| --- | --- | --- | --- |
| Offline launch | Required | Required | Required |
| Character persistence | Required | Required | Required |
| Public/private pack import | Required | Required | Required |
| Character/full backup export | Required | Required | Required |
| Restart retention | Required | Required | Required |
| Upgrade retention | PWA update | Installer update | APK update |
| Clean-install recovery | Import backup | Import backup | Import backup |
| No private data in artifact | Required | Required | Required |

## 9. Stop conditions and decision gates

- Stop after the Windows package and review results before starting Android.
- Stop after Android packaging and evaluate IndexedDB with real measurements.
- Do not add SQLite merely because the application is native.
- Do not add native inference as part of packaging; that remains a separate,
  deferred idea.
- Do not add automatic updating until manual release installation and data
  retention are reliable.

## 10. Completion outcome

The packaging phase is complete when the same application works offline as a
PWA, Windows installation, and Android installation; users can explicitly move
their characters and content packs through backups; upgrades retain local data;
and no hosted service is required.
