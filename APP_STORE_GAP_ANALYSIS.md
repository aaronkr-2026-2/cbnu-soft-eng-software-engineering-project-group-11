# FILMER 1.0 — App Store gap analysis

## Authoritative update 2026-10-22 — simplified Settings and real CloudKit source

**NOT READY for App Store.** Native private-CloudKit metadata sync, durable per-record journal, deterministic field conflicts, tombstones, guarded merge/restore and PhotoKit recovery integration are implemented. `FILMERCloudSyncProvisioned` remains **false** until Apple Developer signing/container/schema setup and live tests are complete. No live iCloud, two-device or reinstall protection is verified. Covers and legacy Copy bytes are not synchronized; originals remain in Apple Photos.

Settings now exposes only iCloud Sync / Sync Photos and Storage in the relevant groups. Earlier multi-page Settings proposals below are historical and superseded. Existing repositories, archives, covers and legacy files are preserved.

Verification: **187 passing automated tests**, TypeScript, lint, native config, Metro export and diff checks pass; **Debug Simulator and Release generic-device unsigned builds succeed**. Online Expo Doctor remains **19/21** (maintained-native configuration warning plus four Expo patch updates). Simulator main Settings inspected; physical-iPhone, signed CloudKit, upgrade/reinstall and two-device conflict QA remain release blockers. Full architecture, limitations, exact changed files, Apple setup and QA: [Cloud Sync QA](docs/CLOUD_SYNC_QA.md).

## Historical implementation reports


## Update 2026-10-22 — Storage & Data Protection refinement

Storage now includes a measured-total summary, inline viewing-quality controls using the existing preference, explicit unconfigured CloudKit information, device-specific photo-link/recovery limitations, and local-only cover/legacy-Copy protection disclosures. No CloudKit engine, Copy import, Wi-Fi-only switch, schema migration or data reset was introduced. Cache errors report measured partial completion instead of implying rollback; retained user files are covered by regression tests. Reference checking now uses cached indexes for large libraries and shows an unresolved total.

Validation: **161/161 Node tests**, TypeScript, lint, iOS config and unsigned Simulator Debug workspace build pass. Online Expo Doctor remains **19/21** (maintained-native config warning and four available Expo patch updates). Physical-device/iCloud QA remains required. Full details, touched files and manual steps: [Settings QA](docs/SETTINGS_QA.md). Earlier results below are historical. App Store status remains **NOT READY** until existing release gaps and device QA are resolved.


## Update 2026-10-22 — Settings, storage and reference verification

Implemented main Settings plus Storage, Photo Quality, Photos Access, Sync Photos (metadata-only reference verification/repair), Sync Status and Data & Recovery. All new strings are localized in English/Korean/Vietnamese. Quality persists in the existing settings record with a safe Optimized default; Roll schemas and catalog/archive IDs are unchanged. Preview clearing measures bytes first, confirms, and removes only native derived JPEG renders. Legacy copies and Apple Photos originals remain supported and untouched by cache clearing.

**CloudKit is not implemented.** Coming Later / Not configured are explanatory states, not functional sync. No cloud upload/delete, account check, guaranteed backup/restore, or encryption claim was added. Device transfer still depends on actual iOS backup/transfer and optional PhotoKit cloud-identifier recovery.

Current verification: TypeScript, lint (no warnings), iOS config check, **156/156 Node tests**, unsigned Simulator Debug workspace build and iOS Metro export pass. Online Expo Doctor **19/21**: maintained-native config warning plus available patch updates for Expo, expo-location, expo-router and expo-sharing. Dependencies were not upgraded and prebuild was not run. Physical iPhone, real iCloud/backup recovery, small/large screen and Dynamic Type QA remain required. See [Settings QA](docs/SETTINGS_QA.md) for behavior, measurement scope, files, limitations and manual steps. Earlier results below are historical and do not supersede this update. Overall App Store readiness remains **NOT READY** pending device QA and existing release gaps.


Audit date: **2026-10-20 (Asia/Seoul)**. Overall status: **NOT READY**.

This is an audit and plan, not an implementation. Application code, dependencies, schemas, signing settings and existing release documents were not intentionally changed by this audit. No installation, device reset, upload or signed Archive was performed. Build/export artifacts and logs are in `/private/tmp`.

Baseline: branch `main`, HEAD `5629f09` (`feat: expand film catalog and improve photo archive management`). The audited working tree also includes the pre-existing, uncommitted startup change: `app/_layout.tsx`, `src/i18n/translations.ts`, `src/features/startup/StartupScreen.tsx`. Conclusions apply to this working tree, not solely to HEAD. `RELEASE_READINESS.md` and both October 15 audit documents were read first; their results are historical unless explicitly rerun below.

## A. Project overview

FILMER is a local-first Expo Router application. Active routes cover Home, Settings, Film selection, Cameras, Roll information/create, Roll detail and Roll edit. Feature modules separate stores, persistence, UI and photo services. `package.json:16` specifies Expo `~57.0.29`, React Native `0.86.3`, React `19.2.3`, TypeScript `~6.0.3`, Zustand `^5.0.0`, SQLite, Reanimated, Gesture Handler, native Maps, sharing and image capture. Hermes and the new architecture are enabled (`ios/Podfile.properties.json:2`, `ios/FILMER/Info.plist`). Installed dependencies were used without upgrades.

Persistence is **SQLite KV containing JSON**, not the relational tables in `src/database/database.ts:3`. That migration helper has no active caller found. Independent keys are `filmer.rolls.v1`, `filmer.films.v1`, `filmer.cameras.v1`, `filmer.settings.v1`; Zustand stores load synchronously during module initialization. Drafts and render caches are session-only. Cover files and legacy Copy files use Documents-relative paths. User metadata is not a cloud backup.

The checked-in `ios/` project is authoritative. Expo plugins do not automatically apply edits to the maintained Info.plist/Xcode project; do not run a destructive prebuild to remove Doctor warnings. See `docs/NATIVE_CONFIGURATION.md:1`. Native PhotoKit is a local Expo module (`modules/filmer-photos/expo-module.config.json`, `FilmerPhotos.podspec`), so Expo Go cannot validate Reference import. A rebuilt native application is required.

No backend, user account, subscription, advertising client or analytics SDK integration was found in active app source. Native iCloud Photos, Maps/geocoding and explicit sharing can still use network services. This observation is not a network-capture or third-party privacy certification.

