# FiLog v1.0 publishing plan

Updated 2026-10-25 (Asia/Seoul). **Verdict: NOT READY for public release; signed internal TestFlight candidate preparation is next.** This is a maintained-native React Native + Expo project. No prebuild, portal mutation, schema deployment, upload, installation, uninstall or data reset is authorized by this plan alone.

## 1. Confirmed product identity

| Item | Decision |
| --- | --- |
| Product | FiLog, a completely new iOS application, version 1.0.0 |
| Bundle identifier | `com.manhduong2003.filog` |
| Developer team | `ZBTP6S3362` |
| CloudKit container | `iCloud.com.manhduong2003.filog` |
| FILMER → FiLog migration | **NOT REQUIRED**, removed from P0 blockers |
| Existing data | Preserve all FILMER data/container and all FiLog local test data/installations/cloud records |
| Internal keys | Keep `filmer.rolls.v1`, catalog/settings keys and cloud journal prefixes; no branding-only migration |

Owner: **Codex** maintains this decision in documentation; **developer** ensures the correct app/container is selected in Apple tools. Never use the old FILMER container for FiLog testing.

## 2. Implemented features and evidence

Create/edit rolls; film/camera selection and custom catalog creation; multiple reference-photo import and ordering; browse/search/grouping with creation order in All; detail/viewer/selection; safe local deletion; statistics; settings; photo repair; contact-sheet/share; metadata sync and restore engine are implemented. See [readiness matrix](FILOG_RELEASE_READINESS.md#b-feature-completion-matrix) for exact statuses and limitations. Device UX and live CloudKit are not certified by source inspection.

**Codex completed in this follow-up:** removed migration gate; qualified English/Vietnamese/Korean sync, recovery and Photos-access text; corrected the zero-extra-storage claim to acknowledge previews; drafted Privacy Policy and Support; reviewed crash regressions and native identity/entitlements; prepared the procedures below. No merge/persistence/conflict-resolution logic was changed. Verification results are recorded in the readiness report's P0 follow-up section.

## 3. Remaining P0 gates

| Gate | Owner | Exit evidence |
| --- | --- | --- |
| Signed device/archive capabilities | Developer in Portal/Xcode; Codex can inspect supplied artifacts | Valid profile/signature for the requested bundle/team/container; exported distribution environment Production; runtime cloud preflight succeeds. Unsigned compilation is insufficient. |
| Production schema and live sync/restore | Developer performs authorized schema deployment/testing; Codex investigates failures | Dedicated-account Development and Production tests below pass; logs/counts/IDs retained. Automatic restore remains NOT VERIFIED. |
| Physical device stability | Developer runs device checklist; Codex fixes reproduced defects | Correct numbered build opens populated Roll Detail repeatedly without known crash or new failures. |
| Public privacy/support destinations | Developer supplies contact and publishes pages; Codex configures approved final URLs | Real public pages and contact work; URLs configured in app/ASC. Drafts alone do not clear submission gate. |

Removed gate: FILMER migration. Resolved source issue: unconditional recovery promises in all three supported languages. The public-release verdict remains NOT READY because the remaining evidence gates are open; no new technical blocker is inferred from migration.

## 4. P1 improvements before public release

Owner **Codex**, based on measured/device evidence: reduce recurring full-library repair/global render invalidation, profile whole-archive synchronous work and retained history growth, review deliberate 3–6 second startup delay, test large legacy Copy decoding/export memory, resolve exact-day Date-tab behavior if required, repair stale Node auxiliary checks and missing scheme test target, review unnecessary camera/microphone permissions. Avoid broad refactors. Owner **developer**: measure hitches/memory and accessibility on iPhone/iPad and review artwork rights. See readiness report for reproduction paths.

## 5. Apple Developer Portal actions

Owner **developer (manual)**. These resources were not accessed or changed by Codex.

1. Sign in with the paid team `ZBTP6S3362`; confirm membership, agreements and permission to manage identifiers/profiles. A Personal Team does not establish App Store distribution readiness.
2. Under Certificates, Identifiers & Profiles, inspect the explicit App ID `com.manhduong2003.filog`; create it only if absent and intentional. Enable iCloud/CloudKit and associate **only the intended** `iCloud.com.manhduong2003.filog` container. Leave FILMER untouched.
3. Confirm Apple Development signing for registered test devices and Apple Distribution signing for App Store Connect export. Use automatic provisioning or generate compatible profiles deliberately. Do not revoke other certificates or replace profiles blindly.
4. Check profiles authorize this team, App ID, CloudKit service/container and required environment, and have not expired. Confirm test device registration if using development/ad hoc installation.
5. In CloudKit Console select this exact team/container. Inspect Development record schema for `FiLogEntity` with `document` String, custom private zone `FiLog-v1` and record-name/change-token transport. The implementation does not query a custom index or upload CKAssets; do not add speculative schema/indexes.
6. After Development acceptance, inspect and deliberately deploy schema changes to Production. Schema deployment is separate from uploading user records. Do not reset environments or delete records. Record deployment date and actual resulting schema. [Apple deployment guidance](https://developer.apple.com/documentation/CloudKit/deploying-an-icloud-container-s-schema).

## 6. Xcode signing and archive actions

Owner **developer (manual)**; **Codex** can verify logs/artifacts without uploading.

1. Open `ios/FiLog.xcworkspace`, scheme `FiLog`. Preserve the native project and local module. Do not run `expo prebuild --clean` or regenerate Pods/dependencies as a signing workaround.
2. Confirm target bundle/team above, automatic signing and iCloud capability. Both configurations currently select `FiLog/FiLog.Cloud.entitlements`, with CloudKit service/container. Empty `FiLog.entitlements` is an optional local-only fallback, not evidence that the default build supports iCloud.
3. Debug has `FILOG_CLOUD_ENVIRONMENT=Development`; Release has `Production`. Both currently resolve Apple Development signing identity with automatic signing. Development-signed Release can still use Development. Distribution export must produce authorized **Production** entitlements. Do not force Production into a development profile merely to match Info.plist. The actual signature decides; verify runtime namespace/preflight as well as plist.
4. Version stays **1.0.0**. Current native `CFBundleVersion` is **1**. In App Store Connect check the highest uploaded build, choose the next unused integer (2 only if unused), update `ios/FiLog/Info.plist` build number in this maintained-native workflow and record it with the commit/worktree. Increment for every subsequent upload. A Debug/Release label alone does not identify the embedded JS. No speculative bump was made in this follow-up.
5. Use a registered physical iPhone to validate the candidate. Updating an existing FiLog install must preserve the same bundle identifier/data; do not uninstall if a signing conflict occurs. Stop and investigate the conflict first. No installation is performed by Codex here.
6. Select generic iOS Device/Any iOS Device, Product > Archive. Scheme Archive uses Release; Run also currently uses Release (choose Debug deliberately when needed). Review warnings and archive validation.
7. Organizer > Distribute App > App Store Connect; prepare/inspect export and profile, but upload only when the developer elects to perform that action. Retain `.xcarchive`, exported `.ipa`/app, dSYMs and matching JS bundle/source maps.
8. Read-only checks on the actual exported app:

```sh
codesign --verify --strict /path/to/FiLog.app
codesign -d --entitlements :- /path/to/FiLog.app
node scripts/verify-cloudkit-signing.cjs /path/to/FiLog.app
```

Confirm team `ZBTP6S3362`, application identifier suffix `.com.manhduong2003.filog`, expected container, CloudKit and Production for distribution, matching nonexpired profile and runtime account availability. The existing script checks several profile/capability fields but is not a complete distribution validator; manually verify expected team, distribution environment, certificate and export route. Recheck behavior in processed TestFlight build because archive compilation is not live capability validation.

Candidate configuration inventory: iOS deployment target 16.4; iPhone portrait/upside-down; iPad also landscape left/right, supportsTablet true; app.json says portrait. Test all native-supported orientations or make a scoped intentional alignment later. Icon 1024 and launch storyboard exist. Photos read/add and foreground-location strings exist, privacy manifest and Pod aggregation are present. Generic camera/microphone descriptions require necessity review. No EAS setup is required if using Organizer; no EAS configuration is currently provided.

## 7. Development and Production CloudKit test procedure

Owner **developer runs**, **Codex reviews evidence/fixes defects**. Use a dedicated disposable Apple Account on test devices. Never sign a user's active device out of its Apple Account as a test, uninstall an existing FiLog installation or erase/reset cloud records. If a clean installation is needed, use a second device that has never installed FiLog; otherwise request explicit approval for any destructive reset and postpone that test.

1. Record build/revision, signature environment, account alias (no credentials), OS/devices, metadata counts and source Photos library. Keep Development and Production evidence separate; one does not prove the other.
2. Development-signed build: confirm cloud preflight configured and account available. Create synthetic rolls with notes/date/location, custom film/camera with covers, and ordered Photos references. Include originals with usable cloud IDs and absent cloud IDs; preserve existing FiLog data.
3. Sync and record pending count/last metadata sync. On a second authorized test device verify roll/photo IDs, creation order, notes, location and order. Custom covers/photo files should not be expected to transfer. Verify Photos recovery only for matching accessible iCloud Photos assets.
4. Use airplane mode on the test device; edit fixture metadata and confirm local persistence/restart and pending changes. Reconnect while active and verify eventual sync. Exercise concurrent edits/order changes and tombstone deletions **only on named synthetic fixtures**. Check both devices converge without silent resurrection or unrelated data loss.
5. Exercise denied/limited Photos permissions and unavailable originals with fixture images only. Missing images must preserve metadata and offer access/retry/relink. Do not delete real originals to simulate failure. Test unavailable-account paths using an isolated device/account setup, not the user's personal library.
6. On a fresh second installation using the same test account/environment, launch without creating data. Engine defaults enabled and should fetch/apply metadata; record progress and verify IDs/counts/order. Permission must be user chosen; restored metadata alone is not a restored image. Validate missing Copy placeholders and absent cover bytes honestly. If no safe clean install exists, mark this step pending.
7. After manual Production schema deployment, repeat using a processed TestFlight build against Production. Do not expect Development records in Production. Stop on unsupported schema, account mismatch or review-required state; retain raw diagnostics and preimages, never reset the journal to force a pass.
8. Preserve fixture metadata/checklists as evidence; do not clean up by resetting a zone/container. Any fixture deletion must be deliberate and confined to synthetic test records through normal app behavior.

Pass criteria: convergence of IDs/counts/metadata/order; newest-created roll first after restart/sync; no loss outside deliberate fixture deletions; clear pending/error/unresolved states; missing files never claimed backed up. No background-continuous-sync guarantee: driver operates primarily while active/foreground.

## 8. Physical iPhone and iPad validation

Owner **developer**, with **Codex** investigating failures.

- Record exact build/revision and confirm the fresh embedded JS. Known Roll Detail fix snapshots layout height synchronously before its deferred reducer; existing layout/scroll regressions deliberately null the event before invoking that reducer.
- Cold launch and open a populated roll, return, reopen, scroll/select/reorder, rotate supported iPad layouts and background/foreground at least 20 cycles; repeat Debug and Release without replacing existing data with fixtures. Capture full JS exception and symbolicated `.ips` on failure.
- Create roll, pick film/camera, import multiple selected Photos, verify order/counts, edit every metadata field, open viewer, swipe quickly/reverse, zoom/share/contact-sheet/save and delete only synthetic frames/rolls with confirmation.
- Exercise all Home filters/search and statistics drilldowns; restart and sync to verify creation order. Check Settings persistence and all three locales, limited/denied Photos, location denied/approximate access, airplane mode and cache cleanup with originals retained.
- Use large reference/legacy Copy images and a populated library to measure memory/hitches and verify no wrong-image or transient black-frame regression. Check VoiceOver focus/buttons/reorder, large text, contrast and supported iPad sizes.
- Capture pass/fail per build/device/scenario; a successful compile or empty Home screenshot does not clear populated journey testing.

## 9. App Store Connect setup

Owner **developer (manual)**. Confirm an iOS app record with official bundle ID/name/SKU, agreements and access roles. Provide category, current age-rating questionnaire, content rights, territories/pricing, review contact/instructions and accurate description/localizations. No FiLog login exists; describe optional iCloud and Photos permission rather than invent reviewer credentials. Supply screenshots matching supported iPhone/iPad layouts, no personal photos/locations. Complete privacy and export-compliance answers from actual data flows; no custom encryption claim is inferred from use of SHA256/system CloudKit. Validate current App Store SDK/toolchain acceptance at upload time.

## 10. Policy, support and SDK disclosure review

Owner **Codex drafts/configures supplied values**; **developer approves contents/contact and publishes**.

- Drafts: [Privacy Policy](PRIVACY_POLICY.md), [Support](SUPPORT.md). Replace developer/contact/effective-date placeholders before publishing. No URL or email was invented. Publish using the developer's chosen host; deployment is not authorized here.
- Once real HTTPS destinations are supplied, set `privacyPolicyUrl` and `supportUrl` in `src/constants/links.ts`. Settings hides empty URLs; do not replace them with fake addresses or local Markdown paths. Add policy URL in ASC App Privacy and support URL in app-version metadata/localizations. Test browser access and in-app links without authentication. [Apple privacy requirements](https://developer.apple.com/app-store/app-privacy-details/) and [review guidelines](https://developer.apple.com/app-store/review/guidelines/).
- Data flow audit: local SQLite/KV stores notes, dates, locations, IDs and settings; Documents holds covers/legacy copies; temporary storage holds previews/shares. CloudKit private records contain whitelisted metadata and photo links, **no CKAsset photo upload**. Retained local preimages/tombstones mean deletion is not instant erasure of all history. Reference-only Photos originals remain under Photos/iCloud Photos. Sharing exports content to the chosen destination; Maps/geocoding uses system services. Native debug share logging is gated by `__DEV__`.
- Reviewed SDK purposes: React Native/Expo/Zustand interface and state; expo-sqlite and file-system persistence; media-library/image-picker/native PhotoKit selection and rendering; location/react-native-maps system location/maps; react-native-share/expo-sharing/view-shot export; gesture-handler/reanimated/worklets/screens navigation and motion. No standalone ads/analytics SDK found in package inventory. This is a source inventory, not a legal conclusion about Apple's collection definitions.
- Source privacy manifest declares no tracking/collected types and required-reason categories UserDefaults CA92.1, FileTimestamp C617.1 and SystemBootTime 35F9.1. Pod privacy aggregation is enabled and manifests exist. Generate Organizer privacy report from the actual archive; compare API usage/reasons, bundled SDK manifests/signatures and off-device practices. Do not automatically select “Data Not Collected” based on permission strings or manifest emptiness. Resolve discrepancies before submission.
- No app-owned account/sign-in flow exists, so account deletion and Sign in with Apple are not currently triggered by an app registration feature. Re-evaluate if product behavior changes.

## 11. Internal TestFlight procedure

Owner **developer (manual)**; **Codex** can help inspect errors and update candidate source.

1. Complete device startup/Roll Detail, official signing and Development sync smoke gates; record build and known limitations. Complete Production schema deployment manually before testing cloud behavior in TestFlight.
2. Archive/export/validate the unique 1.0.0 build, inspect identity/profile/Production expectations and retain artifacts. Publish contact/policy pages before public submission; configure them before wider beta distribution.
3. Upload through Organizer/Transporter only when authorized by the developer. Wait for processing; resolve validation, manifest and export-compliance issues. No upload has occurred in this task.
4. In ASC TestFlight, supply beta information/feedback contact, select build and add internal users/group. Internal TestFlight readiness is established only after successful processing and basic physical-device gates; current report does not claim it.
5. Test the processed build's Production runtime preflight and two-device sync/restore procedure. Track issues by build/revision. Increment build for each upload. External testing additionally requires relevant beta review and complete metadata; do not expand distribution while P0 data-safety/stability tests fail.

## 12. Final App Store submission checklist

Owner **developer approves/submits**; **Codex** verifies supplied code/artifacts and resolves reproduced defects.

- [ ] All remaining P0 evidence gates closed; no migration task required.
- [ ] Correct signed Production candidate has passed populated iPhone/iPad and cloud regression; existing FiLog/FILMER data preserved.
- [ ] Privacy/support pages public with real contact; in-app and ASC URLs correct; recovery/file exclusions accurate in en/vi/ko.
- [ ] Archive privacy report/SDK compliance reviewed; export questionnaire, permissions and data disclosures agree.
- [ ] Version/build, supported orientations/OS, screenshots, age rating, content rights, descriptions and review instructions complete.
- [ ] Tested build selected in ASC; review contact and availability/pricing approved.
- [ ] Developer submits manually and monitors review messages/crash diagnostics/sync reports; retained dSYMs/source maps allow symbolication.

## Exact next three actions

1. **Developer:** confirm the official App ID/container capability and valid signing profiles under team `ZBTP6S3362`; choose the next unused 1.0.0 build number. Keep every existing installation and cloud record.
2. **Developer + Codex:** build a signed candidate, inspect its signature/profile and run populated physical-iPhone startup/Roll Detail plus Development sync smoke tests; Codex addresses only reproduced failures.
3. **Developer:** after Development acceptance, deliberately deploy/verify Production schema, create/upload the numbered archive and distribute internally through TestFlight, then execute Production sync/restore on isolated test installations. In parallel publish approved policy/support drafts and supply the final URLs for Codex to configure.
