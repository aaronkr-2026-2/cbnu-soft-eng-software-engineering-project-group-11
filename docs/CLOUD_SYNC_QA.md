# Settings and CloudKit — implementation and release gate

2026-10-22. **NOT READY for App Store.** Real CloudKit API code is implemented, but the container, signing profiles, production schema and signed-device behavior have not been verified. Both configurations still sign with the empty `FiLog/FiLog.entitlements`, so the shipping UI reports Not configured. No successful live iCloud sync, two-device restore or reinstall protection is claimed.

## Latest revision — screenshot hierarchy and restore completeness

The latest Storage request supersedes previous layout iterations. From iCloud Storage down, dedicated Storage styles now use a mixed-case 17pt gray heading, 20pt card inset, 28pt corners, 13pt semibold titles, 13/17pt muted body/bullets, a hairline divider and a larger 36pt gap before the separate deletion card. The exact hierarchy is heading → explanatory card/title/paragraph/divider/subtitle/four bullets → deletion card → Data Protection → Data Safety card. Cards grow with translated text and Dynamic Type. No extra sections/buttons or mock bottom tabs were added. FiLog retains its existing stack navigation and safe bottom padding; the reference app’s branded three-tab bar is not reproduced. Thus this is a close layout adaptation, not a verified pixel-identical match.

Data Safety deliberately uses a neutral information icon instead of an unconditional success check. Recovery/reinstall/multi-device protections remain explicitly unverified. Cloud contents use conditional wording until the current device confirms metadata synchronization. Covers/Copy files are excluded from upload claims. The deletion card links to Apple’s guide, not a destructive endpoint or an invented iOS navigation path.

New first-install restore status is nonblocking and localized. It displays actual unique records received during download, then validation/apply, or paused/error with Retry. It does not show a guessed percentage or a blanket restore-success message. Empty cloud is merely a successful metadata check, not a restored-data claim. Offline account checks leave local usage available. Existing staged journals and foreground retries remain in place.

Roll wire records now include `frameIDs` membership metadata. If a Roll arrives before its separately uploaded frames, projection refuses to publish a truncated restore, leaves the checkpoint unadvanced and retries when those frames arrive. Known frame tombstones satisfy membership without resurrection. This is additive CloudKit metadata, not a local Roll/archive schema migration. Older cloud documents without membership remain readable but cannot prove their original frame completeness; that limitation must remain part of live-service QA. Same-field conflicts and multi-device concurrent reorder behavior still use the documented deterministic policy.

Latest results: **192 Node tests pass**, including five new cases for paged progress, interruption/restart, incomplete frame uploads, unavailable account/empty cloud and tombstoned membership. **One screenshot/navigation XCTest passes** on the already-installed iPhone 17 iOS 26.5 Simulator: activate Storage, capture top, swipe, find Data Safety, capture lower content. Test runner was generated under `/private/tmp`; FiLog was not uninstalled and no archive was cleared. TypeScript, ESLint, updated native config verifier, diff check and iOS Metro export pass. Debug Simulator and Release generic-device unsigned builds both succeed. Online Doctor remains 19/21 with the same two categories of findings below.

Checkpoint: `/private/tmp/filmer-storage-20261022/checkpoint.tgz`, plus `workspace.patch`. Logs/results: `/private/tmp/filmer-storage-20261022/`. These temporary files are review aids, not durable user backups.

### Exact files changed in this latest revision

- `src/features/settings/components/SettingsDetails.tsx`
- `src/features/settings/styles/settings.styles.ts`
- `src/i18n/settings-translations.ts`
- `src/features/cloud/services/CloudSyncEngine.ts`
- `src/features/cloud/services/cloudLabels.ts`
- `src/features/cloud/utils/cloudProjection.ts`
- `src/features/cloud/components/CloudRestoreNotice.tsx` (new)
- `app/_layout.tsx`
- `src/features/photos/services/__tests__/photoImport.test.cjs`
- `scripts/verify-ios-config.cjs`
- `docs/CLOUD_SYNC_QA.md`, `docs/CLOUD_SYNC_PLAN.md`, `RELEASE_READINESS.md`
- `docs/qa/storage-2026-10-22/{README.md,storage-top.png,storage-icloud-protection.png}`

Cleanup: removed obsolete `storageCheck` success styling and six unused Settings translation keys in all three languages: `prefsSystemSettings`, `prefsLocalStorage`, `prefsCovers`, `prefsCopies`, `prefsOther`, `prefsTotal`. Existing local measurement/cache/quality/recovery services remain. No unrelated workspace changes were reverted.

Screenshots and reference comparison: [visual QA](qa/storage-2026-10-22/README.md).

## Cleanup and UI

Main Settings now has ICLOUD → iCloud Sync / Sync Photos, DATA → Storage. Language, appearance, privacy/support remain. Removed four redundant detail implementations (Quality, Photos Access, Sync Status, Data & Recovery); old routes redirect safely. Quality remains available through App Settings and still controls Viewer. Storage uses measured compact categories, one combined saved-files row when needed, no technical totals, confirmed preview-cache clearing by tapping Photo Cache, conditional iCloud information, an informational deletion card and short Data Safety text. Sync Photos has three measured summary metrics, scan/progress/cancellation, contextual permission/retry/relink actions and affected Roll/frame/reason rows. English, Korean and Vietnamese are supported.

