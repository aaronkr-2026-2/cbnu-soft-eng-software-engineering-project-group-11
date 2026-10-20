> Historical snapshot from the Reference-only task, before the comprehensive audit. Current status, catalog fixes, tests and build results are in [RELEASE_READINESS.md](../RELEASE_READINESS.md).

# FILMER — Reference-only hardening follow-up

2026-10-15 (Asia/Seoul). This focused report describes the actual restored checkout. The older release-readiness report and I-03 recovery implementation were absent at the start of this task; this is not a claim that earlier release work remains implemented.

## Confirmed defects and scope

- `ApplePhotosProvider.ts` previously substituted a temporary picker URI when `assetId` was null and persisted picker URIs in `thumbnailUri`.
- `resolvePhotoUri.ts`, Grid, Viewer and Roll thumbnails previously displayed that URI without checking Photos. A deleted original could continue to appear from a cached/exported picker image.
- `RollRepository.load()` previously threw JSON/validation/SQLite errors during Zustand module initialization. This reproduces the code path behind **Invalid saved Roll archive**, rather than an image-cache problem.
- Copy preference remains stored for compatibility, but the production import path ignores it. Copy selection is hidden. Copy types, storage, copy service and owned-file protections remain intact. No data migration, app uninstall, database reset or original-photo deletion was performed.

## Implementation status

| Area | Status | Evidence / remaining verification |
| --- | --- | --- |
| Reference-only picker | Implemented; native device behavior unverified | `modules/filmer-photos/ios/FilmerPhotosModule.swift`: PHPicker with the shared photo library, image filter, ordered selection. Only identifiers/creation dates are returned; **no item-provider image/file load**. `src/features/photos/providers/ApplePhotosProvider.ts`: request read access and verify each non-null ID before persistence. |
| Photos resolution | Implemented; native device behavior unverified | Same Swift module uses `PHAsset.fetchAssets(withLocalIdentifiers:)` globally, never album membership. Thumbnail target is bounded (default 512 pixels; contact sheet 1200); current viewer explicitly requests full resolution. `PHImageRequestOptions.isNetworkAccessAllowed = true`, final-image delivery, 45-second timeout and retryable failures. |
| Permission/deletion distinction | Implemented; native device behavior unverified | Authorized missing asset → unavailable; denied/restricted/not determined → access required; limited missing asset → limited, **not a deletion assertion**. Accessible limited assets still resolve. iCloud/network/cancellation/encoding errors → temporary error. iOS cannot prove deletion for an asset outside the limited selection. |
| Cache safety | Implemented; mocked lifecycle tests pass | `PhotoReferenceService.ts`: every cache lookup verifies current asset access; session cache capped at 256 entries, purged-file regeneration, coalesced in-flight requests, revision guards. `useResolvedPhoto.ts` / `useResolvedPhotos.ts`: discard old results on foreground/library changes. Unique temporary JPEG render paths prevent reuse of an old URI. Native cleanup expires only its own renders older than 24 hours when producing a new render. Clear Image Cache removes derived renders and expired share files only. Cached contact-sheet exports verify source availability before every Save/Share, including reuse of an existing rendered sheet. |
| Missing-photo UI | Implemented; device layout/gestures unverified | Localized EN/VI/KO states in Grid, thumbnails and Viewer. Import failures offer Manage Photos Access; Viewer offers Retry; denied opens Settings; limited opens the supported Photos permissions picker. Selection/reorder gestures and frame records are retained. |
| Relink | Implemented; device picker unverified | `PhotoRelinkService.ts`: single selection, verify again before save, detect concurrent frame changes. Store replaces only assetId/localIdentifier and removes stale thumbnailUri, retaining frame ID/order/details and Roll metadata. Cancel/failure performs no commit. |
| Legacy Copy | Retained; integration fixtures pass | `PhotoStorageService.ts` still rebases owned Documents paths; sharing, exporting, removal and shared-file protection tests retained. No Documents image directory was cleaned or migrated. |
| Archive recovery | Implemented; UI/device fault injection unverified | `validateRollArchive.ts`, `RollRepository.ts`, `rollStore.ts`, `ArchiveRecoveryScreen.tsx`: explicit recovery, write lock, retry, original-text export. Root blocks normal routes in recovery. No mock fallback. Read-before-write guards prevent overwriting a changed/unreadable archive. |
| Native build | See verification below | New module requires a rebuilt native app; a Metro reload or Expo Go cannot add native code. Existing Debug C++ linker failure remains a release blocker for Debug installation. |