## B. Current feature completeness matrix

**IMPLEMENTED** means source exists and applicable automated contracts pass; it does not mean hardware verified. **PARTIAL** means a material subset exists; **MISSING** means absent in inspected source; **BROKEN** means a specific code path fails; **UNVERIFIED** means evidence is insufficient. Device qualification is listed separately to avoid implying mock tests establish native behavior.

| Journey / capability | Status | Current evidence / limits |
| --- | --- | --- |
| First launch / empty archive | IMPLEMENTED; device UNVERIFIED | `RollRepository.ts:17` treats absent key as empty without writing; `app/index.tsx` renders search/grouping/empty UI. No login or forced initial permission request. |
| New startup loading UI | PARTIAL; runtime UNVERIFIED | `StartupScreen.tsx:16` warms up to six Rolls/four thumbnails each, three workers, six-second deadline; `_layout.tsx:27` gates navigation. Does not defer synchronous database initialization or guarantee all images loaded. |
| Create Roll | IMPLEMENTED | `RollInformationScreen.tsx:64`, `rollStore.ts:115`; validated film/camera/month/format, durable ID, save before publishing. Native navigation/rapid-tap QA remains. |
| View/search/group Rolls | IMPLEMENTED | `app/index.tsx`, `useRolls.ts`, `filterRolls.ts`, `groupRolls.ts`; All/Date/Film/Camera/Location and localized month search tested. |
| Film selection / custom creation | IMPLEMENTED | `FilmSelectionScreen.tsx:31`, `FilmForm.tsx:36`, `filmStore.ts:9`; 261 entries documented/tested, aliases/local covers, custom persistence and rollback. |
| Camera selection / custom creation | IMPLEMENTED | `app/cameras.tsx`, `CustomCameraModal.tsx:20`, `cameraStore.ts:15`; cover copying and persistence guarded. |
| General catalog edit/delete | MISSING | Film/Camera store APIs expose add/retry only (`filmStore.ts:8`, `cameraStore.ts:7`). Roll-specific Film override editing exists. Optional for smallest v1; do not market full catalog CRUD. |
| Add one/multiple Reference photos | IMPLEMENTED | `ApplePhotosProvider.ts:7`, `PhotoImportService.ts:11`, native module `:25`; verified identifiers only, one commit, duplicate filtering. |
| Import picker tap and drag selection | IMPLEMENTED; native interaction UNVERIFIED | `ReferenceSelectionViewController.swift:206`, `:216`, `:250`; horizontal start, cross-row range, reverse/deselect and edge scrolling. 16 Swift assertions test the model, not UIKit. |
| Existing gallery multi-select / drag | IMPLEMENTED; native arbitration UNVERIFIED | `usePhotoSelectionGesture.ts:15`, `ReorderablePhotoGrid.tsx:72`; additive ranges, tap, Select All, exit. Active range locks outer scrolling; no gallery edge auto-scroll implementation found. Native import picker has its own edge scrolling. |
| Frame ordering | IMPLEMENTED; write-error UX BROKEN | `rollStore.ts:107`, `:131` preserve/import after maximum sortOrder; grid reorders and accessibility moves. UI does not catch persistence failures (C-01). |
| Roll gallery | IMPLEMENTED; large-library performance UNVERIFIED | `app/rolls/[id].tsx:64`, grid `:95`; sorted frames, placeholders, Add tile. All tiles mount inside ScrollView; not virtualized. |
| Individual viewer | IMPLEMENTED; hardware UNVERIFIED | `PhotoViewerModal.tsx:96`, `:357`, `:425`; paging, pinch/double-tap, rotate, notes/date/location, share, unavailable controls. Rotation is session presentation, not an edit to Photos originals. |
| Retry / Relink | IMPLEMENTED | Viewer `:459`, `PhotoRelinkService.ts:4`; ID/order/details retained, cancel/failed verification/save do not commit. |
| Edit Roll / discard | IMPLEMENTED; legacy date PARTIAL | `app/rolls/[id]/edit.tsx:12`, shared form `:44`, `:69`; isolated draft, guarded save/discard. Legacy exact-day date requires explicit month reselection before edits can save (C-03). |
| Delete Roll / remove frames | IMPLEMENTED | Detail `:103`, `rollStore.ts:65`, `:79`, `useBatchPhotoActions.ts:51`; confirmations, commit before owned Copy cleanup; no Photos-original deletion path found. |
| Restart/persistence | IMPLEMENTED at JS contract; device UNVERIFIED | Roll/catalog restart, write-failure, custom-cover and ordering tests pass with mocked native IO. |
| In-place upgrade / rollback | UNVERIFIED | Legacy arrays/v1 envelopes/Copy refs accepted without startup rewrite. No old installed binary/data upgrade test or rollback matrix executed. |
| Empty/error/recovery states | IMPLEMENTED; some errors PARTIAL | Missing Roll, permission/limited/unavailable/temporary errors, raw export and recovery UI exist. Reorder/metadata save errors bypass user feedback. |
| Share / save / contact sheets | IMPLEMENTED; native receiver UNVERIFIED | `PhotoShareService.ts:26`, `PhotoExportService.ts:7`, `ContactSheetExportService.ts:18`; source revalidation, partial failures and temporary file lifecycle tested. Explicit Save creates a new Photos asset; Reference import does not. |
| Existing Copy data compatibility | IMPLEMENTED; installed legacy data UNVERIFIED | `PhotoStorageService.ts:22`, resolver `:63`; relative rebasing retained. New Copy import is out of scope and ignored by production importer. |
| Language / theme / location | IMPLEMENTED | EN/VI/KO, light/dark, optional foreground location and native search. Native system permission text is English; device/iPad/accessibility QA outstanding. |
| Privacy/support entry point | MISSING | `app/settings.tsx:43` contains only language, appearance and storage; no policy/support URL in active routes. |

Source prefixes used above: Roll files `src/features/rolls/`; photo files `src/features/photos/`; Film files `src/features/films/`; Camera files `src/features/cameras/`; native files `modules/filmer-photos/ios/`.

## C. Confirmed bugs and risks

### C-01. Persistence errors escape reorder and photo metadata callbacks — P1

`rollStore.ts:40` deliberately throws on a failed save and publishes only after successful persistence. This protects existing data. However, `app/rolls/[id].tsx:75` calls `reorderPhotos` without try/catch and `:141` passes `updatePhoto` directly to Viewer. `PhotoInfoSheet.tsx:28`, `:62`, `:63` call that callback for notes/date/location without error handling. Grid `ReorderablePhotoGrid.tsx:77`/`:82` forwards reorder/accessibility moves directly; visual positions already changed locally.

