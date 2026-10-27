# FiLog release readiness audit

Audit date: 2026-10-25 (Asia/Seoul). Scope: current working tree, not just HEAD. Original audit evidence is preserved below; the authorized P0 follow-up updates localized recovery wording and release documents. No data resets, installs, CloudKit operations or submissions performed.

## A. Executive summary

**Verdict: NOT READY for public release.** The local archive application is substantially implemented and its automated checks are healthy. TypeScript and ESLint pass; 215 Node tests pass; native CloudKit preflight passes 22 checks and ordered selection passes 16 assertions. These checks do not establish physical-device reliability or Production CloudKit restoration.

The largest gaps are distribution signing/Production verification, absent published privacy/support URLs, and physical-device stability/restore verification. FiLog is a fresh v1.0 application; FILMER → FiLog migration is NOT REQUIRED by confirmed product decision. FiLog syncs metadata, not original photo files, copied files or custom cover bytes. A successful metadata sync is not a complete backup.

### Snapshot and architecture

- Branch: `feat/icloud-sync-photo-recovery`; HEAD `41a05f4` (`feat: CloudKit sync groundwork, PHCloudIdentifier photo recovery and Settings/Storage redesign`). Previous substantive commits include `1d9d4cd` (release UI/statistics/imports), `5629f09` (catalog/archive management), `e38558d` (roll editing), and `4e66e33` (viewer gestures).
- Initial `git status --porcelain=v1`: **83 entries**, including staged renames, further unstaged edits and untracked tests/docs. Main groups: FILMER → FiLog iOS/Android/module rename; native entitlements/signature preflight; CloudKit driver; sorting; photo viewer/grid/resolver; startup crash fix; translations and audit documents. These are pre-existing user changes. There is no immutable committed release candidate corresponding to the audited tree.
- `app/`: Expo Router screens for Home, create/edit/detail, catalog, statistics, settings and privacy. `src/features/`: rolls, films, cameras, catalog, photos, cloud, contact-sheet, location, home, startup, settings. Shared UI/theme/i18n live under `src/components`, `src/constants`, `src/i18n`.
- React Native 0.86.3, React 19.2.3, Expo 57.0.29, TypeScript 6.0.3, Zustand 5.0.15; Hermes/new architecture. Committed native iOS and Android projects; this is a maintained-native app, not an Expo Go app.
- Actual persistence is JSON archives in **expo-sqlite KV storage**, using `filmer.rolls.v1`, `filmer.films.v1`, `filmer.cameras.v1`, `filmer.settings.v1`. Zustand publishes after repository writes. The normalized SQL schema in `src/database/database.ts` has no application caller; it is not the production archive path.
- Photos: custom Swift PhotoKit picker/resolver and cloud-identifier repair; derived JPEG renders in temporary storage; legacy Copy images and custom covers in Documents. CloudKit has a Swift transport and Objective-C signature preflight; merge/journal logic is TypeScript.
- `scripts/` contains native/assertion checks, legacy flow checks and asset tools. Nine `*.test.cjs` files exercise pure logic and mocked native/React boundaries. No functional Xcode UI test target or CI workflow was found. The scheme references a missing `FiLogTests` target.
- Prior release documents and QA artifacts were consulted as historical evidence only. Their passing builds and simulator screenshots were not counted as fresh physical-device verification.

**Stability assessment:** local persistence safeguards and targeted regression coverage are strong; startup, populated navigation, high-memory image use, real signing, live sync and restore remain release gates. No present core feature was proven BROKEN end-to-end by this audit. Two auxiliary verification scripts are broken under plain Node (section H).

## B. Feature completion matrix

`COMPLETE` means implementation plus relevant automated evidence within the stated scope, not a real-device certification. `PARTIAL` means useful implemented behavior with a concrete missing capability. `NOT VERIFIED` means code exists but decisive runtime evidence is absent. `NOT IMPLEMENTED` means no accessible implementation was found.

