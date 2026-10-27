# FiLog release readiness — NOT READY for App Store

## Latest Storage / automatic-restore revision — 2026-10-22

**NOT READY; signed iCloud/reinstall verification is still required.** Storage now follows the reference hierarchy from iCloud downward, with dedicated compact typography, card spacing and four-line lists. No unconditional protection checkmark, encryption guarantee, uploaded-original claim or destructive delete control is shown.

First-install metadata restore has a localized nonblocking notice with actual received-record counts, validating/applying and paused/Retry states. Additive Roll/frame membership prevents a Roll from being published before its known frames arrive. Existing journal, account binding, tombstones, local-first repositories and PhotoKit remapping are retained. No local schema migration, uninstall or data reset occurred. Covers and legacy Copy bytes remain local and are not protected by this CloudKit implementation.

**192 automated tests pass**, plus one Simulator screenshot/scroll XCTest. TypeScript, lint, native config, Metro export and diff checks pass. Debug Simulator and Release generic-device unsigned builds succeed. Doctor remains **19/21** (maintained-native configuration warning and four Expo patch mismatches). Real iCloud account, Development/Production schema, two signed devices, actual reinstall, permission/iCloud-only photo cases remain unverified. `FILMERCloudSyncProvisioned` remains false. Setup and exact files: [Cloud Sync QA](docs/CLOUD_SYNC_QA.md). Screenshots: [Storage visual QA](docs/qa/storage-2026-10-22/README.md).


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


Updated 2026-10-15 (Asia/Seoul), after SDK patch alignment, lint setup and Reference import drag selection. **Ready to begin signed physical-device QA; not approved for release.** No app was installed/launched on an iPhone, and no device data was reset or removed. Previous comprehensive audit and its detailed data-integrity findings are preserved in [docs/PRE_RELEASE_AUDIT_2026-10-15.md](docs/PRE_RELEASE_AUDIT_2026-10-15.md); this report supersedes its dependency, lint, picker and test results.

## Update 2026-10-21 — PHCloudIdentifier Reference recovery

- New optional `cloudIdentifier` on Apple Photos References. Import and Relink store it when PhotoKit provides one; absence never fails an import. Existing records are not rewritten.
- Apple APIs: `PHPhotoLibrary.cloudIdentifierMappings(forLocalIdentifiers:)`, `PHPhotoLibrary.localIdentifierMappings(for:)`, `PHCloudIdentifier(stringValue:)` / `.stringValue`, `PHPhotosError.Code.identifierNotFound` / `.multipleIdentifiersFound` (all iOS 15+; deployment target 16.4). Mapping for the picker result now runs off the main thread.
- On `unavailable`/`limited` resolution, a stored cloud identifier is mapped to this device's localIdentifier, verified, then saved through the existing write-protected repository. Only `assetId`/`localIdentifier` change. Permission-denied/temporary errors never trigger it. One lookup per stale reference until Retry/app activation/library change. Manual Retry and Relink unchanged.
- Validation: TypeScript and ESLint pass; **148/148 Node tests** (11 new recovery tests, mutation-checked); unsigned iOS Simulator Debug build succeeds with no FiLogPhotos warnings; Expo Doctor offline 19/21 (native config sync warning, and Directory check needs network).
- **Physical iPhone restore/migration is UNVERIFIED.** Cloud identifiers require iCloud Photos on the same Apple Account and are not a guaranteed cross-device recovery.

## Current results

- TypeScript passes; ESLint passes without warnings; **125/125 Node tests pass**, zero skipped/failed. Native Photos/SQLite/filesystem in these tests are mocked.
- **16 Swift assertions pass** against the actual ordered-selection/range/edge-velocity model. These are not UIKit gesture tests.
- iOS Metro export and unsigned arm64 generic-device Release build pass with the new picker and updated pods. Unsigned arm64 generic-device Debug also passes; neither build was installed on a physical device.
- Online Expo SDK dependency check passes. Expo Doctor **20/21**, exit 1: only the maintained-native configuration warning remains, deliberately visible and documented.
- No new storage schema, original-photo copy, Photos deletion API, data reset, cloud service or Copy import mode was introduced. I-03 guarded startup, validation/write protection, retry/raw export and legacy Copy resolution remain intact and covered by the full suite.

## SDK compatibility and native configuration

Exact online Doctor mismatches before alignment:

| Package | Previously installed | Official expected / now installed |
| --- | --- | --- |
| expo | 57.0.27 | 57.0.29 (`~57.0.29`) |
| expo-constants | 57.0.21 | 57.0.22 (`~57.0.22`) |
| expo-linking | 57.0.12 | 57.0.13 (`~57.0.13`) |
| expo-location | 57.0.20 | 57.0.21 (`~57.0.21`) |
| expo-router | 57.0.25 | 57.0.27 (`~57.0.27`) |
| expo-sharing | 57.0.22 | 57.0.23 (`~57.0.23`) |

