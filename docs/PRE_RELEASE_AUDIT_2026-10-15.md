> Historical audit before SDK alignment, ESLint setup and native drag-selection work. Current results are in the root RELEASE_READINESS.md.

# FILMER pre-release audit — NOT READY

Audit date: 2026-10-15, Asia/Seoul. This report covers the actual working tree, including the preceding Reference-only work and this audit's data-integrity fixes. The earlier focused report is preserved at [docs/REFERENCE_HARDENING_2026-10-15.md](docs/REFERENCE_HARDENING_2026-10-15.md); its test counts and catalog-durability findings are historical.

## 1. Executive summary

**Final status: NOT READY for App Store publication.** TypeScript and **120 automated tests pass**, Metro exports iOS, and the final unsigned generic-device iOS Release build succeeds with an embedded JS bundle. These results establish buildability and mocked service/hook behavior, not physical-device correctness or signing readiness.

Confirmed data-integrity defects fixed in this audit:

1. Custom Film and Camera catalogs disappeared on cold restart because their Zustand stores were memory-only. They now persist through the existing SQLite KV facility, commit before publishing, preserve IDs/fields, and enter protected recovery for invalid/future/unreadable payloads.
2. Custom Camera covers used temporary ImagePicker URIs. New covers now copy to owned Documents files with relative paths and independently owned destinations; failed copies/writes roll back only the newly created file. Original and shared source files remain intact.
3. Film-cover destination collisions could cause failed-copy cleanup to delete a previously existing cover. Destinations now include a sequence and existence check. FilmForm rollback also protects a committed catalog cover when a later selection/navigation callback throws.
4. Reference import appended by photo count rather than the last sortOrder. Valid legacy archives with order gaps could place new photos before existing frames. Imports now append after the maximum stored order without changing existing IDs/order/metadata.

Submission still requires physical iPhone/iPad QA, a signed archive and App Store Connect validation, an accessible privacy policy, and native/app-config/dependency reconciliation. The earlier React Native C++ Debug linker failure did not reproduce in a fresh isolated current build; the underlying cause remains unproven, so no native configuration workaround was applied. No app was installed, launched, uninstalled, or reset on any physical device. No live user database, originals, owned media directory or exported backup was deleted/cleared.

## 2. Architecture and production configuration

| Area | Observed implementation / evidence | Assessment |
| --- | --- | --- |
| Runtime | Installed Expo 57.0.27, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, Zustand 5.0.15; inspected package.json and installed package metadata | SDK locally builds Release; six online patch mismatches remain below |
| Routing | Expo Router, `app/_layout.tsx:14`; Home, Settings, Film/Camera selection, shared create/edit Roll form and Roll Detail routes | Implemented; native back gestures/deep links need device QA |
| Storage | `src/features/rolls/data/RollRepository.ts:13`; SQLite KV key `filmer.rolls.v1`; settings `filmer.settings.v1` | Existing Roll array and schemaVersion 1 envelope supported, no relational migration |
| Custom catalogs | `src/features/catalog/data/CatalogRepository.ts:24`; separate keys `filmer.films.v1` and `filmer.cameras.v1` | Fixed: guarded persistence; existing fields/IDs preserved; built-ins remain bundled |
| Catalog compatibility | Existing unversioned custom arrays and schemaVersion 1 envelopes with `films`/`cameras`; unknown envelope fields retained | Unsupported versions stop in recovery, never replace bytes. Old entries already lost from a previous memory-only session cannot be reconstructed automatically |
| Media ownership | Reference IDs resolve through local FilmerPhotos module; legacy Copy files remain Documents-relative; Film/Camera covers have separate owned directories | No original Photos deletion API in the Reference module; cache cleanup excludes Documents |
| Native project | Checked-in ios/ and android/, Expo autolinking local module, Hermes, New Architecture | App config is not automatically authoritative for native fields; do not run destructive clean prebuild as an audit shortcut |
| Effective Release identity | Built Info.plist: `com.manhduong2003.filmer`, version **1.0.0**, build **1**, MinimumOSVersion **16.4** | Verify bundle ownership and unused build number in App Store Connect |
| Signing | Xcode project Automatic signing, configured team, Apple Development identity; unsigned QA build has no embedded provisioning profile | Distribution certificate/profile, App Store Connect permissions and upload unverified |
| Config drift | Xcode MARKETING_VERSION is 1.0; source Info.plist hardcodes 1.0.0/build 1; app.json version is 1.0.0, no ios.buildNumber; native iPad supports landscape despite app.json portrait | P1 verification/configuration task before upload; no version/team/orientation silently changed |
| Icons / launch | Both source icon PNGs 1024×1024 RGB, no alpha; universal iOS AppIcon catalog; SplashScreen storyboard/resources compile into Release Assets.car | Static checks pass; appearance on hardware unverified |
| Permissions | Read/add Photos and foreground location strings present; limited Photos automatic alert disabled; generic camera/microphone descriptions also exist | Image-only pickers do not intentionally request microphone/camera. Review unused strings rather than removing shared native dependencies blindly |
| Privacy | App PrivacyInfo.xcprivacy declares no tracking/collected types and required reasons CA92.1/C617.1/35F9.1; nine privacy manifests found in built app/bundles | Plist syntax passes, not an App Store privacy attestation. Review native SDK practices and generated privacy report |
| Network architecture | No backend, subscriptions, analytics client or cloud sync found in app code. Native Photos iCloud, Maps/geocoding and explicit OS sharing may use network/services | Local-first does not mean all native operations work offline |