| Feature | Status | Evidence and remaining work |
| --- | --- | --- |
| Create roll | COMPLETE (logic) | `RollInformationScreen.tsx`, `rollDraft.ts`, `rollStore.createRoll`; validates input, saves before publication, prevents repeated submit, records `createdAt`. Mocked flow tests pass. Device form/navigation pending. |
| Select film/camera | COMPLETE (logic) | `/films`, `/cameras`, selection screens and draft store; built-in catalog, custom entries, per-roll film overrides. Catalog tests pass; device picker/modal checks pending. |
| Import multiple Apple Photos references | COMPLETE (logic); NOT VERIFIED on device | `PhotoImportService`, `ApplePhotosProvider`, native ordered picker; validates access and IDs, deduplicates, reports failed counts. Native selection checks and mocked import tests pass. Test limited/full access and iCloud-only selection on a phone. |
| Import new copied photos | NOT IMPLEMENTED in current user flow | `PhotoCopyService` and copy preference remain, but runtime import always calls `applePhotosProvider.pickMultiplePhotos`. No production caller of `copySelected` or `setImportMode` found. Existing copies still resolve/share/delete. Do not advertise a selectable Copy mode. |
| Browse/search/group rolls | COMPLETE (logic) | `app/index.tsx`, `useRolls`, `filterRolls`, `groupRolls`; All/Date/Film/Camera/Location, stable Roll keys, empty states. Browse/filter tests pass. |
| Newest first in All | COMPLETE (logic) | Creation timestamp descending with deterministic ID ties and legacy ID timestamp fallback; `createdAt` persists and is included in cloud projection. Tests cover edits and restore arrival order. Live restart/sync still needs device confirmation. |
| Date grouping of legacy records | PARTIAL | `validateRollArchive` accepts exact-day dates; `groupRolls` Date mode accepts only `YYYY-MM`. Legacy `YYYY-MM-DD` rolls disappear from Date mode while remaining in All. Tests explicitly codify this; decide and document intended behavior or normalize display grouping without rewriting records. |
| Roll detail / metadata editing | COMPLETE (logic); device fix NOT VERIFIED | Shared create/edit screen, dirty-draft discard protection, save failure feedback, photos preserved on metadata update. Current layout callback snapshots event height before deferred reducer. Regression passes; reported physical crash needs a fresh installed build check. |
| Full-screen viewer | NOT VERIFIED (native experience) | Paging/zoom/rotate, info sheet, notes/location, share, progressive images, three-slot neighborhood and preheat implemented. Hook/selection tests pass; flicker, gestures, orientation, decode and memory require device runs. |
| Photo order / selection / batch actions | COMPLETE (logic) | Persisted sort order, permutation validation, gesture selection and accessible moves; tests cover event/gesture boundaries. Real drag/scroll interaction pending. |
| Delete rolls/photos safely | COMPLETE (logic) | Confirmation UI (`RollActionsMenu`, batch actions), archive commit before owned-file cleanup, path/roll/ID validation, shared-file retention. No PhotoKit original deletion in these paths. Sync propagates tombstones; no undo guarantee. Device sync/deletion pending. |
| Film/camera collections | PARTIAL | Browse/search/add custom entries implemented with persistent covers. Stores expose add/apply/retry; no general custom catalog edit/delete API found. Per-roll film override editing is not global catalog editing. |
| Statistics and drilldowns | COMPLETE (logic) | `rollStats`, `/stats`, `/stats-rolls`; counts, activity, rankings, override/legacy IDs and drilldown tests pass. Device layouts pending. |
| Settings | PARTIAL | Language en/vi/ko, appearance, photo quality, access/repair, storage, sync controls. Persistence tested. Copy preference has no UI effect; privacy/support links hidden because URLs empty. |
| Contact sheet and photo sharing | COMPLETE (logic); native NOT VERIFIED | Contact-sheet geometry/capture/cache cleanup and export services tested with native mocks. Real Save/Share, orientation, permissions and large scan output pending. |
| Location selection | PARTIAL verification | Foreground-only location, native geocoding, map picker, validation and fallback. No external API key. Auxiliary location script currently fails to load RN; device geocode/permission/approximate-location testing pending. |
| Metadata sync | PARTIAL | Real CloudKit private database transport, field clocks, durable journal, staged apply, tombstones and retries. Extensive mocked failure tests; no live Production proof. |
| Automatic restoration after reinstall | NOT VERIFIED | Engine defaults enabled, fetches remote records and applies local archives at startup; not just notice UI. Reference recovery additionally requires valid cloud IDs, same Photos library/account and permissions. Actual reinstall journey not run. |
| Complete backup/restore including files | NOT IMPLEMENTED | No archive-package export/import with copied photos/covers. Recovery export is raw troubleshooting text only. OS device backup behavior is separate and unverified. |
| Accessibility | PARTIAL | Buttons/headers/labels, selection state and reorder actions exist. VoiceOver, Dynamic Type, contrast, focus in modals, reduced motion and iPad layouts not measured. |
| No flicker / black frames / smooth transitions | NOT VERIFIED | Good mitigations exist; no frame captures, mount counts, FPS or Instruments measurements in this audit. |

## C. Critical release blockers (P0)

### P0-1 — Distribution CloudKit/signing and restoration are unproven

Source identifiers match the requested values: bundle `com.manhduong2003.filog`, team `ZBTP6S3362`, container `iCloud.com.manhduong2003.filog`. This does **not** prove App ID registration, team ownership, provisioning or schema deployment. Both Debug and Release select cloud entitlements; Release Info configuration says Production, but the actual signed entitlement determines the environment. The native preflight reads embedded executable XML entitlements and fails closed if unavailable; actual distribution signature representation and TestFlight processing must be tested.

Reproduce safely using a dedicated test Apple account and synthetic library: distribute a correctly signed build, inspect its profile and entitlements, confirm runtime environment/availability, create/edit/order/delete on two devices, go offline/reconnect and test restoration on a separate clean installation. Compare record counts and IDs, metadata, frame order, resolvable references and unresolved counts. Do not uninstall the user's current library or reset its CloudKit container.

Exit gate: valid distribution archive/profile, deployed `FiLogEntity.document` schema, successful TestFlight sync/restore evidence and nonfatal unavailable/account-switch paths. A passing unsigned build does not clear this gate.

### P0-3 — Published privacy policy is absent