Trigger: storage full/write failure, or validation failure, during drop/accessibility reorder or note/date/location save. Result: thrown JS error reaches the event/worklet callback, no reliable save-failed message or visual rollback. A native-process crash is **not established**; failed metadata/order updates remain uncommitted. Existing tests exercise store failures, not all these UI error paths. Catch failures, restore authoritative order/draft, retain edits and offer retry. This should be addressed before distributing a reliable beta.

### C-02. Optional frame count cannot be cleared — P2

`RollTextEditor.tsx:16` rejects blank numeric text; `RollInformationScreen.tsx:108` always converts accepted text with `Number(value)`. The October 15 report described blank becoming zero; **current code rejects blank earlier**. Confirmed user-visible defect is still inability to return an existing count to optional/undefined, not a demonstrated persisted zero. Existing archive is unchanged. Permit blank and map it explicitly to undefined; test clear/save/restart.

### C-03. Legacy exact-day Roll dates are accepted but fail edit validation — P2

`validateRollArchive.ts:43` accepts `YYYY-MM-DD`, `newRollDraftStore.ts:49` retains it, while `rollDraft.ts:12` accepts only `YYYY-MM`. Opening an older Roll then changing only its notes will fail the generic draft validation until the user chooses a month. No destructive migration occurs. Support the legacy date in the edit adapter/validator without rewriting other records; preserve the day unless the user deliberately changes it. Verify against a real previous-installation fixture. Escalate to P1 if this is common in the intended upgrade population.

### C-04. Startup and launch screen are only partly validated — P1 verification / P2 polish

The new React loading screen paints after stores have already synchronously parsed entire archives (`rollStore.ts:51`, `filmStore.ts:10`, `cameraStore.ts:11`, `app-store.ts:19`). It cannot cover slow JS initialization. Its six-second timer releases the UI but cannot cancel already issued native requests (native `resolve` has a separate 45-second timeout). `StartupScreen.tsx:30` uses a direct built-in ID lookup instead of `resolveRollFilm` alias handling, so old film aliases may miss cover warming; normal card rendering still has its resolver. Deadline completion means partial warming is expected, not a failed startup.

Native launch storyboard `ios/FILMER/SplashScreen.storyboard:22` names image `SplashScreen`, while `:42` declares `SplashScreenLogo`; inspected xcassets contains only AppIcon, no matching splash imageset. **Source resource mismatch confirmed; actual launch appearance unverified.** Passing `check:ios-config` checks storyboard existence (`scripts/verify-ios-config.cjs:17`), not its image references. Verify cold start/deep links/dark mode/offline/large archives and repair resource wiring if the logo is absent; a blank decorative logo is not itself evidence of a crash.

### C-05. Device and release qualification remain unknown — P1

Native full-size resolution requests `PHImageManagerMaximumSize`, then JPEG-encodes on the main queue (`FilmerPhotosModule.swift:69`, `:79`, `:95`). This can allocate a large decoded scan plus JPEG bytes and block UI; real peak memory/time is unmeasured. Picker range updates rebuild selection/order and badges repeatedly (`OrderedPhotoSelection.swift:25`, picker `:163`); gallery mounts all thumbnails. These are performance risks, not measured crashes. Test large scans, 100+ selected frames, rapid paging and a large library on hardware before selecting a fix.

### C-06. Missing policy and uncertain submission assets — P1

No in-app policy link exists, and no repository-owned published privacy/support URL or App Store screenshot/metadata package was found. App Store Connect may contain them; account state was not accessed. Bundled artwork has documented inaccurate printed labels (`src/features/films/data/README.md:82`) and provenance (`assets/films/source/INVENTORY.md:3`), but provenance does not establish distribution rights. Owner must confirm permissions/rights and avoid affiliation or archival-fidelity claims not supported by the assets. Do not assume generated imagery automatically clears branding rights.

### C-07. Security/dependency clearance is incomplete — P1 review

Earlier `RELEASE_READINESS.md` records 33 advisories, including a critical shell-quote advisory. Current `package-lock.json:10193` still contains shell-quote `1.10.0`; that confirms the package version, **not current exploitability or advisory count**. A fresh registry security audit was not completed. Do a read-only current advisory inventory and assess development/build versus reachable shipped paths before choosing compatible targeted fixes; do not use an indiscriminate force upgrade. No production exploit is claimed by this audit.

### C-08. Online Expo SDK recommendations changed — P1 compatibility review

After explicit owner approval, current Expo Doctor completed its online checks: **19/21, exit 1**. It reports installed Expo `57.0.29` versus expected `~57.0.30`, and installed expo-router `57.0.27` versus expected `~57.0.28` (`package.json:17`, `:25`; `/private/tmp/filmer-audit-doctor-online-approved.log`). Schema and React Native Directory checks pass online. The other failure is the documented maintained-native config warning. This supersedes the October 15 20/21 result and the current offline compatibility pass; it does not invalidate the successful builds or establish a runtime bug. Review these two patch changes, align only after implementation authorization, reconcile affected pods if needed, then repeat checks/builds. No packages were upgraded in this audit.

No confirmed **P0 destructive migration, automatic original deletion, or unconditional startup crash** was identified in the inspected paths. Unknown hardware behavior is not a passed check.

## D. Missing v1.0 functionality and smallest scope

The requested core product is largely implemented. Remaining mandatory work is reliability/error handling, native/device qualification, privacy/release packaging and evidence, rather than a new feature set.

Freeze v1 to Roll create/view/edit/delete, existing Film/Camera selection and custom creation, Reference-only scan import, frame organization, Viewer, unavailable states, Retry/Relink and already shipped share/contact-sheet actions after smoke testing. Preserve existing Copy records/files. Do not add Copy Mode, authentication, sync, albums/search in the import picker, automatic backup/restore, general catalog CRUD or redesign as prerequisites. General catalog edit/delete is an explicit limitation to communicate, not a hidden mandatory expansion.

## E. Reference Mode audit