Apple requires an accessible privacy-policy link in the app and App Store Connect; none is present in current Settings/source. No placeholder URL or invented policy was added. See [App Review Guidelines 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy) and [App privacy management](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy). Privacy manifests must also match actual APIs/SDKs: [Apple manifest guidance](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).

### Incomplete / dormant code inventory

`src/features/films/components/FilmCard.tsx` and its styles have no active app consumer after the compact Film selector change. `src/features/rolls/data/mockRolls.ts` is no longer imported by the production repository. `PhotoCopyService`, Copy-specific translations and `setImportMode` remain intentionally dormant for compatibility/future work; the Settings selector is hidden and the MVP provider ignores that preference. They were not blindly removed. No backup/restore product flow or backend was introduced; emergency raw-data export remains recovery-only. Native permission-description strings are currently English even when the app UI is Vietnamese/Korean.

## 3. Feature and risk matrix

Status distinguishes implementation from device verification. P0 = data-loss/integrity blocker; P1 = submission/core-flow blocker or required verification; P2 = nonblocking deficiency.

| ID / severity | Feature / status | Evidence, reproduction and disposition |
| --- | --- | --- |
| A-01 P0 | Custom catalogs — **fixed**, device upgrade unverified | Before: create a custom Film/Camera, restart JS/app: record disappears. `filmStore.ts:9`, `cameraStore.ts:10` now read guarded repositories. Restart/duplicate/save-failure tests pass. New keys do not overwrite Roll/settings archives or regenerate existing IDs |
| A-02 P0 | Camera-cover durability — **fixed**, device picker unverified | Before: choose Camera cover, save, lose picker cache: cover fails. `CameraCoverStorage.ts:8`, `cameraStore.ts:23`, `CameraCard.tsx` now use owned Documents-relative files. Copy/read/write failures and shared sources tested |
| A-03 P0 | Film-cover rollback — **fixed** | Freeze timestamp/randomness and create two covers: old path collided; failed cleanup could remove the first. `FilmCoverStorage.ts:9` checks unique destinations. `FilmForm.tsx:41` protects committed references when callback/close fails. Regression tests reproduce collision and post-commit errors |
| A-04 P1 | Physical-device critical flows — **unverified**, blocks READY | No real-iPhone/TestFlight launch/Photos/force-quit/update tests have run. Device discovery reports physical devices **unavailable**; a connected simulated device does not count as iPhone verification |
| A-05 P2 | Earlier iOS Debug failure — **not reproduced in fresh audit build** | Current isolated generic arm64 Debug build succeeds. Previous logs contain missing React Native C++ symbols. No native flags/dependency changes applied; repeat result in section 7. Root cause and on-device Debug launch remain unverified |
| A-06 P1 | Dependency/config validation — **partial / failed checks** | Online Expo Doctor 19/21: checked-in native config sync warning and six SDK patch mismatches. Expo install --check also fails online. No force installation, upgrade or warning suppression |
| A-07 P1 | Privacy/submission/signing — **missing/unverified** | No in-app privacy-policy URL. Distribution signing, privacy answers, review metadata, age rating, export-compliance answers, screenshots and archive validation not completed |
| A-08 P2 | ESLint — **missing tooling/config** | package.json has no lint script/dependency; no eslint.config.*. Cached ESLint 10.11.0 exits 2. TypeScript passes but does not replace lint |
| A-09 P2 | Custom catalog edit/delete — **missing by current scope** | Stores/UI expose creation/selection, not general catalog editing/deletion. Roll-specific Film edits are implemented. No dead Edit/Delete buttons were invented or new CRUD features added |
| A-10 P2 | Clearing optional frame count — **confirmed code-path issue, not fixed in blocker scope** | `RollInformationScreen.tsx:108`: empty editor value becomes Number('') = 0; draft validator rejects it. Existing saved Roll remains unchanged. Use cancel/re-enter a valid positive count; a separate small UI-flow fix remains |
| A-11 P2 | Settings corruption — **partial handling** | `src/store/app-store.ts:17` catches reads/JSON errors and uses in-memory defaults without startup writes. A later explicit setting change replaces the settings payload. Unlike Roll/catalog archives, settings have no recovery/export UI |
| A-12 P2 | Artwork / catalog completeness — **partial** | 261 built-in films, four built-in Cameras, custom creation. Some decorative film sheets have incorrect printed process labels (e.g. CMS 20 II); typed catalog metadata takes precedence. Sources/inventory retained; no redesign performed |
| A-13 P2 | Large-image performance / native lifecycles — **unverified** | PhotoKit JPEG encoding/full-resolution memory, rapid paging, iCloud downloads, share receivers and iPad layout require device profiling. Mock tests cannot establish peak-memory safety |
| A-15 P1 | Legacy frame order — **fixed** | `src/features/rolls/store/rollStore.ts` now appends after maximum sortOrder. Reproduce old behavior with stored orders [4,9]: new frames used [2,3] and appeared first. Regression verifies [4,9,10,11], unchanged existing records and restart |
| A-14 P1 | Release source completeness — **uncommitted/untracked working tree** | Existing prior work includes untracked local native module, resolver/recovery files and artwork. Ensure all intended files are included in the reviewed release commit; CI cannot build missing local module sources |