## Archive compatibility and safety

The existing `filmer.rolls.v1` SQLite KV key is unchanged. Supported payloads are the existing unversioned Roll array and an explicit `{ schemaVersion: 1, rolls: [...] }` envelope. Unknown/future versions enter recovery unchanged. Envelope properties outside `rolls` are retained on writes; Roll/photo unknown fields also survive. No relational migration or automatic rewrite runs on load.

Validation covers Roll/frame identifiers and duplicates (frame IDs and sortOrder uniqueness **within each Roll**, allowing shared records across Rolls), supported providers/formats, nonnegative integral order, dates, notes, locations, frame counts, film overrides, owned Copy paths and relative Film-cover paths. Traversal, absolute/encoded path tricks and invalid metadata enter recovery. Legacy Reference records whose assetId is a picker URI are retained but their stale image is not shown; Relink repairs them explicitly. No automatic frame renumbering or removal occurs on load.

An absent key starts empty without a write. A failed read is **not** treated as an absent key. Failed JSON/validation loads retain the original string for export. If SQLite cannot return text, export is unavailable until a successful read (or a previously captured raw string exists). Retry never repairs or replaces data automatically. Emergency export is plain original text for troubleshooting, not metadata backup/restore, cloud backup, or automatic recovery.

New Roll IDs add a sequence/random suffix to the timestamp, avoiding duplicate IDs when archive validation checks rapid creation. Existing IDs are never regenerated. Writes still commit before publishing; a failed save leaves frame references and owned files intact.

## Exact changed files for this task

Prior film-catalog/artwork/thumbnail edits in the working tree predate this task and are not part of this Reference change.

- Native: `modules/filmer-photos/expo-module.config.json`, `modules/filmer-photos/ios/FilmerPhotos.podspec`, `modules/filmer-photos/ios/FilmerPhotosModule.swift`, `ios/Podfile.lock` (only local FilmerPhotos added; no locked dependency version upgrade).
- App entry/settings/Roll wiring: `app/_layout.tsx`, `app/settings.tsx`, `app/rolls/[id].tsx`, `src/store/app-store.ts` (catch SQLite settings read failures at startup).
- Photo import/resolution: `src/features/photos/providers/ApplePhotosProvider.ts`, `src/features/photos/services/PhotoReferenceService.ts`, `src/features/photos/services/PhotoRelinkService.ts`, `src/features/photos/utils/resolvePhotoUri.ts`, `src/features/photos/hooks/useResolvedPhoto.ts`, `src/features/photos/hooks/useResolvedPhotos.ts`.
- Photo consumers/cache: `src/features/photos/components/PhotoResolutionStatus.tsx`, `src/features/photos/components/PhotoViewerModal.tsx`, `src/features/photos/components/ReorderablePhotoGrid.tsx`, `src/features/photos/services/ImageCacheService.ts`, `src/features/photos/services/PhotoShareService.ts`, `src/features/photos/services/PhotoExportService.ts`, `src/features/rolls/components/RollThumbnailStrip.tsx`, `src/features/contact-sheet/components/ContactSheetPreview.tsx`, `src/features/contact-sheet/services/ContactSheetExportService.ts`.
- Persistence/recovery: `src/features/rolls/data/validateRollArchive.ts`, `src/features/rolls/data/RollRepository.ts`, `src/features/rolls/store/rollStore.ts`, `src/features/rolls/components/ArchiveRecoveryScreen.tsx`, `src/features/rolls/services/ArchiveRecoveryService.ts`.
- Localization/tests/docs: `src/i18n/translations.ts`, `src/features/photos/services/__tests__/photoImport.test.cjs`, `src/features/photos/utils/__tests__/photoSelection.test.cjs`, `src/features/contact-sheet/utils/__tests__/contactSheet.test.cjs`, `src/features/photos/REFERENCE_MODE.md`, `src/features/photos/COPY_IMPORT.md`, this file.