| Concern | Confirmed implementation | Qualification still required |
| --- | --- | --- |
| Durable identifiers | Native picker returns PHAsset `localIdentifier`; JS verifies each ID then persists `assetId`/`localIdentifier` (`picker.swift:185`, native module `:133`, provider `:16`). | IDs identify the local Photos library. Since 2026-10-21 an optional `cloudIdentifier` (PHCloudIdentifier) is stored when available and used to remap a stale ID on the same iCloud Photos library; cross-device portability is improved, not promised. Physical restore/migration UNVERIFIED. |
| Temporary picker URI | Multi-import passes IDs only; provider creates no persistent picker-URI field. `usableAssetId` rejects URI-like IDs (`PhotoReferenceService.ts:31`). | Inspect a real imported archive/Documents. Custom catalog cover picking intentionally makes an owned cover copy and is a different flow. |
| Multiple import and order | Selection identifiers are ordered; provider verifies sequentially; service deduplicates before one store commit (`PhotoImportService.ts:18`); append uses max order + 1. | Import 36 deliberately out-of-order choices, cancel, duplicate-only batch, force quit/restart; compare IDs, details and frame order. |
| Drag selection | Custom PhotoKit UICollectionView multi-picker, not Expo ImagePicker ordered-selection assumptions. Reverse range restores the gesture snapshot, selected anchor deselects; edge display link exists. Gallery selection is separate and additive. | Actual recognizer arbitration, cross-row gaps, reverse/deselect, edge hold, vertical scroll, large library and accessibility. Swift model assertions do not verify touch delivery. |
| Full/limited/denied | Provider requests read access only on user import; native lookup checks .authorized/.limited, missing limited asset reports limited; Settings/Manage Access provided (`ApplePhotosProvider.ts:8`, native `:146`). | Fresh permission decisions, limited selected/unselected IDs, revoke while open/backgrounded, grant and Retry; real SDK permission mapping. |
| iCloud | Network-enabled thumbnail/full requests, final-result handling, fresh access check and 45s resolver timeout (`FilmerPhotosModule.swift:74–121`). | Cloud-only asset online/offline and retry; picker thumbnail requests lack this same explicit JS resolver timeout and require cancellation/scroll stress QA. |
| Deleted/inaccessible | Verify access before cache hit, fresh lookup after native callback, epoch invalidation on library/foreground; stale picker fallback excluded (`PhotoReferenceService.ts:40`, `:62`). | Distinguish album removal from true library deletion, warm-cache deletion, permission changes. No frame should be removed automatically. |
| Unavailable / Retry / Relink | Grid/strip display status; Viewer exposes Retry/manage access and Relink (`PhotoResolutionStatus.tsx:6`, Viewer `:459`). Relink verifies then checks original record identity before commit (`PhotoRelinkService.ts:4`). Automatic cloud-identifier recovery runs before the unavailable state is shown; failed recovery leaves identifiers unchanged and Retry/Relink as before. | Real nested gesture controls and modal presentation. Verify frame ID, Roll ID, sortOrder, notes/date/location unchanged on successful relink; cancel/failure unchanged. |
| Originals untouched | No PHAsset delete/change-original API or MediaLibrary delete call found in active app/native source; Roll removal only targets guarded legacy Copy files after commit. | Verify expendable originals still exist after frame/Roll removal and cache clear. |
| No persistent original duplication on import | Multi-picker loads thumbnails; ID import performs no full-size copy. Full Viewer/share uses disposable JPEG **renders**, not byte-identical originals (`native :95–114`). | Distinguish derived full-resolution temporary render from durable original. Explicit Save uses `Asset.create`, intentionally creates a new photo, not an import side effect. |
| Legacy refs/Copy | Validator retains legacy URI-shaped references for Relink but resolver does not trust stale URI; valid ID fallback supported. Copy documentPath rebases to current Documents. | Real legacy files, missing Copy file, container relocation, upgrade/rollback; preserve Copies on cache clear and when no user removal was requested. |

## F. Data safety audit

1. **Previously reported startup crash:** invalid JSON/schema/date/provider/path/duplicate IDs/order cause validation to throw (`validateRollArchive.ts:33`). `RollRepository.load:13` catches it and returns recovery; `rollStore:51` does not rethrow; root `:27` renders recovery before startup/navigation. Tests for malformed/future/read-failing archives pass. Therefore the old unhandled startup error is addressed in this path, not an outstanding confirmed P0. Runtime SQLite binary incompatibility or module-import failures are outside what mocked tests establish.
2. **No async hydration race:** active stores initialize synchronously; root sees ready/recovery snapshots. This avoids a transient empty archive being automatically written, but blocks JS during large JSON reads. No startup write/migration was found. (2026-10-21: a successful cloud-identifier recovery may write during startup warming; it only updates identifiers of the repaired reference through the guarded repository.)
3. **Write protection:** Roll and catalog repositories lock writes on failed loads and compare stored bytes before saving (`RollRepository.ts:28`, `CatalogRepository.ts:52`). Save precedes state publication. The read/compare/write sequence is not a transactional cross-process CAS; no extension/concurrent external writer is present, so a new concurrency architecture is not a v1 requirement.
4. **Schema compatibility:** arrays and v1 envelopes accepted; envelope metadata/unknown fields retained through spreading. Unsupported future schema is rejected without reset. Some legitimate-looking older content (e.g. unknown date format, duplicate positions) blocks the whole archive; no automatic repair is provided. Raw export/retry is recovery assistance, not restore or guaranteed repair. Obtain representative existing data before broadening validators.
5. **SQLite integrity:** JS tests inject reads/writes, not an actual corrupted SQLite page or abrupt power loss. No in-app integrity_check/salvage or verified OS backup/restore flow was found. Do not corrupt important production data to test recovery. Use disposable fixtures and record whether raw export is possible when the database itself cannot be read.
6. **Catalog persistence/covers:** separate film/camera repositories validate IDs/types/paths, protect failures; custom stores load on restart. Camera copies get distinct destination ownership, byte-size checks and rollback (`cameraStore.ts:19`, `CameraCoverStorage.ts:9`). Film covers likewise use collision-resistant owned paths/retained references (`FilmCoverStorage.ts:9`, `newRollDraftStore.ts:34`). General Roll-cover is a film image/override; do not invent an independent cover service requirement.
7. **Deletion:** frame/Roll removal commits first; `PhotoStorageService.ts:28` restricts cleanup to matching Roll/photo-owned paths; stores preserve cross-referenced Copy paths. Covers are protected across saved drafts/catalogs. Removing a Roll may leave an unused cover orphan; that is preferable to deleting shared data and is P2 cleanup at most.
8. **Settings:** `app-store.ts:17` falls back to defaults for malformed reads without writing at startup; explicit subsequent setting update replaces payload. Unlike archive/catalog data, no recovery/raw export exists. P2 because the affected data are preferences, not Roll/photo records.
9. **Upgrade/rollback:** no schema bump in startup work. Same-bundle in-place upgrade still must be verified with legacy IDs, custom catalogs/covers, preferences and existing Copies. Older binaries may ignore new catalog keys or mishandle new fields/records; rollback is not certified. An older binary keeps `cloudIdentifier` unchanged on Relink, so a rollback-then-Relink could leave a mismatched cloud identifier. Do not reinstall/uninstall to solve a startup error on valuable data.
10. **Local data communication:** existing release notes say Settings warns about uninstall loss. Revalidation found no such warning rendered in `app/settings.tsx:43` and no matching active source text. Treat that historical statement as stale. A concise local-metadata/Photos dependency explanation is recommended (P2); full backup/restore stays out of scope. OS backup behavior is not a substitute for verified recovery.