File prefixes above: catalog repository `src/features/catalog/data/`; Film files `src/features/films/`; Camera files `src/features/cameras/`; shared Roll form `src/features/rolls/components/`.

## 4. Critical-flow audit and Reference QA

| Flow | Code evidence | Automated result | Required native result |
| --- | --- | --- | --- |
| Startup | `RollRepository.ts:13`, `validateRollArchive.ts:33`, `rollStore.ts:38`, `app/_layout.tsx:24` | Malformed JSON/invalid metadata/future versions/read failures do not escape store creation; write lock/raw retention/retry pass | Cold launch and recovery UI accessibility on a signed iPhone build |
| Create/select Roll | `FilmSelectionScreen.tsx`, `RollInformationScreen.tsx`, `rollStore.ts:115` | Selection/draft/sort/grouping and identical-timestamp Roll ID regression pass | Selector round-trips, back navigation, multiple rapid Save taps |
| Camera selection/custom covers | `app/cameras.tsx`, `CustomCameraModal.tsx`, Camera store/service | Awaited persistence/error handling, original-preserving cover copy, restart and rollback pass | PHPicker cover permissions, cancel/dismiss and force-quit/reopen |
| Reference import | `ApplePhotosProvider.ts:8`, `FilmerPhotosModule.swift:30` | Saved Copy preference ignored; verified IDs only; null/empty/URI/unverified IDs not added; multiple frame order persists | PHPicker ordered selection with full/limited/denied Photos access |
| No durable picker URI | `FilmerPhotosModule.swift:48`, provider, `resolvePhotoUri.ts` | No new thumbnailUri stored; no URI fallback; sync resolver serves legacy Copy only | Inspect test archive and Documents: Reference import creates no original-file copies |
| Restart/force quit | SQLite ID persistence, `PhotoReferenceService.ts:53` | Restart uses persisted ID, not prior picker file | Actual OS force quit/reopen and in-place app update remain unverified |
| Deleted original / album removal | `FilmerPhotosModule.swift:131` fetches library asset IDs globally | Warm-cache deletion cannot resolve/share stale URI; album-only removal keeps modeled asset available | Delete expendable original in Photos vs remove album membership; verify placeholders/frame retention |
| Denied / limited | Native lookup authorization branch; `PhotoResolutionStatus.tsx`; provider.manageAccess | Distinct denied, inaccessible-limited and accessible-limited outcomes; no reference removed | Settings permission changes while backgrounded; grant access via limited picker |
| iCloud | Swift networkAccessAllowed, final delivery and 45s timeout | Modeled cloud success/offline/retry, thumbnail/full distinction pass | Actual optimized-storage cloud-only assets online/offline; loading, timeout and Retry |
| Gallery / Viewer / selection | `useResolvedPhoto.ts:5`, Grid, Viewer, ThumbnailStrip | Revision-key clearing, stale request cancellation and selection/reorder hooks pass | Paging, zoom, rotate, dismiss, nested Retry/Relink controls and selection gestures |
| Retry / Relink | `PhotoRelinkService.ts:4`, Roll store.relinkPhoto | Cancel/failed verify/failed save unchanged; success retains frame ID, Roll ID/order/details | Actual picker presentation, replacement verification and permission changes |
| Edit/Delete Roll | Shared draft/commit flow, Roll store removal | Metadata/photo preservation, save-failure rollback, shared Copy-file protection; no Photos deletion calls | Native discard/back confirmation and visible counts/thumbnails |
| Legacy Copy | `PhotoStorageService.ts:23` | Documents-relative rebasing, byte-level fixture sharing/export/removal rules and original preservation pass | Real legacy files after update/cache clear/original deletion |
| Sharing/contact sheets | PhotoShare/Export services, ContactSheetExportService/Preview | Explicit native share fixtures; cached contact sheet verifies sources before each export; unavailable source blocks export | Share targets receive complete files; contact-sheet orientation/readiness/save permission |
| Cache clearing | ImageCacheService, PhotoShareCacheService | Only owned temporary renders/expired share files targeted; Documents excluded | Originals, legacy Copy and covers survive clear/relaunch |