## Verification

- Installed APIs inspected: Expo **57.0.27**, React Native **0.86.3**, expo-media-library **57.0.5**, expo-image-picker **57.0.20**, expo-file-system **57.0.7**, expo-sqlite **57.0.4**, existing ExpoModulesCore. Read the installed TypeScript definitions and iOS implementations before choosing APIs. SDK 57 Asset.getUri does not expose the requested thumbnail-size controls, so a local Expo module supplies PhotoKit/PHPicker. No npm dependency was added or upgraded.
- TypeScript: `npx tsc --noEmit` passed.
- All tests: **110 passed** at the last completed run. Real TypeScript modules are transpiled in the existing Node harness; native Photos/SQLite/filesystem are mocked. Legacy Copy tests explicitly create fixtures via retained Copy code, not the MVP production picker. iCloud/permissions/album outcomes are mocked contract tests; actual PhotoKit behavior still needs the device checks below.
- Tests cover verified Reference/restart, original deletion with warm cache, album-only removal, denied/limited access, iCloud offline/retry/full-vs-thumbnail requests, missing/null/fake identifiers, relink success/cancel/verification/write failures, unchanged legacy Copy behavior, malformed JSON/future schema/invalid paths/duplicate IDs/metadata, read/write failure, recovery retry, raw export fidelity/failure, foreground/library invalidation and stale-request UI cancellation. Roll deletion tests never call Photos deletion APIs.
- `git diff --check` passed at the last completed check.
- Final Metro iOS export passed: `/private/tmp/filmer-reference-export-verified` (log `/private/tmp/filmer-reference-export-verified.log`).
- `pod install --no-repo-update` integrated the local module. First sandboxed attempt could not resolve CocoaPods CDN; the permitted network-enabled run succeeded, without force or repo update. CocoaPods reports an existing leading-newline Info.plist parsing warning; `plutil -lint ios/FILMER/Info.plist` passes. That unrelated file was not rewritten.
- Unsigned Debug, generic **physical iOS arm64** destination: Swift module compiled, final **FILMER link failed** (exit 65) with React Native C++ undefined symbols including `facebook::react::Sealable::Sealable()`, `Sealable::~Sealable()`, `ShadowNode::getDebugName() const`, `ShadowNode::getDebugChildren() const`. References arise in RNGestureHandler, RNReanimated and RNScreens. Final log: `/private/tmp/filmer-reference-debug-final.log`. The final PHPicker module compiled successfully before this linker failure. No broad RN/Hermes/CocoaPods configuration change was made in this task.
- Unsigned Release, generic physical iOS arm64 destination: initial and refreshed-podspec runs **BUILD SUCCEEDED**. The final source-validation follow-up also **BUILD SUCCEEDED** (exit 0); log `/private/tmp/filmer-reference-release-verified.log`.
- **No app installation, launch, real-iPhone Photos test or TestFlight test was performed.** No connected device's data was accessed/reset.

Commands (project root):

```sh
npx tsc --noEmit
node --test src/features/films/utils/__tests__/catalog.test.cjs src/features/photos/services/__tests__/photoImport.test.cjs src/features/photos/utils/__tests__/photoSelection.test.cjs src/features/rolls/utils/__tests__/browseRolls.test.cjs src/features/contact-sheet/utils/__tests__/contactSheet.test.cjs
git diff --check
npx expo export --platform ios --output-dir /private/tmp/filmer-reference-export-verified
(cd ios && pod install --no-repo-update)
xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-reference-debug CODE_SIGNING_ALLOWED=NO build
xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-reference-debug CODE_SIGNING_ALLOWED=NO build
```