`src/constants/links.ts` has empty privacy and support URLs; Settings hides both. The in-app privacy explanation is useful but no public policy URL is configured. Publish a policy covering local storage, private CloudKit metadata, locations/notes, Photos references, external sharing, retention/deletion and local-only copies/covers. Add the policy link in app and App Store Connect; publish a working support destination. Apple requires accessible policy disclosures: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), especially 5.1.1.

### P0-4 — Known device crash fix lacks installed-build confirmation

Historical `docs/qa/startup-crash-2026-10-24/README.md` identifies a RollDetail deferred event access crash from a matching generated bundle. Current `app/rolls/[id].tsx:128` reads height synchronously and the event-lifetime regressions pass. This is evidence of a fix, not proof the phone is running it. Reused version/build `1.0.0 (1)` makes stale installations hard to distinguish. Install the correct signed build preserving the appropriate identity/data, identify it by build number and source revision, repeat populated navigation/layout/background cycles and inspect crashes.

### Resolved / removed P0 findings

- **FILMER → FiLog migration: NOT REQUIRED.** FiLog is a new product with bundle `com.manhduong2003.filog`, team `ZBTP6S3362`, container `iCloud.com.manhduong2003.filog`. Previous FILMER installations and its container remain untouched. Existing FiLog test data must also be preserved. Retain internal `filmer.*` keys; no branding migration is needed.
- **Overconfident restoration wording: corrected in code** in English, Vietnamese and Korean. Sync explanation and Data Safety now require previously successful metadata sync and the same Apple Account, exclude photo/cover bytes and avoid a restoration guarantee. The Photos guide explains limited/full access and recovery prerequisites; temporary previews are acknowledged as storage. A permission prompt no longer implies guaranteed photo recovery. Live restore remains NOT VERIFIED under P0-1.
- Privacy and Support drafts are prepared in `docs/PRIVACY_POLICY.md` and `docs/SUPPORT.md`; publication and final URL/contact configuration remain open under P0-3.

## D. Important improvements (P1)

| Finding | Evidence, reproduction and targeted next action |
| --- | --- |
| Recurrent global render invalidation | Every successful `metadata-synced` run calls `ReferenceRepairService.run`; the driver polls every 30 seconds while active. Repair invalidates renders at start and finish, notifies every photo hook, and scans all references sequentially. On a large stable library, leave viewer open through polling: expect redundant access checks and possible placeholders. Measure with existing metrics/signposts; run repair only when references/permissions/library state warrant it, preserving access revocation safety. No measured flicker claim. |
| Startup deliberately waits 3–6 seconds | `StartupScreen` minimum timer is 3000ms and deadline 6000ms, in addition to synchronous module/storage work. Even an empty library waits 3 seconds. It warms shooting-date order while Home All now uses creation order, wasting some startup IO. Profile cold launch, remove/shorten arbitrary dwell and use the same creation ordering for warmup. |
| Whole-library synchronous JSON work | Repositories validate/compare/stringify/write entire archives synchronously; cloud capture canonicalizes whole projections and persists the growing journal repeatedly (including every 10 acknowledgments). Retained preimages/history and tombstones have no bounded retention policy. Test 100/1,000 rolls and 1,000/10,000 frame fixtures; measure JS stalls/storage growth before selecting small batching/indexing improvements. No SQL-index optimization applies to the unused normalized schema. |
| Stable keys do not eliminate rerenders | Home uses inline `renderItem` and new `onPress` closures; `RollCard`/`RollThumbnailStrip` are not React.memo components. ThumbnailStrip sorts the full photo array each render to show four frames. `useRolls` memoizes grouping and store subscriptions are selective; claims that every gallery row is memoized are unsupported by current source. Profile actual commits; add memoization/stable callbacks only where measured. |
| Library changes can reveal loaders | `useResolvedPhoto` includes revision in image identity, so library/foreground invalidation hides previous sources until reverified. This protects revoked/deleted images. Test edit/revoke/foreground behavior; avoid blanket scans rather than keeping unauthorized previews. |
| Copy images bypass resized render pipeline | `resolvePhoto` returns original Documents URI for copies regardless of requested tier. Legacy large scans may decode at full size in thumbnails/viewer. Profile large Copy assets; add disposable resized derivatives if memory measurements justify it. |
| Export/contact-sheet memory and cancellation | Full explicit exports can request PhotoKit maximum size. Contact sheet resolves up to four images concurrently at 1200px, but `useResolvedPhotos` does not pass AbortSignals; close stops new work but leaves current resolves running. Test close/reopen and 36/72-frame high-resolution scans; cancel departed consumers and measure peak memory. |
| Legacy day-date filtering | Exact-day archived rolls are valid but excluded from Date tab. Decide expected grouping and add a display-only compatibility fix if all dated rolls should appear. |
| Native scheme/test debt | Scheme TestAction references a missing `FiLogTests` target; Run uses Release, Analyze Debug, Archive Release. Document Run behavior and repair stale test reference or introduce meaningful device tests. |
| Permission surface | Photos read/add and location descriptions are specific. Camera/microphone strings remain generic even though primary flow imports scans; Android also requests audio. Confirm actual usage, remove unused permissions in a separate scoped change, and test limited/denied/add-only behaviors. |
| SDK privacy and export review | Source manifest declares UserDefaults CA92.1, FileTimestamp C617.1, SystemBootTime 35F9.1, no tracking/collected types. 26 Pod manifest files exist and aggregation is enabled. This is presence evidence, not API-to-reason validation or archive compliance. Review generated archive report against actual APIs (including custom FileManager use). |
| Test/tool reliability | Two old plain-Node verification scripts fail on React Native Flow syntax; no CI workflow found. Repair native stubs/use the existing harness, then run lint/typecheck/tests/config in CI against a recorded candidate. |