No archive reset, migration, original-photo deletion, cover deletion or legacy-Copy deletion was introduced. Existing invalid-archive write protection, recovery mode and repositories remain. The pre-cleanup inventory and temporary review snapshots are recorded in [CLOUD_SYNC_PLAN.md](CLOUD_SYNC_PLAN.md). Earlier Settings designs are superseded.

## Architecture and behavior

- One native `FiLogCloud` Expo module in the existing local package uses CloudKit private database, custom zone `FiLog-v1`, `CKFetchRecordZoneChangesOperation`, change tokens and change-tag conditional saves. These APIs support the existing iOS 16.4 target; no CKSyncEngine/iOS 17 requirement or dependency was added.
- Independent Roll, Photo, custom Film and custom Camera documents use stable IDs, field-level Lamport clocks, deterministic conflicts and permanent deletion tombstones. Built-in catalogs ship with the app. No full-library remote snapshot replaces local archives. Empty cloud preserves local data.
- A versioned durable SQLite KV journal is scoped to container/environment, binds to the original account, and retains pending changes, checkpoint and staged projections. Existing guarded repositories apply validated merges. Interrupted commits replay safely; intervening edits pause for review. Corrupt journals, missing known server history, account switches and unexplained physical server deletion pause rather than reset.
- Local preimages retain overwritten/deleted metadata for developer review, including prior conflict values. This is local history, not an off-device backup or user-facing undo. It can grow and does not guarantee recovery after uninstall.
- Startup, foreground activation, debounced changes and 30-second active polling trigger sync. Offline/quota errors retain pending changes and use bounded backoff. No background push guarantee. Enabling/disabling never clears local archives or the queue. After provisioning, first-install sync defaults enabled for automatic metadata merge/restore; a saved opt-out persists.
- Metadata completion and photo resolution are separate. Existing PHCloudIdentifier mapping repairs this device’s asset identifiers. Permission/missing-photo failures retain frame IDs/order/metadata and placeholders. A wire-only reference identity detects remote Relink; it may contain a source local asset identifier, but only a valid cloud identifier supports portable automatic resolution. Temporary URLs/local file paths and original image bytes are not uploaded.
- Custom cover assets and legacy Copy bytes are **not synchronized**. Existing local files remain intact. Restored Copy frames without bytes remain unavailable; restored covers are absent. Do not promise complete recovery after deleting the app. Concurrent edits to the same field select one deterministic winner; concurrent reorder operations may interleave. Local preimages preserve overwritten local metadata only.
- Storage measures logical file bytes, including SQLite WAL/SHM, rather than iOS allocated size. Settings share the database and are marked Included above. Unknown/failed measurement is not reported as zero. Cache clearing targets disposable native renders, not user files.

## Apple Developer / Xcode setup — still required

1. Use the registered `com.manhduong2003.filog` App ID and the intended paid team (current project team `ZBTP6S3362`). Enable iCloud/CloudKit, create/assign `iCloud.com.manhduong2003.filog`, and regenerate development/distribution provisioning profiles. Verify the bundle/team/container ownership before changing them.
2. In Xcode Signing & Capabilities, verify iCloud → CloudKit and the exact container. Native entitlements are already in source. Debug uses `FILOG_CLOUD_ENVIRONMENT=Development`; Release uses Production. The live environment is read from the signed entitlements: Xcode omits `icloud-container-environment` for development signing (including a Release run from Xcode), so CloudKit and the journal use Development; App Store/TestFlight export adds Production. Simulator entitlements are read from the `__TEXT,__entitlements` section because ad-hoc simulator signatures carry none. Native configuration is authoritative; do not run prebuild as a repair shortcut.
3. In CloudKit Console, validate the Development private database with a signed build. The API creates private zone `FiLog-v1`. Record type is `FiLogEntity`, with String field `document` plus system fields; records use deterministic SHA-256 names. Zone-change fetches require no query index. Validate schema/security and deploy the record type/schema to Production after Development QA. Never delete existing zones/records to hide errors.
4. Cloud availability follows the entitlements embedded in the signed executable (`FiLogCloudContainer.m`), not an Info.plist flag. To enable, set `FILOG_CODE_SIGN_ENTITLEMENTS` to `FiLog/FiLog.Cloud.entitlements` (Debug and Release) only after the container and signing are confirmed. Unsigned builds cannot verify entitlements, account access, quota or production readiness.
5. Test Development and Production independently with signed builds; namespaces/checkpoints are separate. Do not mark covers, originals or Copy bytes as protected. Recheck App Store privacy disclosures and existing release gaps.

## Required two-device / physical-iPhone QA

Use backed-up test data and two signed iPhones on the same iCloud account; never uninstall the only copy of valuable data.