Versions were selected by Expo's online compatibility recommendations and verified using `expo install --check`; React Native stays **0.86.3**, React **19.2.3**, TypeScript **6.0.3**. No force install, SDK-major upgrade, prebuild or clean prebuild was used. SDK patch dependencies also update ExpoAsset, ExpoModulesCore/Worklets/Adapter/JSI and ExpoUI in the lockfiles. A targeted `pod update ... --no-repo-update` reconciled the changed local podspecs; initial `pod install --no-repo-update` failed on the old ExpoModulesWorklets lock and did not constitute a passing check.

**Native ownership:** `ios/` is intentionally maintained, with scene-aware AppDelegate, custom Podfile and Xcode settings. App config plugins do not automatically update native files during normal builds. Doctor names `orientation, scheme, userInterfaceStyle, ios, android, plugins, icon`; this is a real maintenance obligation, not a missing dependency. [docs/NATIVE_CONFIGURATION.md](docs/NATIVE_CONFIGURATION.md) records the exact authority mapping and known orientation/version differences. The new read-only `npm run check:ios-config` passes critical identity/Photos permission/scheme/resource/module checks. Existing native bundle ID, signing, Info.plist, AppDelegate, Hermes and orientation settings were not rewritten.

ESLint uses **9.39.5**, Expo config **57.0.2**, and Expo's flat configuration ([official setup](https://docs.expo.dev/guides/using-eslint/)). Production scope is `app src`. Scoped exceptions cover existing Reanimated SharedValue mutation, Animated.Value refs and prop-driven state reconciliation; hooks order and dependency checks stay enabled. React Compiler is not opted into this app. This does not claim lint coverage of generated native code or external assets.

## Reference selection implementation

Apple's [official PHPicker sample](https://developer.apple.com/documentation/photokit/selecting-photos-and-videos-in-ios) explicitly says ordered selection disables swipe-to-select. The former `.ordered` picker cannot provide the requested gesture while preserving user selection order; Expo ImagePicker's multiple-selection option does not change that. iOS 17 `continuous` selection controls delivery and is not a drag-range guarantee. Minimum deployment remains iOS 16.4.

Multi-import now uses a public **PhotoKit + UICollectionView** grid in the existing local Expo module. Single-photo Relink keeps system PHPicker. It uses a lazy PHFetchResult and visible-cell sized, cancelable thumbnail requests with iCloud access; no full-resolution export or persistent original copy occurs in the picker. Photo-library and foreground changes refresh the accessible grid. Limited access exposes Manage Access, denied exposes Settings, and thumbnail failures expose Retry.

Tap toggles selection; start a drag horizontally on a thumbnail then move across rows. A vertical start scrolls normally. Hold an active drag near either edge to scroll. Reversing restores the previous range; starting on a selected frame deselects a range. Numbered badges, localized count, Clear, Cancel and Add controls are provided in English/Vietnamese/Korean. No photo-opening action competes with selection. The picker currently browses the accessible library newest-first; it does not add album/search UI. Actual gesture smoothness and large-library memory remain unverified on hardware.

The ordered ID batch is verified through PhotoKit before one Roll-store commit. Null/URI/unverified IDs are never saved as References. Duplicate identifiers within a pick and already referenced assets in the same Roll are skipped; existing records and legacy duplicate frames are not modified. Cancel and all-duplicate imports make no archive write. Existing IDs, metadata, sort gaps and frame order survive; a 36-photo batch/relaunch regression checks this. A legacy invalid localIdentifier uses the same assetId fallback as resolution when detecting duplicates.

## Changed files for this follow-up

The workspace already contained substantial catalog/artwork, recovery and Reference work; those unrelated existing changes were preserved.