Native Photos/SQLite/filesystem are mocked in the Node harness. “Deleted”, “limited”, “iCloud” and album tests validate the JS contract and failure handling, not actual iOS behavior. Hook/gesture tests are deterministic callback tests, not end-to-end native gesture automation.

### Physical archive crash investigation

The previously observed `Unhandled JS Exception: Invalid saved Roll archive` matches the former synchronous `RollRepository.load()` → Zustand createStore/create initialization path. Current code catches JSON parsing, validation, unsupported versions and SQLite read errors and returns explicit recovery; it does not throw from that load path. Root gates normal navigation, and writes are disabled after failed load or changed/unreadable storage. Retry never resets data. Raw text can be exported when storage returned it; if SQLite cannot read any string, export cannot fabricate the missing bytes.

Supported Roll payloads remain the original array or `{schemaVersion: 1, rolls: [...]}`. Unknown envelope fields, IDs, frame order and metadata survive successful writes; invalid/future records stay untouched. Legacy Reference URI records are retained but show unavailable until explicitly relinked. No relational/destructive migration was introduced. Tests pass for this path; **the original physical-device crash has not been reproduced or verified fixed on hardware**.

## 5. Fixes applied and exact audit-only changed files

Prior Reference/native/artwork edits remain in the working tree and are not attributed to this audit.