## Required physical-iPhone verification / remaining release risks

Use expendable test photos and a test archive. **Do not uninstall FILMER or inject corruption into a valuable production database.** For update testing, install a signed build over the existing app with the same bundle ID/team; do not remove the old app. Resolve the existing Debug linker issue separately, or use a signed Release/TestFlight build. New native code cannot be tested by JS reload alone.

1. Record existing Roll IDs, order, notes, custom covers and a legacy Copy frame. Update in place; confirm these remain and custom-owned Documents files are readable. Cold launch twice. Existing custom Film/Camera stores in this restored checkout are memory-only; their persistence remains a separate pre-existing release risk, not fixed or claimed here.
2. Grant full Photos access. Import images from an album; confirm multiple selection order. Verify archive fields contain real assetId/localIdentifier, no new thumbnailUri/localUri/documentPath for References, and no Documents image copies. Kill/relaunch, open Grid/Recently/Viewer, zoom/page/rotate, exercise long-press reorder and selection drag.
3. Warm Grid/Viewer caches. Delete one **test original** from Apple Photos (not just its album), return to FILMER: frame stays in place with **Photo unavailable**, metadata/order retained. Sharing/Save/contact-sheet export must not use the stale image. Remove another image only from its album: it must remain accessible.
4. In Settings → FILMER → Photos switch to denied, return: **Photos access required**, no old cached image. Restore limited access excluding one frame: **Photo access limited**, not a deleted assertion. Use Viewer Retry to open the Photos access picker; grant that frame, return and confirm recovery. Test null PHPicker identifiers if reproduced; failed selections must show the recoverable access message and must not create fake references.
5. Use an actual optimized-storage iCloud-only image. Online: loading then correct thumbnail/full Viewer. Offline: retryable failure after timeout; enable network and Retry. Foreground/library change during download must not publish an obsolete image. Measure memory with large scans and smoothness with 36+ frames. Full-view render is a temporary JPEG derivative; originals/RAW/HEIC files stay in Photos unchanged.
6. For an unresolved frame choose Relink Photo: Cancel changes nothing; successful replacement retains original frame ID/order/date/location/note; denied/offline/write failure keeps the old record. Confirm original Apple Photos assets still exist after deleting a FILMER Roll. Repeat sharing/contact-sheet export against available References and legacy Copy frames.
7. Clear FILMER image cache, cold launch and repeat available/unavailable cases. Confirm legacy Copy and custom covers survive. Test cache file eviction and iCloud retry. Check EN/VI/KO layouts and accessibility/large text for all statuses.
8. Only in a disposable development container, seed malformed JSON, invalid Copy path, duplicate IDs and future schema; cold launch must show recovery, never navigation into an empty archive. Export original text to Files, compare exact text; Retry failure preserves it. Supply a known valid archive out of band in that test container, Retry and verify Rolls return. Simulate read failure and disk-full write failure without touching user data.

Release still requires real-iPhone/TestFlight verification, signing, the existing Debug linker repair if Debug is required, and separate resolution of the restored checkout's existing catalog-durability risks. Local PhotoKit identifiers are device-library references, not portable/cloud backups. Uninstalling the app can remove Roll metadata and legacy owned files; original Apple Photos assets are not deleted by FILMER Roll removal.

The local PhotoKit module targets iOS only. Android/Web Reference import is not verified or implemented by this module; missing native support produces a recoverable import error, not a startup exception.

Final verification: TypeScript passed; **110/110 automated tests passed**; `git diff --check` passed; Metro iOS export passed; unsigned generic-device Release build passed. Debug remains blocked at the documented React Native C++ arm64 link phase. No physical-device installation or launch was performed.