- `package.json`, `package-lock.json`, `ios/Podfile.lock`: six SDK patches, compatible lint tooling, reproducible verification scripts and reconciled native dependencies.
- `eslint.config.js`: minimal Expo flat configuration and narrowly scoped existing-code exceptions.
- `scripts/verify-ios-config.cjs`: read-only critical native-config assertions.
- `modules/filog-photos/ios/ReferenceSelectionViewController.swift`: native import grid, thumbnail lifecycle, drag range/edge scroll, localized access/loading/error/actions.
- `modules/filog-photos/ios/OrderedPhotoSelection.swift`, `scripts/native-selection-tests/main.swift`: deterministic ordered range model, edge velocity and 16 native assertions.
- `modules/filog-photos/ios/FiLogPhotosModule.swift`: multi-import presents the grid; single Relink retains PHPicker; returns IDs only.
- `src/features/photos/services/PhotoReferenceService.ts`: sends localized picker labels and current theme to the native module.
- `src/features/photos/providers/ApplePhotosProvider.ts`, `src/features/photos/services/PhotoImportService.ts`: verified ordered imports, duplicate prevention and single-commit behavior.
- `src/features/photos/services/__tests__/photoImport.test.cjs`: five added regression cases and updated former duplicate-import expectation (120 → 125 tests).
- `src/i18n/translations.ts`, `app/rolls/[id].tsx`: picker labels/all-duplicates feedback; small memo/dependency lint corrections in Roll Detail.
- `src/features/photos/components/ReorderablePhotoGrid.tsx`, `src/features/photos/hooks/useResolvedPhoto.ts`, `src/features/photos/hooks/useResolvedPhotos.ts`, `src/features/location/components/LocationPicker.tsx`, `src/features/rolls/types.ts`: unused import/type order/stable callback/effect dependency lint fixes.
- `src/features/photos/REFERENCE_MODE.md`, `docs/NATIVE_CONFIGURATION.md`, `docs/PRE_RELEASE_AUDIT_2026-10-15.md`, `RELEASE_READINESS.md`: current behavior, native ownership and historical/current audit evidence.

## Commands executed

Repository root unless noted. Logs/builds/exports go under `/private/tmp`, not app Documents or any device container.

| Command | Result / log |
| --- | --- |
| `npx expo install expo@~57.0.29 expo-constants@~57.0.22 expo-linking@~57.0.13 expo-location@~57.0.21 expo-router@~57.0.27 expo-sharing@~57.0.23` | Passed; `/private/tmp/filmer-align-deps.log` |
| `npx expo install eslint@^9.0.0 eslint-config-expo --dev` | Passed; `/private/tmp/filmer-eslint-install.log` |
| `pod install --no-repo-update` (ios/) | Initially failed, changed local Worklets podspec required explicit update |
| `pod update Expo EXConstants ExpoLinking ExpoLocation ExpoRouter ExpoSharing ExpoModulesCore ExpoModulesWorklets ExpoModulesWorkletsAdapter --no-repo-update` (ios/) | Passed, 109 dependencies/108 pods; `/private/tmp/filmer-picker-pods-update.log` |
| `npx expo install --check` | Passed, “Dependencies are up to date”; `/private/tmp/filmer-picker-deps-check.log` |
| `node /Users/bean/.npm/_npx/c15e4b19a90d9797/node_modules/expo-doctor/build/index.js --verbose` | Doctor 1.20.4, 20/21, exit 1; only native synchronization warning; `/private/tmp/filmer-picker-doctor.log`. Repeat normally with `npx expo-doctor --verbose` |
| `npm run typecheck` | Passed (`tsc --noEmit`) |
| `npm run lint` | Passed, zero warnings; `/private/tmp/filmer-eslint-results-final.log` |
| `npm test` | 125/125 passed; native IO mocked |
| `npm run test:native-selection` | 16 assertions passed; macOS Swift compiler, no UIKit gesture simulation |
| `npm run check:ios-config` | Passed static critical-config assertions |
| `npx expo export --platform ios --output-dir /private/tmp/filmer-picker-export` | Passed; iOS Hermes bundle 4.3 MB; `/private/tmp/filmer-picker-export.log` |
| `xcodebuild -workspace ios/FiLog.xcworkspace -scheme FiLog -configuration Release -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-picker-build CODE_SIGNING_ALLOWED=NO build` | **BUILD SUCCEEDED**, exit 0, arm64 device target, new native picker compiled/linked; `/private/tmp/filmer-picker-release-final.log` |
| `xcodebuild -workspace ios/FiLog.xcworkspace -scheme FiLog -configuration Debug -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filmer-picker-build CODE_SIGNING_ALLOWED=NO build` | **BUILD SUCCEEDED**, exit 0, arm64 device target; `/private/tmp/filmer-picker-debug.log` |
| `git diff --check` | Passed production changes; repeated after documentation |
| `npm audit --json` | Read-only review, 33 advisories (11 moderate/21 high/1 critical), not a passing security check; `/private/tmp/filmer-picker-npm-audit.json`. No broad audit fix/force upgrade performed |

CocoaPods reports an existing leading-newline plist-parser warning; plist syntax itself is valid. Xcode reports script phases without output declarations, including react-native-maps; these do not make the successful unsigned Release build a signed archive/device test. No prior React Native Debug linker workaround was added.

## Remaining blockers and risks