### Performance verification protocol

Use a dedicated fixture library on a physical iPhone, with the same device/build/dataset/network for repeats. Cover 0/1/36/72 frames, 100–1,000 rolls, large scans, reference and legacy Copy assets, cold/warm/purged caches, iCloud-only assets and poor network. Record cold-launch time, first thumbnail/viewer latency, animation hitches, JS stalls, peak/settled memory and frame correctness. Use Instruments Time Profiler/Allocations/Animation Hitches, React Profiler and `app.filog.photos` `PhotoRender`/`RenderCacheHit` signposts; `photoRenderMetrics()` excludes native display latency.

Run: cycle all five filters while scrolled; rapidly swipe 30 frames then reverse; repeat open/close 20 times; background/foreground; edit/delete originals and change limited access; run poll/sync during scrolling; cancel import/share/contact sheets. Record precise build, counts and screenshots/video. Existing stable IDs, bounded grid cells, three viewer slots, coalesced requests, tiered renders, cancellation and 256-entry JS URI cache reduce work, but do not prove smoothness. Viewer black backdrop is intentional; transient missing image display is the behavior to measure. Native cache sweeps every 32 new renders, so pruning is not an instantaneous memory/disk bound. No confirmed memory leak or frame-rate number was established.

## E. Optional improvements (P2)

- Full portable archive export/import including Copy images and covers, if backup is intended as a product feature; keep metadata-only wording until then.
- Global custom film/camera edit/delete, undo/trash, and guided recovery of retained preimages.
- Bound/inspect retained history and orphaned Documents files without deleting active references; add storage diagnostics before automatic cleanup.
- Remove/archive obsolete code after confirming callers: unused normalized schema and `mockRolls`, dormant Copy import preference/service, legacy scripts; preserve `filmer.*` persistence keys intentionally.
- `ios-backup/` contains 18 tracked old native files. Distinguish it clearly from the maintained workspace; do not build or regenerate from it accidentally.
- Consolidate historical release docs and stale scheme/bundle references. In particular, the crash QA document still instructs use of FILMER/`filmer://`; current scheme/URL are FiLog/`filog://`.
- Extend accessibility and localization review across larger text, VoiceOver rotor/focus, contrast, reduced motion and supported iPad orientations.

TODO inventory: `rg -n 'TODO|FIXME|HACK|XXX' app src modules scripts` returned no matches (exit 1 means none). This does not mean no unfinished work: `src/constants/links.ts` explicitly says to fill URLs before submission. Dependency-generated TODOs are outside this inventory.

## F. CloudKit and data safety assessment

### What is really implemented

`FiLogCloudModule.swift` uses `privateCloudDatabase`, custom zone `FiLog-v1`, record type `FiLogEntity`, JSON `document` field and SHA256 deterministic record names. Zone-change tokens page 100 records at a time; optimistic saves compare record tags. Server conflict data flows back into the engine. No CKAsset upload is implemented.

`CloudSyncEngine.ts` uses schema-1 documents, per-field Lamport counters/device tie-breaks, permanent deletion tombstones, local baselines, server tags and durable staged projection. Fetches precede projection; missing frame documents pause incomplete restoration. Account identity is checked before/after network operations; changing accounts pauses rather than mixing libraries. Expired token code 21 triggers a bounded full refetch; vanished physical cloud records/history pause for review. Projection validates roll/catalog data. `retainLocalPreimages` keeps changed local values before apply, and interrupted cross-store apply can resume only from compatible before/after values. These are meaningful safeguards, but cross-store writes are staged, not one SQLite transaction.

Local edits work without iCloud; retries are foreground polling at 30 seconds, debounced local changes at 800ms and foreground/account notifications, with failure backoff up to 300 seconds and server retry hints. No background subscription/push sync was found, so do not promise continuous background synchronization. Explicit foreground sync may bypass polling backoff; bounded save conflict passes are three. Native device ID is a per-process UUID, with persisted journal counter providing continuity; test concurrent offline edits, not clock-time assumptions.

### Data coverage

| Data | CloudKit coverage | Restore limitation |
| --- | --- | --- |
| Roll IDs, creation time, stock/camera IDs/names, month/date, format, frame count, notes, lab, location, film override metadata | Yes, whitelisted by `wireItems` | Requires successful upload to same signed environment/container/account. |
| Photo IDs, provider, order, date, location, note, usable PHCloudIdentifier and reference identity | Yes | Links only; no pixels. Local-only reference identity is not a usable replacement asset on another installation. |
| Apple Photos original files | No | Owned by Photos/iCloud Photos separately; recovery needs accessible matching assets/cloud IDs and Photos permission. Photos availability is independent of metadata sync. |
| Legacy app-owned Copy photo bytes | No | Restored records receive missing-file placeholders; existing local matching paths are retained. Reinstall without an OS backup loses these files. |
| Custom film/camera metadata | Yes | Built-ins are bundled, not uploaded as user catalog records. |
| Custom cover bytes / local cover paths | No cross-install transfer | Existing local covers retained during merge; absent covers cannot be rebuilt from metadata. |
| Language/theme/quality/import preference/guide-seen state | No | Local preferences only. |
| Derived previews/share exports | No | Disposable; regenerated when originals remain available. |
| Local retained preimages and raw recovery export | No | Local troubleshooting history/text, no automatic portable restore import. |