## G. Automated test and build results

Executed against the current working tree. `npm test` includes unit and service integration-style tests; there is no separate real-device integration/E2E runner in package scripts. Native Photos/SQLite/filesystem are mocked (`photoImport.test.cjs:11`); selection UI tests use deterministic callback hooks (`photoSelection.test.cjs:26`). No physical iPhone, iPad or TestFlight session was run.

| Exact command | Current result | Evidence / limitation |
| --- | --- | --- |
| `npm run typecheck` | PASS, exit 0 | `/private/tmp/filmer-audit-typecheck.log` |
| `npm run lint` | PASS, exit 0, no reported warnings | `/private/tmp/filmer-audit-lint.log`; app/src only |
| `npm test` | PASS, 125 tests, zero failures/skips | `/private/tmp/filmer-audit-tests.log`; about 6.9 seconds; includes real JS services/stores with mocked native IO |
| `npm run test:native-selection` | PASS, 16 assertions, exit 0 | `/private/tmp/filmer-audit-swift.log`; actual Swift selection model compiled, no UIKit tests |
| `npm run check:ios-config` | PASS, exit 0 | `/private/tmp/filmer-audit-config.log`; consistency subset, not complete resource/signing/privacy validation |
| `git diff --check` | PASS | Repeated after this report; does not validate untracked source contents |
| `npx --no-install expo export --platform ios --output-dir /private/tmp/filmer-audit-export` | PASS, exit 0 | `/private/tmp/filmer-audit-export.log`; Hermes iOS bundle about 4.3 MB; export is not a native app launch |
| `npx --no-install expo install --check` | OFFLINE PASS only, exit 0 | `/private/tmp/filmer-audit-deps.log` explicitly says local dependency map and validation unreliable offline; not current online compatibility clearance |
| `npx --no-install expo-doctor --verbose` | FAILED to run through npx | `/private/tmp/filmer-audit-doctor.log`; registry DNS/network error; superseded by approved direct online invocation below |
| `EXPO_OFFLINE=1 node /Users/bean/.npm/_npx/c15e4b19a90d9797/node_modules/expo-doctor/build/index.js --verbose` | FAIL, 18/21, exit 1 | Doctor 1.20.4; `/private/tmp/filmer-audit-doctor-offline.log`; schema check exp.host fetch fails; Directory metadata unavailable; third failure is real native config sync warning. Not 3 confirmed product defects. |
| Online Doctor retry after explicit owner approval | FAIL, **19/21**, exit 1 | `node /Users/bean/.npm/_npx/c15e4b19a90d9797/node_modules/expo-doctor/build/index.js --verbose`; `/private/tmp/filmer-audit-doctor-online-approved.log`. Schema and React Native Directory checks now pass. Remaining: maintained-native config synchronization warning and two SDK patch mismatches (C-08). Initial escalation was rejected; owner subsequently explicitly authorized the online check. |
| `xcodebuild -version` / `xcrun --sdk iphoneos --show-sdk-version` | Xcode 27.0 (27A266a), iOS SDK 27.0 | Toolchain discovered; not proof a distribution binary is accepted by Apple |
| Initial unsigned Debug build below | ENVIRONMENT FAILURE, exit 66 | `/private/tmp/filmer-audit-debug.log`; sandbox CoreSimulator/log access failures and misleading workspace error. Same workspace was retried with system access; do not diagnose a broken project from this attempt alone. |
| Unsigned Debug retry | PASS, exit 0, BUILD SUCCEEDED | `/private/tmp/filmer-audit-debug-retry.log`; generic arm64 device target, unsigned |
| Unsigned Release | PASS, exit 0, BUILD SUCCEEDED | `/private/tmp/filmer-audit-release.log`; generic arm64 device target, unsigned |
| Signed Archive / validation / upload | NOT RUN | No signing/distribution authorization or account actions taken |
| Fresh npm registry security audit | NOT RUN | Previous advisory counts are historical; no vulnerability-free claim |

Exact native build invocations (repository root):

```sh
# Initial sandbox attempt and allowed retry used the same command; separate log files.
xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-audit-build CODE_SIGNING_ALLOWED=NO build
xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-audit-release CODE_SIGNING_ALLOWED=NO build
```

Post-build inspection of `/private/tmp/filmer-audit-release/Build/Products/Release-iphoneos/FILMER.app/Info.plist` confirms bundle `com.manhduong2003.filmer`, version/build `1.0.0/1`, MinimumOSVersion `16.4`, DTSDKName `iphoneos27.0`, DTXcode `2700`, and UIDeviceFamily `[1,2]`. Nine `PrivacyInfo.xcprivacy` files are present: app, React timing/cxxreact/core, ExpoConstants, RNViewShot and ReactNativeDependencies folly/glog/boost bundles. No embedded provisioning profile exists, as expected for this unsigned artifact. This verifies embedded manifest presence, not manifest adequacy or SDK signature compliance. Build logs contain third-party header/deprecation/script warnings and a Hermes global-Image warning; zero compiler errors and both build success markers. No claim that these warnings were fixed.

These are generic arm64 **device-target** builds, not Simulator launches, installed physical-device tests, signed archives or TestFlight submissions. Historical October 15 unsigned successes are not substituted for current results.

## H. App Store compliance checklist

Apple requirements were checked against official public documentation on the audit date; account state was not accessed. Requirements below are submission guidance, not a claim of legal clearance.