| Priority | Status / required action |
| --- | --- |
| P1 | **Physical-device QA unverified**: signed in-place upgrade, new selection gestures, real permissions/iCloud/cache invalidation, recovery, legacy files, native share/export and iPad support. Blocks App Store READY |
| P1 | **Signing/submission unverified**: bundle ownership, distribution profiles, unique build number (currently 1.0.0/1), signed archive validation and App Store Connect privacy answers |
| P1 | **Privacy policy missing**: supply a published, accurate policy and accessible in-app/App Store Connect links; no invented URL added |
| P1 | **Source completeness**: local native module/recovery/assets include existing untracked files; include all intended sources in the reviewed release commit and verify a clean checkout |
| P1 review | npm audit has transitive advisories, including critical shell-quote 1.10.0 command injection via comment-token serialization in development/tooling dependency paths (including react-devtools-core). Assess actual reachability and compatible remediation separately; no claim of security clearance or proof of production exploitability |
| P2 | Native config warning is understood/retained; documented portrait/iPad landscape and hardcoded version sources require deliberate maintenance, not destructive prebuild |
| P2 | Previous audit's optional-frame-count clearing issue, settings corruption recovery limits, missing general custom catalog editing/deletion, English native permission prompts and decorative artwork inaccuracies remain as documented in the historical audit |

Backup/Restore remains intentionally excluded from FiLog 1.0; emergency raw archive export is I-03 recovery only. Settings warns that uninstalling can permanently lose local Roll metadata; Apple Photos originals are not deleted. Nothing in these changes provides cloud backup. Since 2026-10-21, Reference recovery through PHCloudIdentifier can repair a stale photo link; it does not back up Roll metadata.

## Physical iPhone verification required

1. Open `ios/FiLog.xcworkspace`, choose the authorized development team and a connected iPhone, build/run **over the existing app with the same bundle ID**. Do not uninstall. Record device/iOS/build/signing and preserve important data using an existing safe external process. For Debug Metro use `npm start`; separately test a signed Release without Metro.
2. Snapshot Roll/photo IDs, metadata/order, custom catalogs/covers, settings and existing Copy files. Update in place, force quit/reopen; compare all records. Confirm I-03 recovery on a disposable test database with malformed/future/read-failing archives, failed retry and exact raw export; never corrupt a valuable database for this test.
3. In Add Photos: test one photo, several nonadjacent photos, horizontal-start drag across three rows, reverse drag, deselection from a selected anchor, Clear, Cancel and Add. Drag to both edges and hold to auto-scroll; vertical-start scrolling must stay usable. Test 100+ selections and a large library, no unintended photo opening, frozen UI or wrong reused-cell thumbnail. Repeat EN/VI/KO, large text, light/dark and supported iPad rotations.
4. Add 36 photos in a deliberately nonchronological order; verify badges, final frame order and one batch. Retry the same assets; confirm no duplicate frames. Cancel changes nothing. Force quit/reopen, verify durable IDs still resolve and Reference import did not add original files under Documents.
5. Test full/limited/denied access, including changing access while picker is open/backgrounded; Manage Access/Settings, Retry and inaccessible selected assets must fail safely without deleting frames. Single-photo Relink success/cancel/error preserves frame ID/order/metadata. Actual permission and thumbnail failures require hardware, not mocks.
6. Test a cloud-only photo online, airplane-mode failure, then Retry online; use expendable assets to compare album-only removal with true Photos deletion. Existing frame becomes Photo unavailable only when inaccessible, and old cached image must not masquerade as current. Preserve legacy Copy access when its original is deleted; app cache clearing must preserve Copies/covers.
7. Delete an expendable FiLog Roll; confirm no Apple Photos original was deleted. Smoke-test Viewer, reorder, sharing/contact sheets, custom Film/Camera cover persistence and startup recovery. Complete signed Release/TestFlight validation after privacy/signing requirements, without uploading as part of this task.
8. Cloud-identifier recovery (iCloud Photos on): import expendable photos on device A and confirm records gain `cloudIdentifier`. Restore that device backup to device B (or migrate), open the Roll and confirm frames resolve without Relink, then force quit/reopen and confirm they stay resolved with unchanged frame IDs, order and details. Repeat with iCloud Photos off (expect Photo unavailable plus working Relink), with a photo deleted on A before migration, under limited and denied access, and offline (expect temporary error, no write).

## Next release actions

1. Review/commit the SDK, lint and picker changes together with required prior local native sources/assets.
2. Sign an in-place development build and execute the device matrix above; fix any confirmed blocker before release.
3. Review privacy policy/manifests, dependency advisories, iPad support and native config/build-number ownership.
4. Repeat `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:native-selection`, `npm run check:ios-config`, `npx expo install --check`, `npx expo-doctor --verbose`, Metro export, unsigned native builds and `git diff --check` from the intended release checkout. Doctor's single documented native-maintenance warning is expected until the architecture changes deliberately.
5. Validate a signed archive, then perform TestFlight internal testing once authorized separately. **App Store status: NOT READY; physical-device QA can begin after signing.**