- `src/features/catalog/data/CatalogRepository.ts` — new guarded SQLite KV repository/validators; compatible arrays/v1 envelopes, duplicate/built-in ID and owned-path checks, preserve envelope metadata, raw recovery and read-before-write protection.
- `src/features/films/store/filmStore.ts`, `src/features/cameras/store/cameraStore.ts` — durable custom-only records merged with unchanged built-ins, collision-resistant new IDs, commit-before-publish, retry/recovery. Camera action is awaited; no existing IDs are regenerated.
- `src/features/cameras/services/CameraCoverStorage.ts`, `src/types/models.ts` — independently owned Documents cover, safe relative path and container rebasing; rollback only newly copied file. No automatic cleanup of old/shared media directories.
- `src/features/cameras/components/CameraCard.tsx`, `src/features/cameras/components/CustomCameraModal.tsx` — resolve durable cover and catch asynchronous saves without redesigning the existing modal.
- `src/features/films/services/FilmCoverStorage.ts`, `src/features/films/components/FilmForm.tsx` — avoid destination collision and prevent rollback deleting a committed Film cover.
- `app/_layout.tsx`, `src/features/rolls/components/ArchiveRecoveryScreen.tsx`, `src/i18n/translations.ts` — reuse existing recovery UI for failed catalogs with EN/VI/KO message/title, retry and raw export; normal flow unchanged.
- `src/features/rolls/store/rollStore.ts` — append new frames after the highest existing order, preserving valid legacy sort gaps.
- `src/features/photos/services/__tests__/photoImport.test.cjs`, `src/features/films/utils/__tests__/catalog.test.cjs` — ten additional regression tests (110 → 120), exercising actual stores/repositories with mocked native IO.
- `RELEASE_READINESS.md`, `docs/REFERENCE_HARDENING_2026-10-15.md` — current report and preserved historical follow-up.

**Preserved:** all existing Roll IDs/references/order/snapshots, Reference-only behavior, dormant Copy code/owned files, valid settings, existing catalog IDs/unknown fields, owned cover files and raw failed archives. No npm/pod dependency version or signing/team/bundle setting was changed by this audit. Items previously lost because the old app never persisted them cannot be recovered from missing storage; no fake replacement catalog records are generated.

## 6. Commands executed and results

All project commands below run from the repository root unless stated. Shell redirections wrote logs under `/private/tmp/`; they did not target application storage.

| Exact command | Result / evidence |
| --- | --- |
| `npx tsc --noEmit` | Passed baseline and after final production/test changes |
| `node --test` | Baseline 110/110; after fixes **120/120 passed**, 0 failed/skipped. `/private/tmp/filmer-audit-tests-baseline.log`, `/private/tmp/filmer-audit-tests-final.log` |
| `git diff --check` | Passed after fixes and report updates |
| `npx --no-install eslint .` | Failed resolving registry in restricted run; no project ESLint installed/configured. No dependencies installed |
| `node /Users/bean/.npm/_npx/515228b7c8d004a2/node_modules/eslint/bin/eslint.js .` | Cached ESLint **10.11.0**, exit **2**, missing eslint.config.*. `/private/tmp/filmer-audit-eslint-final.log`. Lint did **not** pass |
| `node /Users/bean/.npm/_npx/c15e4b19a90d9797/node_modules/expo-doctor/build/index.js` | Cached Doctor **1.20.4**, restricted network: 18/21; config-schema API/RN Directory failed to fetch plus native-config warning. `/private/tmp/filmer-audit-doctor.log` |
| `node /Users/bean/.npm/_npx/c15e4b19a90d9797/node_modules/expo-doctor/build/index.js --verbose` | Permitted network rerun: **19/21**, exit **1**; schema/RN Directory checks now pass, two real warnings remain. `/private/tmp/filmer-audit-doctor-online.log` |
| `npx expo install --check` | Offline local map said up-to-date with explicit unreliable-offline warning. Online rerun exit **1**, six patch mismatches. `/private/tmp/filmer-audit-dependencies.log`, `/private/tmp/filmer-audit-dependencies-online.log` |
| `npx expo export --platform ios --output-dir /private/tmp/filmer-audit-export` and final rerun with `--output-dir /private/tmp/filmer-audit-export-final` | Both passed; final includes legacy-order fix. `/private/tmp/filmer-audit-export.log`, `/private/tmp/filmer-audit-export-final.log` |
| `plutil -lint ios/FILMER/Info.plist ios/FILMER/PrivacyInfo.xcprivacy ios/FILMER/FILMER.entitlements` | All syntax checks OK |
| `xcrun devicectl list devices` | Restricted run timed out CoreDeviceService. Permitted read-only rerun lists physical devices unavailable; connected entry is simulated. `/private/tmp/filmer-audit-devices-online.log`. No physical launch/test performed |
| `xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-reference-debug CODE_SIGNING_ALLOWED=NO build` | Baseline and final **BUILD SUCCEEDED**, exit **0**. `/private/tmp/filmer-audit-release-baseline.log`, `/private/tmp/filmer-audit-release-final.log`, final `/private/tmp/filmer-audit-release-verified.log` (includes legacy-order fix) |
| `xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-audit-debug CODE_SIGNING_ALLOWED=NO build` | **BUILD SUCCEEDED**, exit **0** in isolated DerivedData. `/private/tmp/filmer-audit-debug.log`; sequential repeat below |