| Item | Repository evidence / status | Remaining action |
| --- | --- | --- |
| Membership, agreements, roles | UNVERIFIED | Owner confirms active Developer Program, applicable agreements and upload/App Manager access; billing/tax as applicable to chosen distribution. |
| Bundle ID / signing | Native Debug/Release use `com.manhduong2003.filmer`, automatic signing, configured team, Apple Development identity (`project.pbxproj:359`, `:399`). Ownership/profile validity unknown. | Owner confirms identifier/team and distribution capability, produces and validates signed Archive. Do not change identity and strand an existing install. |
| Version/build | Info.plist hardcodes 1.0.0 / 1 (`:25`, `:45`); Xcode MARKETING_VERSION is 1.0, CURRENT_PROJECT_VERSION 1 (`pbxproj:362`, `:376`); app.json is 1.0.0. | Select an unused upload build number after checking Connect; reconcile authority deliberately. Build 1 is not intrinsically invalid or necessarily already used. |
| Display name / icon | FILMER; universal 1024x1024 AppIcon entry present. | Verify compiled icon on Home Screen, light/dark appearance and marketing rights; no redesign prerequisite. |
| Launch screen | Storyboard configured but image resource mismatch (C-04). | Cold-launch visual test and correct missing source resource if confirmed. JS startup is a later stage. |
| Minimum OS / SDK | Deployment target iOS 16.4 (`pbxproj:370`, `:405`); iPhoneOS SDK installed 27.0. LSMinimumSystemVersion 12.0 is not the effective iOS deployment target. | Test lowest supported OS when available; verify final archive SDK/toolchain metadata and Apple acceptance. [Apple SDK minimums](https://developer.apple.com/news/upcoming-requirements/) currently require Xcode 26+/iOS 26 SDK+ since April 28, 2026. This does not require raising deployment target to 26. |
| iPhone/iPad | TARGETED_DEVICE_FAMILY 1,2; native iPad landscape, iPhone portrait/upside-down; app.json says portrait. | Qualify iPad layouts, multiwindow sizing/rotations and screenshots, or make an explicit supported-device decision before release; do not silently drop iPad. |
| Permission descriptions | Photos read/add and foreground location describe features; limited automatic alert disabled. Generic camera/microphone strings also present, no corresponding intentional request found. | Verify prompt timing and denied alternatives; localize native prompts as P2; remove unused permissions only after native impact review. |
| App manifest | PrivacyInfo.xcprivacy declares no tracking/collected types, UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, bundled by Xcode project. | Inspect actual archive privacy report, including any disk-space/time APIs used by SDKs; declarations alone are not proof of completeness. [Apple required-reason guidance](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api). |
| Third-party manifests/signatures | Podfile privacy aggregation enabled; nine privacy manifests verified in current unsigned Release app (G). | Verify final embedded resources and listed SDK requirements in Organizer/validation. [Apple privacy manifests](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files). No blanket SDK compliance claim. |
| Data collection / App Privacy | No app backend/tracking integration found; Photos IDs, notes, locations and covers are local. System services/sharing still access data. | Owner reviews shipped SDK/service practices and completes accurate Connect answers. Manifest empty collected types is not an attestation that “Data Not Collected” is correct for every shipped path. [Manage app privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy). |
| Privacy policy | MISSING in-app; published URL/Connect status unknown | Publish accurate policy, add accessible in-app link and Connect URL. Explain local metadata, Photos dependency, temporary renders, legacy Copies/covers, map/geocoding/sharing, retention/removal/contact. [Guidelines 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy). |
| Support URL/contact | No in-app support entry or repository-owned URL found; Connect unknown | Owner supplies reachable support/contact page; verify Connect metadata. [Apple App Review preparation](https://developer.apple.com/app-store/review/). |
| Screenshots / product text | No store-ready package found | Capture real release UI with authorized sample photos, include supported device families; write truthful Reference-only/privacy/offline limitations and locales. |
| Age rating / category / territories / price | Connect UNVERIFIED | Complete current questionnaire and choose category/territories/price; do not assume a rating from photography theme alone. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/). |
| Encryption/export | No custom crypto implementation found; no ITSAppUsesNonExemptEncryption key found | Owner answers encryption determination for app + SDKs/OS services; set a declaration only after determination. Missing key alone is not a rejection. [Apple export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance). |
| Sign-in / account deletion | NOT APPLICABLE to inspected scope: no accounts | Do not add sign-in or account deletion just for review; reassess if accounts are later introduced. [Guidelines 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/#privacy). |
| Artwork/IP | Provenance inventory exists; rights attestation absent | Owner confirms distribution rights/trademark presentation, replaces only assets whose rights cannot be established; no assertion of infringement. |
| TestFlight | No processed build / tester result verified | Signed upload, compliance answers, beta description/feedback contact; internal test then external review if required. [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/). |
| App Review access/instructions | No credentials needed | Provide Reference permissions/import/relink steps, intentional inability to restore deleted Photos originals, supported devices and contact; reviewers need their own accessible photos. No dummy login. |

## I. Prioritized P0 / P1 / P2 / P3 backlog

Effort is engineering/QA work time, not Apple review/queue time. “Owner” means account/content/physical action cannot be completed solely through this workspace. All implementation below is proposed and **not performed** by this audit.

| ID / priority | Problem, evidence and user impact | Required fix / deliverable | Effort; dependencies; executor | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P0 gate | No currently confirmed P0. Real-device critical data safety remains unknown (F; native `lookup/resolve`, stores). | If tests expose erased data, original deletion, repeatable launch crash or upgrade loss, stop distribution and promote that defect to P0. | Contingency, not a fabricated task estimate; Codex + owner/device | No unresolved reproducible crash/data-loss defect before beta. |
| R1 P1 | C-01 unhandled save errors in reorder/metadata can leave misleading UI or uncaught JS exceptions. | Guard UI callbacks, retain metadata edits, reset grid positions from saved order and show retryable failure. Add failure-path tests covering UI integration. | 4–8 h; no account dependency; Codex | Inject failed SQLite writes for drop/accessibility move/note/date/location. No uncaught callback, no saved change, correct visible state, retry succeeds. |
| R2 P1 verification | Startup/new navigation and native splash not device verified; resource mismatch C-04. | Validate cold/warm/deep-link launches and expired deadline; resolve storyboard resource inconsistency; add targeted startup lifecycle tests. | 3–6 h plus device time; current startup working tree; Codex + owner | Signed Release opens without Metro; no stuck spinner/unmounted updates, missing logo investigated, recovery overrides startup, unavailable images do not block > deadline after JS initialization. |
| R3 P1 | Reference/native data safety and upgrade QA unverified (E/F; native module `:68`, picker `:216`). | Execute device matrix in L, preserve baseline and record actual IDs/order/files. Fix only reproduced failures. | 1–2 days QA; provisioned iPhone and legacy fixtures; owner + Codex for fixes | Every matrix case has device/OS/build, observed result and evidence; originals unchanged, no durable Reference original copies, frame metadata/order survive restart/upgrade. |
| R4 P1 public release | Missing accessible privacy policy; Settings `:43`; support/policy hosting unknown. | Draft accurate text, owner approves/publishes URLs, implement reachable policy/support links, enter Connect values. | 3–6 h technical/content work + owner hosting; Codex drafts/integration, owner attests | Policy reachable without account, in-app and Connect links work, shipped data flows match statements; support contact responds. |
| R5 P1 verification | Manifest/SDK data declarations and security status unqualified (H; `PrivacyInfo.xcprivacy:5`, lock `:10193`). | Generate/review archive privacy report, current dependency advisory inventory and reachability assessment; targeted remediation if necessary. Online Doctor is now complete with owner approval; review/align the two patch mismatches in C-08 and repeat verification after any approved dependency change. | 4–8 h review; signed/release artifact and authorization for dependency changes; Codex analysis + owner privacy attestation | Required manifests/reasons match actual APIs, no unexplained validation issues; each relevant advisory fixed or documented accepted mitigation with evidence. Two online SDK patch mismatches resolved or explicitly dispositioned; maintained-native warning documented without suppression. Offline network failures not mislabeled as product defects. |
| R6 P1 distribution | Signing/Connect ownership/upload unverified; Info.plist build 1, Xcode development identity (`pbxproj:399`). | Confirm account/team/identifier and agreements, choose unused build, align release version authority, generate/validate signed Archive. | 2–6 h if credentials ready; owner account access; owner with Codex guidance | Valid distribution signature/profile, correct bundle/version/build/SDK, accepted validation/processing. No bundle-ID change over existing data. |
| R7 P1 public release | Universal app/iPad/large-image runtime unknown; grid `:95`, native `:95`. | Run iPhone/iPad size/rotation, large scan, 100+ selection, large library, permissions/locales/accessibility smoke. Profile before optimizing. | 0.5–1 day QA; supported hardware/simulator sizes; owner QA, Codex fixes | No reproducible fatal memory/UI freeze, usable scroll/retry/relink/select controls in supported layouts; capture measured limits. If failures, prioritize actual fixes. |
| R8 P1 public release | Store metadata/screenshots/age rating/export answers/IP attestation missing or account-unverified (H). | Prepare accurate product package, capture actual UI, owner confirms photo/art rights, complete Connect forms and Review notes. | 0.5–1 day; release UI, owner URLs/content/account; shared | All required fields complete, images reflect real app, no Copy/cloud/backup claims, rights and support/contact confirmed. |
| R9 P1 release integrity | Startup files remain untracked/uncommitted; HEAD alone lacks the audited feature. Previous native-module source gap is fixed by 5629f09. | After approved fixes, review/commit complete release sources and reproduce checks from intended checkout/lockfiles. Do not commit unrelated files blindly. | 1–3 h; final approved scope; Codex | Reproducible checkout includes startup/native module/assets; clean intended release tree and no missing local-only sources. |
| R10 P1 qualification | No real TestFlight result. | Upload approved signed build, smoke internal thin install + same-bundle upgrade; collect crash/feedback evidence; external beta review if used. | 0.5–1 day active testing plus processing/review waits; R1–R3/R5/R6/R9 and device access | Processed build installs/launches offline, no Metro dependency, core journeys pass, no open P0 or untriaged core P1. Public launch also requires R4/R7/R8. |
| R11 P2 | Blank optional frameCount blocked (C-02). | Allow empty -> undefined in editor/adapter; preserve cancel behavior. | 1–2 h; Codex | Clear existing count/save/restart, positive-number validation retained. |
| R12 P2, conditional P1 | Legacy day-date editing requires month reselection (C-03). | Preserve supported legacy date during unrelated edits; no bulk migration. | 2–4 h; legacy fixtures; Codex | Notes-only edit succeeds on legacy day Roll with IDs/date/order preserved; explicit month change works. Promote if actual installed users affected. |
| R13 P2 | Preferences silently default after corruption; no local-data explanation (F8/F10). | Add concise local-storage/Photos explanation; consider settings-only recovery if justified. No archive reset. | 2–4 h; copy approval; Codex | Users understand local metadata and referenced-asset dependency; corrupt settings cannot reset Rolls/catalogs. |
| R14 P2 | English native prompts, artwork typos, generic cover-denial feedback (CatalogItemModal.tsx:67), nonvirtualized gallery | Localize permission strings and improve specific copy/accessibility/large-list performance only where QA supports need; fix verified metadata/art discrepancies. | 0.5–2 days selectable scope; Codex; owner artwork approval | Chosen issues have reproduced before/after evidence; no broad redesign or optional optimization blocks release by default. |
| R15 P3 | General Film/Camera edit/delete, picker album/search, backup/restore, Copy Mode, accounts/cloud sync absent | Defer; separate product/architecture proposal and migration safety plan if requested. | Not estimated until scoped; product owner + Codex | No v1 release claim promises them; legacy Copy compatibility remains covered. |

## J. Roadmap and estimated time

1. **Stabilization (about 1 day):** R1 UI failure guards; R2 startup/resource checks; include R11/R12 if useful for legacy users. No feature expansion. Re-run targeted tests plus current baseline checks.
2. **Reference Photo completion (0.5–1 day engineering reserve):** implementation already exists. Verify import order/permissions/Relink/temporary render contract, then fix only demonstrated failures. Do not replace working custom picker solely because a system picker cannot provide the same gesture.
3. **Device QA (1–2 days; R3/R7):** start with signed in-place upgrade on expendable or safely preserved fixtures. Complete native selection/iCloud/memory/iPad cases; triage defects by actual severity.
4. **Release configuration (0.5–1 day technical work, partly parallel):** R4–R6/R8/R9; final versions, privacy report/security review, policy/support URLs, metadata and complete release commit. Owner account/content waits can dominate.
5. **TestFlight (0.5–1 day active testing):** owner-authorized signed Archive/upload, processing/compliance, internal install/upgrade/core smoke; external beta review only if distributing externally.
6. **Submission (0.5 day preparation plus Apple queue):** close public P1 gates, final screenshots/review notes/ratings/privacy/exports; submit approved build and monitor review questions. No promised Apple review duration or approval.

**Planning range:** approximately **3–5 working days to a qualified internal TestFlight candidate**, **5–8 working days to an App Store review-ready submission**, assuming immediate owner/account/hardware access and no new serious native defects. These overlap phases; do not add every backlog maximum mechanically. Allow another 2–5 days contingency if hardware exposes memory/gesture/upgrade defects. Membership enrollment, hosting, account agreements and Apple processing/review waits are outside those estimates. Actual public availability is unknown until Apple approves.

## K. Tasks Codex can complete automatically after implementation authorization

- R1 UI persistence-error handling/tests; targeted startup/deadline/unmount/deep-link contract checks and resource wiring; optional R11/R12 compatibility fixes.
- Draft policy/support/review instructions and metadata from actual data flows; integrate owner-provided URLs after approval. Cannot attest owner identity/legal rights or invent published URLs.
- Re-run local type/lint/Node/Swift/config/export/unsigned build checks, collect logs, compare artifact/plist resources and inspect privacy manifests; do permitted current advisory review without force upgrades.
- Prepare a minimal reviewed release commit and reproducibility checklist. This audit did not stage/commit changes, alter account settings or upload.
- Help diagnose device logs/results supplied or obtained through an authorized device workflow. Cannot replace human touch/permission/iCloud tests with mock assertions.

## L. Tasks requiring Apple account, physical devices or manual action

Owner must confirm active membership/agreements, bundle/team ownership, provisioning/distribution credentials, chosen build number and Connect app record; approve policy/support hosting and content/asset rights; complete privacy/rating/export/territory forms; authorize any later upload/submission. No passwords or private keys should be put in this report.

Record device model, OS, build, signing mode, installation method, starting data and observed result for each case. Use disposable fixtures and expendable original photos; **do not uninstall or corrupt a valuable production archive**.

| Device QA case | Required acceptance |
| --- | --- |
| Fresh install + force quit + signed Release without Metro | Empty useful UI, no premature permission prompts, loading exits, no crash/deep-link dead end; dark/light EN/VI/KO usable. |
| In-place upgrade from known existing binary | Compare Roll/photo/catalog IDs, metadata, sortOrder, settings and Documents cover/Copy paths before/after; force quit/restart; no silent reset/rewrite or disappearing custom items. Keep rollback sample separate. |
| Create/edit/delete and custom covers | Selection round-trips, save/discard/back work; lost picker cache cannot erase saved cover; failed save retains existing records. |
| Add Photos native picker | Tap, nonadjacent choices, horizontal cross-three-row drag, reverse/deselect, Clear, Cancel, edge scroll, vertical scroll, 100+ selections and rapid cell reuse. Final 36-frame nonchronological order survives restart; duplicates do not re-add. |
| Gallery selection/reorder/viewer | Tap/select/Select All/exit, drag within visible rows, vertical scroll arbitration, accessible moves, pinch/paging/rotate/dismiss, notes/date/location; no unintended viewer opening during selection; failed write has clear feedback after R1. |
| Full/limited/denied + changed access | No inaccessible cached image masquerades as available; grant/manage/retry succeeds; inaccessible frames remain; test changes while picker open/backgrounded. |
| Cloud-only image | Online thumbnail/full, offline failure bounded and recoverable, reconnect Retry; large full-size scans/rapid paging do not terminate app or freeze interaction. |
| Delete original vs remove album membership | Album removal retains reference; deleting original shows unavailable; Retry/Relink buttons respond; Relink success/cancel/failure preserve frame ID/order/details and Roll identity. |
| Remove frames/Roll + cache clear | Photos originals remain; unrelated/shared legacy Copies/covers remain; only user-requested owned removal deletes matching Copy files. |
| Recovery on disposable database | Malformed/future/read-failing Roll/catalog fixtures show recovery, block writes; repeated retry preserves bytes; raw export exact when readable; no reset action. Actual SQLite unreadable-file case documented separately. |
| Native share/save/contact sheet | Receivers obtain complete readable files, cancelled share lifecycle safe, denied add-only permission clear, cached export rechecks sources; users understand explicit Save creates a Photos asset. |
| iPad + minimum/modern iOS + accessibility | Supported rotations/sizes, nested modals, safe areas, large text/VoiceOver/tap alternatives tested; record unavailable OS versions as coverage gaps. |
| Internal TestFlight | Thinned signed install/upgrade, offline launch and core Reference journeys pass; capture crashes and feedback before public review. |

## M. Recommended exact next three tasks

1. **Implement R1:** handle reorder and photo-metadata save failures at the UI boundary, retain edits/reset failed visual order, and add failure-injection regression coverage. This is a narrow reliability change with no schema or product expansion.
2. **Qualify startup and the native app on a signed iPhone build (R2 + first R3 cases):** verify splash resources, cold/deep-link launch, in-place data preservation, import drag/order, limited access and Relink. Record real results; fix reproduced failures before adding features.
3. **Complete release inputs in parallel (R4–R6/R8):** owner supplies/approves policy/support and account/rights/privacy decisions; Codex prepares links/content/privacy evidence and the reviewed release candidate, then owner authorizes signed distribution. Complete the remaining device matrix before public submission.

### Final release decision

- **Overall: NOT READY** for distribution as a reliable public v1.0; core product implementation is substantially present.
- **TestFlight ready now: NO, not yet qualified.** Local development QA can begin once signed. Internal TestFlight is conditional on R1/R2 critical checks, minimum real-device safety smoke, an approved complete source candidate and successful signed Archive/upload/compliance. Full public metadata and optional catalog CRUD are not prerequisites for an internal beta.
- **App Store review ready now: NO.** Privacy link, account/submission evidence, full supported-device/native QA and store package remain incomplete/unverified.
- **Smallest practical v1.0:** local Roll CRUD; Film/Camera selection plus custom creation; Reference-only photo import/order/gallery/Viewer; unavailable/Retry/Relink; tested existing export/share features; preserve old Copy data. No login, sync, Copy Mode or redesign.