1. Upgrade an existing installation containing legacy archives, custom catalogs/covers, Reference and Copy frames. Record IDs, notes, frame order and files before/after. Verify invalid archives stay protected and recovery/export remains available.
2. Initial sync on A, fresh install on B: verify stable IDs/catalog metadata/notes/order and no duplicates. Verify cloud-ID repair with Full Photos access; unresolved photos must remain placeholders. Verify covers/Copy limitations are disclosed.
3. Edit independent and identical fields offline on both devices, reorder frames, reconnect in either order, restart during pending writes. Confirm convergence and retained metadata preimages. Delete a test Roll/frame, reconnect an older offline device and confirm tombstones prevent resurrection.
4. Disable/re-enable sync, terminate/relaunch, simulate network loss/quota errors and token expiry. Local edits remain durable. Sign out and change account: existing journal must pause without mixing accounts or wiping local data.
5. With a second safe copy, test reinstall and new-device metadata restore separately. Do not declare full recovery if photos/files are unresolved. Test missing known cloud records/zone deletion with disposable data; require review, never silently republish an old library.
6. Photos: Full/Limited/Denied access, offline iCloud-only assets, deleted originals, Retry, Relink on A then sync to B, app restart. Check frame positions/IDs and accurate errors; originals never deleted. Verify scan cancellation and failed-only retry scope.
7. UI: Storage/Sync Photos navigation, old-link redirects, safe areas, long names, small/large iPhones, Dynamic Type, English/Korean/Vietnamese, scrolling and cache confirmation. Compare actual measured categories with files. Verify iOS iCloud storage visibility on the target OS before documenting any direct app-data deletion path; current UI offers information only.

## Verification evidence

- TypeScript, ESLint, native iOS config and `git diff --check`: pass.
- Previous Node unit/integration suite: **187 pass, zero failures/skips**. Uses actual repositories/stores with simulated native IO/CloudKit transport; not a live Apple service test. Covers upgrades, empty cloud, offline restart, conflict/CAS, tombstones, account changes, restore ordering, cloud-ID remapping, staged recovery, corruption, write failures and legacy-file retention.
- iOS Debug Simulator and Release generic-device workspace builds: **BUILD SUCCEEDED**, unsigned (`CODE_SIGNING_ALLOWED=NO`). Native Swift compiles/links; signing and live CloudKit remain unverified.
- Metro iOS export passes. Online Expo Doctor: **19/21**. Remaining maintained-native config warning and patch mismatches: expo 57.0.29 → ~57.0.31; location 57.0.21 → ~57.0.22; router 57.0.27 → ~57.0.29; sharing 57.0.23 → ~57.0.24. Dependencies were not changed; no prebuild.
- Simulator main Settings screenshot reviewed: correct groups and Not configured state, no launch crash. This does not establish complete navigation/accessibility/device QA.
- Logs: `/private/tmp/filmer-cloud-{tests,debug,release,doctor,export}.log`. Temporary logs/snapshots are not permanent backups.

## Files changed by this phase

Native: `modules/filog-photos/ios/FiLogCloudModule.swift`, `modules/filog-photos/ios/FiLogPhotos.podspec`, `modules/filog-photos/expo-module.config.json`, `ios/FiLog/Info.plist`, `ios/FiLog/FiLog.entitlements`, `ios/FiLog.xcodeproj/project.pbxproj`, `ios/Podfile.lock`.

Cloud: `src/features/cloud/services/{CloudSyncEngine,cloudSync,cloudLabels,retainLocalPreimages}.ts`, `src/features/cloud/utils/{cloudModel,cloudProjection}.ts`.

UI/localization: `app/_layout.tsx`, `app/settings.tsx`, `app/settings/[section].tsx`, `src/features/settings/components/{SettingsDetails,SettingsPage}.tsx`, `src/features/settings/styles/settings.styles.ts`, `src/i18n/{settings-translations,translations}.ts`.

Integration: `src/features/{rolls,films,cameras}/store/{rollStore,filmStore,cameraStore}.ts` (respective feature/store), `src/features/settings/services/{ReferenceRepairService,PhotosAccessService}.ts`, `src/features/photos/services/PhotoReferenceService.ts`, `src/features/photos/services/__tests__/photoImport.test.cjs`.

Documentation: this report, `docs/CLOUD_SYNC_PLAN.md`, `docs/SETTINGS_QA.md`, `RELEASE_READINESS.md`, `APP_STORE_GAP_ANALYSIS.md`. Other pre-existing workspace modifications (startup/icons/home/native photo picker, etc.) are retained and are not claimed as this cleanup’s changes. No commit created.

## Apple documentation checked for this revision

- [Deploying an iCloud Container’s Schema](https://developer.apple.com/documentation/cloudkit/deploying-an-icloud-container-s-schema): Development validation and Production schema deployment remain separate release steps. No live schema deployment was performed here.
- [Manage iCloud storage on your Apple device](https://support.apple.com/108922): current Apple guidance for overall usage/management. This does not prove FiLog-specific CloudKit data is visible under a particular Settings path on every iOS version; the app deliberately avoids promising that path.
- [CloudKit design guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/DesigningforCloudKit/DesigningforCloudKit.html): private databases and environment separation. Service architecture alone does not verify FiLog’s reinstall recovery; actual signed-device testing is required.