Additional read-only inspections: `git status --short`, `rg --files`, source/Podfile/lock/config/test reads; installed versions queried with `require('<package>/package.json').version`; Pillow checked icon dimensions/alpha; Python plistlib checked the built Release Info.plist and existence/sizes of embedded artifacts; `git ls-files '.env*'` returned no tracked matching files. No security audit/vulnerability clearance is inferred from these checks.

Sequential Debug repeat using the same isolated DerivedData also **BUILD SUCCEEDED**, exit 0: `/private/tmp/filmer-audit-debug-repeat.log`. This command used the identical Debug arguments above. No C++ configuration fix was made.

### Online dependency mismatches

| Package | Installed | Doctor expected |
| --- | --- | --- |
| expo | 57.0.27 | ~57.0.29 |
| expo-constants | 57.0.21 | ~57.0.22 |
| expo-linking | 57.0.12 | ~57.0.13 |
| expo-location | 57.0.20 | ~57.0.21 |
| expo-router | 57.0.25 | ~57.0.27 |
| expo-sharing | 57.0.22 | ~57.0.23 |

React Native 0.86.3 matches the installed SDK map. A clean local map check is not proof of latest online patch alignment. Review the six changelogs and update deliberately in a separate reviewed change with pod refresh/build/device regression; no blind upgrades or Doctor suppression performed here. Expo documents the native configuration sync limitation in [package.json doctor settings](https://docs.expo.dev/versions/latest/config/package-json/).

## 7. Production artifacts and Debug failure

Final Release artifact: `/private/tmp/filmer-reference-debug/Build/Products/Release-iphoneos/FILMER.app`. Verified executable, nonempty **main.jsbundle**, compiled Assets.car and app privacy manifest. Effective bundle/version/build/minimum OS listed above. Release AppDelegate loads Bundle.main main.jsbundle rather than Metro; unsigned build success alone does not prove cold launch.

No embedded.mobileprovision was expected because CODE_SIGNING_ALLOWED=NO. This artifact is not a signed TestFlight archive. Signing, archive/export validation and upload were not performed.

Debug: the fresh current audit build **succeeded** (exit 0). Prior verified arm64 link failures include `facebook::react::Sealable::Sealable()`, `Sealable::~Sealable()`, `ShadowNode::getDebugName() const`, `ShadowNode::getDebugChildren() const` from RNGestureHandler, RNReanimated and RNScreens. Headers have debug-conditional declarations; this is consistent with a React Native native build/configuration mismatch, but this audit does not claim a proven underlying dependency fix. No unrelated macro, Hermes, C++ standard or New Architecture change was applied. The current pass means the previous failure was not reproduced; it does not prove that stale artifacts were the sole cause. Logs: `/private/tmp/filmer-audit-debug.log` and the earlier `/private/tmp/filmer-reference-debug-final.log`.

## 8. Physical QA still required

Use expendable test assets. Do not uninstall a data-bearing FILMER installation. Keep an independently retained development-container copy before update testing; use a disposable QA container for corrupt/archive/storage-failure injection. No commands below authorize deleting real originals except the specific expendable Photos assets used to test missing-photo behavior.

1. Connect/unlock/trust an iPhone, enable Developer Mode as needed. Open `ios/FILMER.xcworkspace`, select FILMER, verify bundle ID/team and provisioning. Use a signed **Release** configuration if Debug remains blocked. Install as an **update** over a compatible test installation, never uninstall it first. Record device model/iOS/build and observed results.
2. Before update, create custom Film and Camera with covers, at least two Rolls, edited metadata and mixed Reference/legacy Copy fixtures, including valid noncontiguous frame order. Record IDs/order/counts. After update, cold launch/force quit twice; compare IDs, names, cover files, custom fields and Roll snapshots. Confirm legacy Copy reads after iOS container relocation/cache clear. No previously saved archive should be rewritten solely by launch.
3. Test full Photos permission: import 1, 2, 9 and 36+ images; order must follow picker selection; compare frame IDs/sortOrder after restart. Verify real PhotoKit IDs and no durable picker URI/original Documents copies. Test Gallery/Recently/Viewer and empty states.
4. Warm caches, delete an expendable original in Photos, return: **Photo unavailable**, stable frame and metadata, no stale share/contact-sheet export. Separately remove another image only from an album: it remains available. Confirm FILMER Roll/frame removal never removes the original Photos asset.
5. Deny Photos permission then return: **Photos access required**. Limited access excluding a referenced asset: **Photo access limited**, not a deletion assertion. Use Manage Photos Access/Retry, grant access and confirm recovery. Null picker identifiers, cancel and temporary native errors must not create fake frames.
6. Optimized-storage iCloud-only image online/offline: loading, timeout/failure, Retry after reconnect. Rapidly page full-size scans, background/foreground and change permissions during downloads. Check memory in Instruments; native request/callback/timeout behavior cannot be verified by JS mocks.
7. Relink unavailable frame: success retains original frame ID/position/date/location/note and Roll ID. Cancel, denied access, offline and save failure keep old references. Exercise zoom/rotate/swipe dismiss, nested Retry controls, long-press reorder, horizontal selection, vertical page scrolling and accessibility actions.
8. Create/edit/cancel/delete Rolls; cancel dirty drafts by buttons and native back gesture. Change Film/Camera, preserve photos/order/notes. Simulate disk-full only in disposable QA storage: no false successful save, no original/shared cover deletion. Retry should succeed after storage recovers.
9. Native share to Files/another target, Save Photos denied/granted, contact-sheet orientation and PNG export. After generating a sheet, remove/revoke a source and attempt Save/Share again: cached export must be blocked. Clear only FILMER image cache and confirm legacy Copy/custom covers remain.
10. Seed malformed JSON, duplicate IDs, unsafe paths, invalid optional metadata and unsupported future schemas in a **disposable** Roll and catalog database. Cold startup must expose recovery instead of a crash/empty reset. Retry failure retains exact bytes; original raw export matches; a valid externally repaired test payload can be retried successfully. Test recovery access with large text/VoiceOver and EN/VI/KO.
11. Test appearance/localization, keyboard/modal safe areas, empty/long names and large text on supported iPhone sizes. Native configuration advertises iPad: verify all rotations, modal/share anchors, launch screen and icon on an iPad too, or explicitly decide support/configuration before submission.

## 9. Prioritized release plan / TestFlight

1. **Review and commit the integrity fixes and all required prior native/source/assets.** Rerun `npx tsc --noEmit`, `node --test`, `git diff --check`; verify an unsigned Release build from the intended clean release checkout. Preserve existing DB/media; no clean install on valuable data.
2. **Reconcile SDK patches/native config and restore lint tooling in a separate reviewed change.** Run `npx expo install --check` and `npx expo-doctor` with network. Do not use force installs, ignore/exclude warnings blindly, or run destructive prebuild. If Debug linker symptoms return, reproduce in isolated DerivedData before changing native flags or packages; current audit Debug builds pass.
3. **Complete real iPhone upgrade/Photos/iCloud/recovery tests above, plus iPad support QA.** Keep a pass/fail record with device/iOS/build. Any original deletion, lost IDs/catalog records, unsafe restore/reset or unhandled startup exception is a stop-ship issue.
4. **Finish submission prerequisites.** Supply a real published privacy policy and accessible in-app link, review privacy manifests/data practices, screenshots/description/support URL, age rating and export-compliance answers. Verify App Store Connect bundle ownership and unique build number; align version/build sources deliberately.
5. **Produce and validate a signed archive, then upload to TestFlight.** In Xcode select Any iOS Device → Product → Archive, Organizer → Validate App → Distribute App → App Store Connect. Confirm processing/privacy/signing checks, add internal testers, then repeat device smoke/upgrade tests on the actual TestFlight build before considering public review.

**Final status remains NOT READY.** Automated checks and unsigned Release compilation do not replace the unverified critical physical-device, privacy and distribution checks.

Final audit verification: TypeScript passed; **120/120 automated tests passed**; whitespace check passed; final Metro export and unsigned Release build passed. Fresh isolated Debug and its sequential repeat passed. ESLint remains unconfigured and online Doctor remains 19/21. Physical iPhone, signed archive, TestFlight, in-place device upgrade and App Store privacy verification remain outstanding. **NOT READY.**