**Automatic restore is an implemented engine path, not merely UI. It is NOT VERIFIED working in Production.** A fresh journal defaults enabled; root starts sync; empty local catalogs/rolls trigger download/apply progress. Previously disabled or never-successful sync cannot guarantee restoration. `metadata-synced` means no pending metadata after a successful pass, not all photos recovered or durable full backup.

Migration inside the same app sandbox preserves legacy keys, arrays/schema-1 envelopes and unknown fields, fails closed for invalid archives, and does not replace corrupt records with sample data. Repository compare-before-write prevents overwriting unexpected bytes. Cloud reference repairs use compare-and-set and independently verify asset access. FILMER-to-FiLog migration is NOT REQUIRED for this fresh product. These controls must continue to protect existing FiLog test data. Preimage storage lacks a user-facing restore workflow, so recovery can require engineering intervention.

### Required live matrix (all NOT VERIFIED here)

Development vs TestFlight Production; no iCloud/denied/restricted account; quota/network failure and retry; expired token; concurrent edits/order/deletion; account switch during fetch/save; crash between staged writes; first sync with existing local data; new device/reinstall; missing/limited/deleted originals; cloud IDs absent/malformed; legacy copies/covers. Use disposable accounts/data and never physically delete/reset the user's cloud history. Record expected merge semantics: deletion is permanent for a stable ID and sync is not an immutable backup.

## G. App Store compliance and native checklist

| Requirement | Code/config evidence | Remaining gate |
| --- | --- | --- |
| Bundle/team/container | Requested values present in native project/plist/entitlements | Apple Developer registration, capabilities and profile ownership NOT VERIFIED. |
| Debug/Release | Cloud entitlement file selected in both; Debug setting Development, Release Production | Actual signed environment must be inspected; Release configuration alone is insufficient. |
| Minimum OS / toolchain | Target and Podfile default iOS 16.4; Xcode 27.0 build 27A266a available; build uses iPhoneOS27.0 SDK | Confirm upload accepts this installed toolchain/SDK release. Apple's published minimum since April 28, 2026 is Xcode 26/iOS 26 SDK or later: [requirement](https://developer.apple.com/news/upcoming-requirements/?id=02032026a). |
| Native plist | Photo read/add and foreground location descriptions; generic camera/microphone; no background location | Purpose strings and permission necessity review; test no forced full-access requirement. |
| Icon/splash | App icon 1024 asset, Contents.json and SplashScreen.storyboard present, config validator passes | Visual inspection, alpha/appearance and launch on supported device sizes; screenshots still needed. |
| Orientation/iPad | Native iPhone portrait/upside-down; iPad also both landscapes, tablet supported; app.json says portrait | Verify all native-supported layouts or align configuration before release. `LSMinimumSystemVersion=12.0` is not the effective target (16.4). |
| Prebuild | app.json lacks team, cloud entitlements/container/environment, native privacy manifest preservation and custom signing phase configuration | **Do not run clean prebuild on this candidate.** It can overwrite maintained-native setup. Either keep native workflow or first encode/test reproducible config plugins in an isolated copy. No prebuild was run. |
| CocoaPods/native module | Lockfile Expo57/RN0.86.3/FiLogPhotos1.0.0, CocoaPods1.17.0; custom module targets16.4 | Archive verifies actual linked binaries; no pod update/install performed. |
| Expo/EAS | Public Expo config resolves; no eas.json/build profiles/project ID found | EAS is optional if using Xcode Organizer. Configure intentional distribution route/build increment. |
| Privacy Policy/Support | Empty URLs, in-app explanation exists | Publish and set in code/ASC; P0-3. |
| App Privacy questionnaire | No analytics/ads SDK identified; source manifest says no tracking/collected types | Review off-device metadata, precise location/notes, Photos/Maps/system services and SDK practices using Apple's definitions. Do not infer questionnaire answers from permission prompts or manifest emptiness. [Apple guidance](https://developer.apple.com/app-store/app-privacy-details/). |
| SDK manifests / required reason APIs | App manifest has three declared categories/reasons, Pod aggregation enabled, 26 Pod manifest files present | Generate archive privacy report, inspect bundled manifests/signatures and reconcile actual API usage; source presence is not validation. [Manifest guidance](https://developer.apple.com/documentation/BundleResources/privacy-manifest-files). |
| Account deletion / Sign in with Apple | No app-account registration/login or third-party sign-in flow found | Generally not applicable to current app-owned accounts; re-evaluate if added. Apple Account/iCloud access does not itself mean app account creation. Make synced deletion/retention understandable. |
| iCloud disclosure | In-app text describes metadata and local-only files | Recovery wording qualified in en/vi/ko during P0 follow-up; prior-upload and file exclusions are explicit. Live Production restore remains unverified. |
| Encryption/export | CloudKit/system transport; no custom cryptography protocol found (SHA256 IDs are not encrypted payloads); no ITSAppUsesNonExemptEncryption key found | Determine actual exemption and answer export compliance in ASC; absence of key is not automatic rejection or proof of nonexemption. |
| Functionality/review access | Archive/edit/browse/stats/sharing form substantial functionality in code | Crash-free populated launch/navigation, offline operation and reviewer instructions need signed device validation. |
| Metadata/screenshots/age rating | No proof of ASC app record or finalized metadata in repository; QA screenshots are not a complete store set | ASC manual review of category, age questionnaire, rights to film artwork/brands, support, localizations, iPhone/iPad screenshots, review notes and availability. |
| Accessibility | Several roles/labels/states and reorder alternatives present | VoiceOver/Dynamic Type/focus/contrast/manual audit; do not claim comprehensive support yet. |

No App Store Connect, provisioning portal, paid developer membership, Production schema or TestFlight state was accessed. Repository absence means **not verified**, not proof those portal tasks were never done. Schema deployment is a separate action: [Apple CloudKit production deployment](https://developer.apple.com/documentation/CloudKit/deploying-an-icloud-container-s-schema).

## H. Verification results

All commands below were executed against this working tree unless explicitly marked not run. Tests use disposable mocks/temp artifacts; no real app archive was loaded/deleted for testing.

| Command | Actual result |
| --- | --- |
| `git status --short`, `git branch --show-current`, `git log -8 --oneline`, `git diff --stat` | Snapshot above; extensive existing edits, not a clean release candidate. |
| `npm run typecheck` | PASS, exit 0. |
| `npm run lint` | PASS, exit 0, no diagnostics. Scope `app src`; native/scripts not linted. |
| `npm test` | PASS, 215 tests, 0 failed/cancelled/skipped; about 12.77s runner duration. No device UI or live CloudKit test implied. |
| `npm run check:ios-config` | PASS, exit 0; declarations/identities/resources agree. Explicitly not live signing/cloud verification. |
| `npm run test:native-cloud` | PASS, 22 checks; no real CloudKit container initialized. |
| `npm run test:native-selection` | PASS, 16 assertions. |
| `npx expo install --check` | Exit 0, local bundled dependency map says up to date. Tool warns network disabled and offline validation unreliable. No online compatibility/vulnerability conclusion. |
| `npm ls --depth=0` | PASS, exit 0; installed top-level versions resolve without reported invalid/missing dependencies. |
| `npx expo config --type public --json` | PASS, exit 0; resolved SDK57 config. Does not validate Apple portal state. |
| `npx expo export --platform ios --output-dir /private/tmp/filog-audit-export` | PASS; production iOS JS/assets exported. Log `/private/tmp/filog-audit-export.log`. |
| `plutil -lint ios/FiLog/Info.plist ios/FiLog/PrivacyInfo.xcprivacy ios/FiLog/FiLog.Cloud.entitlements ios/FiLog.xcodeproj/project.pbxproj` | PASS, all four OK. Syntax only. |
| `git diff --check` | PASS at initial verification, no whitespace diagnostics. |
| `xcodebuild -version` | Xcode27.0, build27A266a. |
| `xcodebuild -list -workspace ios/FiLog.xcworkspace` (sandboxed) | FAIL exit66; CoreSimulator/cache access failures and misleading “not a workspace file.” Native workspace XML exists. Environment failure, not proof project is invalid. Build retried with approved service access below. |
| `node scripts/check-location.cjs` | FAIL exit1, `SyntaxError: Unexpected token 'typeof'` while loading React Native Flow source via plain Node. Mock boundary needs repair. |
| `node scripts/check-roll-flow.cjs` | FAIL exit1, same RN Flow import error. Also contains obsolete synchronous assumptions about custom camera creation. No completed flow verification from this command. |
| `ls node_modules/.bin/expo-doctor` | Not installed locally. Full Expo Doctor NOT RUN; no package downloaded during audit. |
| Signed archive/export/upload, `check:cloudkit-signing` against a provisioned .app | NOT RUN; no distribution-signed artifact supplied/generated. No signing success claimed. |
| Device/simulator UI, Instruments, live CloudKit, restore | NOT RUN in this audit. Historical QA is labeled separately. |

Release build invocation (unsigned device compilation/linking/bundling, no install/archive/upload):

```sh
xcodebuild -workspace ios/FiLog.xcworkspace -scheme FiLog \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /private/tmp/filog-audit-release CODE_SIGNING_ALLOWED=NO build \
  > /private/tmp/filog-audit-release.log 2>&1
```

Build result and effective settings are recorded in the audit completion addendum below. An unsigned build can establish compilation, not distribution provisioning or runtime CloudKit access.

## I. Release roadmap

Legend: **complete** = demonstrated in this audit; **code** = requires implementation/config changes; **Developer/Xcode**, **ASC** = manual portal/tool action; **device** = physical verification. Manual items may already exist outside the repository; check before recreating them.

| Order | Step | State / owner / exit evidence |
| --- | --- | --- |
| 1 | Finalize configuration and candidate | **Code + Developer/Xcode**. Fresh FiLog identity confirmed; migration NOT REQUIRED. Preserve FILMER and FiLog test data. Publish/configure privacy/support URLs, align orientation/permissions if needed, and assign the next unused build number. Recovery wording corrected. Review/commit existing changes into an identifiable candidate. Source identity checks already **complete**. |
| 2 | Close release bugs | **Code + device**. Confirm installed event-lifetime crash fix; address recurrent repair invalidation and legacy-date behavior as warranted; run the 12-step journey with populated data and write failures. Existing automated checks **complete**; physical acceptance open. |
| 3 | Verify Production schema | **Developer/Xcode + device**. Inspect requested container/team and schema; deploy Development schema to Production deliberately, then verify `FiLogEntity.document` with a disposable Production account. Do not copy/reset user records. |
| 4 | Create signed Release archive | **Developer/Xcode**. Select FiLog workspace/scheme, team, correct App ID/container and valid distribution profile; Archive Release and export/validate for distribution. Inspect codesign/profile and run `node scripts/verify-cloudkit-signing.cjs /path/to/FiLog.app`. Retain dSYMs/source maps and source revision. |
| 5 | Set up ASC app record | **ASC**. Confirm bundle ID, name, SKU, agreements and availability. Existence not verified here. |
| 6 | Complete app information/privacy | **Code + ASC**. Publish URLs; fill privacy questionnaire from data-flow review, export compliance, current age rating, category, rights and review contact/instructions. Verify policy from app and product-page URL. |
| 7 | Upload build | **Developer/Xcode + ASC**. Organizer/Transporter or configured EAS route; wait for processing and resolve validation/privacy warnings. No upload authorized/performed by this audit. |
| 8 | Internal then external TestFlight | **ASC + device**. Assign internal testers only after crash/signing/basic sync gates; provide known limits and test data instructions. External distribution requires relevant beta review and metadata. |
| 9 | Real-device regression | **Device**. iPhone and supported iPad, target minimum/newer OS where available, reference and Copy libraries, permissions, all create/edit/delete/share/stats/settings flows, airplane mode, account changes, Production cross-device restore. Use separate clean test installation; do not uninstall real library. Capture crashes/hitches/memory and reconcile counts/IDs after every destructive fixture action. |
| 10 | Store screenshots/metadata | **ASC + device**. Accurate localized images for supported device families, description of metadata-only sync, keywords/promotional text/support, no unsupported recovery claims. |
| 11 | Submit for review | **ASC**. Select tested build, finalize required answers/review notes and submit manually only after all P0 gates pass. Explain Photos references, optional iCloud and offline functionality. |
| 12 | Monitor release | **ASC + device/engineering**. Review Organizer/ASC crash diagnostics, user reports and sync errors; retain symbolication artifacts, monitor account/network/unresolved-photo cases, plan a small corrective release. No third-party crash collection should be added without updating disclosures. |

### Exact next engineering task

**Prepare and verify a signed FiLog Release candidate using the confirmed fresh identity.** No FILMER migration work is required. Use a unique build number and preserve every existing FiLog test installation and cloud record. Inspect distribution profile/entitlements, validate device startup/Roll Detail, then test Development and Production metadata sync/restore with a dedicated account and a second fresh device installation. No uninstall or reset is authorized. See `docs/FILOG_PUBLISH_PLAN.md` for owners, steps and acceptance evidence.

## J. Final verdict

**NOT READY.** Automated logic verification is healthy and the core archive experience exists. Public-release confidence is blocked by unverified signed Production capabilities/restore, absent published privacy/support configuration, and the need to confirm the known crash fix in a populated physical-device build. The report does not certify internal/external TestFlight readiness before a signed artifact and basic device gates are demonstrated. The follow-up changes localized disclosure text only; merge, persistence and crash-fix logic remain intact. FILMER migration is explicitly NOT REQUIRED.

## Audit completion addendum — fresh native build evidence

- The unsigned device Release command in section H **completed successfully, exit 0, `BUILD SUCCEEDED`**. This is a fresh build from this audit, not a historical result. It used arm64/iPhoneOS27.0 and created `/private/tmp/filog-audit-release/Build/Products/Release-iphoneos/FiLog.app` with native modules, compiled launch storyboard, icon assets, `main.jsbundle` and privacy bundles. No installation or signing was performed.
- `xcodebuild -showBuildSettings -project ios/FiLog.xcodeproj -scheme FiLog -configuration Release` also **passed, exit 0**, with approved Xcode service access. Log: `/private/tmp/filog-audit-settings.log`. Effective values: `CODE_SIGN_ENTITLEMENTS=FiLog/FiLog.Cloud.entitlements`, `DEVELOPMENT_TEAM=ZBTP6S3362`, `FILOG_CLOUD_ENVIRONMENT=Production`, `PRODUCT_BUNDLE_IDENTIFIER=com.manhduong2003.filog`, `IPHONEOS_DEPLOYMENT_TARGET=16.4`, `SDK_VERSION=27.0`.
- Build warnings remain: dependency deprecation/documentation/unused-variable warnings; Hermes bundle global/eval warnings; Hermes/react-native-maps script phases without declared outputs; skipped AppIntents metadata extraction. Build success does not demonstrate these cause runtime faults, and this audit does not classify warnings alone as release blockers.
- The built app contains the main privacy manifest and privacy bundles for React, Expo Constants/FileSystem/MediaLibrary and RNViewShot. Their presence strengthens packaging evidence but does not replace an Organizer privacy report, SDK signature validation or policy/API review.
- Final readiness remains **NOT READY**: unsigned compilation clears one verification gap, while the distribution, Production data, policy and physical-device gates remain open.

## P0 follow-up — confirmed fresh product and new verification

This section records the authorized follow-up after the original audit. FiLog is a completely new v1.0 product; **FILMER → FiLog migration is NOT REQUIRED and is removed from critical blockers**. Existing FiLog test data/installations and both products' cloud data remain protected. Stable P0 IDs above retain their original numbering; P0-2 is removed, not an unresolved dependency.

### Files changed by this follow-up

- `docs/FILOG_RELEASE_READINESS.md`: product decision, corrected P0 scope/verdict/roadmap and verification evidence.
- `docs/FILOG_PUBLISH_PLAN.md`: developer/Codex ownership, portal/signing/schema actions, Development/Production procedures, physical-device regression and publishing checklist.
- `docs/PRIVACY_POLICY.md`, `docs/SUPPORT.md`: drafts with explicit developer/contact/effective-date placeholders, ready for developer review before publication.
- `src/i18n/settings-translations.ts`: sync explanation, Data Safety and linked-photo heading in English, Vietnamese and Korean.
- `src/i18n/translations.ts`: all three Photos guides now explain access choices and conditional recovery; previews acknowledged as local storage.

Pre-existing Home tour, UI, CloudRestoreNotice and other worktree changes were preserved. No build number, native entitlement, internal storage key, cloud conflict logic, retained history or user archive was changed by this follow-up.

### Native and data-safety review

Both effective configurations were rechecked using:

```sh
xcodebuild -showBuildSettings -project ios/FiLog.xcodeproj -scheme FiLog -configuration Debug
xcodebuild -showBuildSettings -project ios/FiLog.xcodeproj -scheme FiLog -configuration Release
```

Both passed (exit 0). Logs: `/private/tmp/filog-p0-debug-settings.log` and `/private/tmp/filog-p0-release-settings.log`. Both resolve team `ZBTP6S3362`, bundle `com.manhduong2003.filog`, `FiLog/FiLog.Cloud.entitlements`, Automatic signing / Apple Development, minimum iOS 16.4. Debug environment setting is Development; Release is Production. Shared entitlements declare the intended container and CloudKit; the actual distribution signature/profile/environment is still NOT VERIFIED. Apple Development in Release does not prove Production authorization. Manual portal/schema/archive actions are prepared in the publish plan and were not executed.

Reviewed transport/projection/driver still implement metadata download/apply, field conflict clocks, account checks, staged recovery and retained preimages. There is no original/Copy/cover byte upload. Same-account prior successful sync and usable Photos originals/identifiers/permissions are required for conditional recovery. No data-safety mechanism was removed. Roll Detail retains its synchronous height/scroll snapshot; both existing event-release regression tests pass, so no duplicate regression or crash-fix change was needed. Physical verification remains pending.

### Fresh verification results

| Command | Actual follow-up result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0. |
| `npm run lint` | PASS, exit 0, no diagnostics. |
| `npm test` | PASS, 215 tests, 0 failed/cancelled/skipped; about 14.51s runner duration. Includes both Roll Detail event-release regressions and existing cloud safety tests. |
| `npm run check:ios-config` | PASS, exit 0; native version 1.0.0/build 1, orientations/resources/identity declarations match. |
| `npm run test:native-cloud` | PASS, 22 checks; no real CloudKit container initialized. |
| `npm run test:native-selection` | PASS, 16 assertions. |
| Debug/Release `xcodebuild -showBuildSettings` above | PASS, both exit 0; capability declarations only. |
| Unsigned Release build below | PASS, exit 0, `BUILD SUCCEEDED`; arm64 device compilation/bundling. |
| `git diff --check` | PASS, no whitespace diagnostics. |
| Signed distribution, portal/profile authorization, live sync/restore, physical UI | NOT VERIFIED; not executed. |
| Original auxiliary Node flow scripts | Original failures retained in section H; not changed or rerun during this follow-up. |

```sh
xcodebuild -workspace ios/FiLog.xcworkspace -scheme FiLog \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath /private/tmp/filog-audit-release CODE_SIGNING_ALLOWED=NO build \
  > /private/tmp/filog-p0-release.log 2>&1
```

The fresh build includes updated localized text and the existing code-level crash fix. Existing dependency/Hermes/script warnings remain; successful unsigned build does not establish signing, live CloudKit or crash-free device navigation. No build was installed or submitted.

### Updated decision

**NOT READY for public release.** Migration is no longer a blocker and overconfident source wording is corrected. Remaining P0 gates: signed distribution/Production capability and sync/restore evidence; physical-device confirmation of the known crash fix and populated journeys; publication/configuration of real privacy/support URLs and contact. No public URL/email was invented. Internal TestFlight requires a signed, processed candidate and basic device acceptance first. Follow the exact next three actions in `docs/FILOG_PUBLISH_PLAN.md`.
