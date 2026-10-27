# Physical-iPhone startup / Roll Detail crash investigation — 2026-10-24

## Confirmed root cause

The reported exception is **`TypeError: Cannot read property 'layout' of null`**, in RollDetail. It is not the previous archive validation error and is not caused by CloudKit.

The user supplied these JavaScript stack frames:

```text
anonymous@178592:35
basicStateReducer@17560:48
updateReducerImpl@17615:75
useState@17564:28
anonymous@7598:42
RollDetail@178532:54
renderWithHooks@17410:31
beginWork@18693:31
workLoopSync@20731:24
renderRootSync@20620:18
performWorkOnRoot@20421:55
flushSyncWorkAcrossRoots_impl@16639:21
anonymous@16579:93
```

Exact positions matched the existing Xcode device build artifact:

`/Users/bean/Library/Developer/Xcode/DerivedData/FILMER-fzqcktudrfpipkekzfnngwmygeof/Build/Products/Release-iphoneos/main.jsbundle`

```text
178532  var [viewport, setViewport] = useState(...)
178590  onLayout: event => setViewport(value => ({
178591    ...value,
178592    height: event.nativeEvent.layout.height
178593  })),
```

The native layout event was captured inside a deferred React state reducer. React Native can release its event payload before the reducer runs, making `event.nativeEvent` null. The installed React Native production renderer confirms this: `Libraries/Renderer/implementations/ReactFabric-prod.js:1274` releases nonpersistent events after dispatch, and its destructor at line 384 sets `nativeEvent` to null. `__pthread_kill` is the native termination endpoint of the unhandled JS exception, not the cause.

Executing the actual callback extracted from that existing bundle, clearing `nativeEvent`, and then invoking the queued reducer reproduced `TypeError: Cannot read properties of null (reading 'layout')` in Node (the same failure with Node's wording).

This callback was introduced in the preceding, uncommitted photo-performance change. The minimal fix snapshots the numeric height synchronously before passing the updater to React. The updater no longer retains the event. The earlier simulator launch smoke only exercised Home, so it did not cover this Roll Detail callback. The matching scroll callback already snapshots its offset; other layout callbacks read their event synchronously. No similar deferred layout-event access was found in the source audit.

The complete native crash diagnostic was not collected. The supplied exception message and JS positions were enough to identify and reproduce this code path. Local Metro history contained older unrelated TypeErrors through October 21, not this device exception; they were not treated as evidence for this crash.

## Separate optional CloudKit startup protection

These are independently regression-tested failure paths, not the reported layout crash:

- Guard optional bridge discovery and its namespace/deviceID constants during module evaluation. A bridge initialization failure leaves local functionality available.
- Catch partial service-subscription initialization failures, remove already installed subscriptions, and expose a nonfatal cloud error.
- Handle null/undefined native rejection values in both CloudSyncEngine and the driver so error reporting itself cannot throw another TypeError.
- Missing native methods and corrupt cloud journals remain nonfatal; journals are not discarded or reset.

RollRepository and catalog loaders already return recovery state on read/validation failure. Settings preferences already validate supported language/appearance/quality values. Existing bridge methods remain compatible; no native API change is required by this crash fix. A static runtime-import audit of 163 app/source modules found no local import cycles (type-only imports excluded). TypeScript and Metro check import resolution; these do not prove all possible runtime inputs safe.

## Files changed for this investigation

- `app/rolls/[id].tsx`: snapshot layout height before the state updater.
- `src/features/rolls/utils/__tests__/startupLayout.test.cjs`: execute the actual JSX callbacks after event release; preserve latest viewport state.
- `src/features/cloud/services/cloudSync.ts`: guard bridge/constants and service startup; tolerate null rejection values.
- `src/features/cloud/services/CloudSyncEngine.ts`: tolerate null rejection values in error classification.
- `src/features/photos/services/__tests__/photoImport.test.cjs`: append optional-service initialization/failure regressions to the existing native-IO harness.
- This report.

Other existing uncommitted performance, CloudKit, Settings, translation and build-script edits were preserved. No schema, identifier, reference, order or storage migration was introduced. No app uninstall, physical-device installation, data clearing, local-original deletion or CloudKit record operation was performed as part of the investigation.

## Validation

- `npm test`: **207 passed, 0 failed** (including 2 event-lifetime tests and 3 CloudKit initialization/failure test cases with multiple variants).
- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings/errors.
- iOS Metro export with source maps: passed. Fresh Hermes export source content contains the corrected synchronous snapshot.
- Debug simulator build: **BUILD SUCCEEDED**.
- Release simulator build (arm64): **BUILD SUCCEEDED**.
- Device-target Debug build (arm64, unsigned compilation only): **BUILD SUCCEEDED**.
- Native CloudKit preflight: **19 checks passed**, no real container initialized. iOS configuration checks passed.
- Standalone Release simulator startup and a deliberate nonexistent-Roll deep link (`filmer://rolls/__startup_layout_smoke__`) rendered the expected Roll-not-found page through RollDetail and its ScrollView layout callback without Metro or a crash. This route did not reference or modify a real Roll. Screenshot: `/private/tmp/filmer-startup-crash-release-smoke.png`.
- Device-target Release build (arm64, unsigned compilation only): **BUILD SUCCEEDED**; generated JS inspection confirmed the fixed callback.

Artifacts are under `/private/tmp/filmer-startup-crash-*`: tests, lint, export logs/output, native build logs, and `original.jsbundle` (the pre-fix generated device-build JS, retained before rebuilding). These are temporary local build artifacts, not app data backups.

## Native / JS synchronization

The device-build JS artifact contains the exact pre-fix code and positions from the crash, so there is evidence of the bug in the built JS rather than a speculative native-module mismatch. A fresh export contains the fix. The installed app reports version `1.0.0`, build `1`; those reused version numbers cannot establish its bundle identity. The installed device app has not been replaced or verified as fixed. Signing and install-time iCloud capabilities require the actual provisioned build, not an unsigned compilation check.

## Physical verification (still required)

1. In Xcode select this workspace, branch `feat/icloud-sync-photo-recovery`, scheme FILMER, and **iPhone Bean**. Rebuild and Run over the existing installation with the same bundle identifier. Do not uninstall, reset storage, change signing identity/container, or delete the app. This investigation has not installed a build on the phone.
2. For Debug, ensure Metro serves this exact checkout and not an old server/bundle. For Release, rebuild its embedded JS; do not simply launch the existing app. Confirm the built bundle or source map snapshots height before `setViewport` and has no `event.nativeEvent` read in that updater.
3. Cold launch; open a Roll, return Home, reopen, background/foreground and repeat at least 20 times. Exercise selection, scrolling and layout changes. The previous layout TypeError must not recur.
4. Repeat offline and with iCloud unavailable. Local browsing/editing must work and cloud errors must remain nonfatal. Verify existing Rolls, photos, PhotoKit IDs/order, covers and legacy Copy files are present. Restore network and check normal sync; no journal reset is expected.
5. Repeat both Debug and Release. A passing simulator/build/test is not physical-device verification.

If it still crashes, provide the full Xcode All Output console from process launch through exception, including the entire `Unhandled JS Exception` message, all JS stack frames and preceding warnings; the symbolicated `.ips` from Devices and Simulators → device logs; Debug/Release configuration, bundle/build ID, timestamp, commit plus working-tree state, Metro URL/connection, and the exact matching JS bundle/source map (or Xcode build report showing the bundle source). Capture the Objective-C exception reason at the throw point if Xcode truncates the final report. Do not substitute only the pthread backtrace.

Final native results: **Debug and Release builds succeeded for both simulator and device targets**. Device builds used `CODE_SIGNING_ALLOWED=NO` and generic iOS destinations: these validate compilation/linking and bundling, not signing or execution on the phone. The rebuilt device Release intermediate `main.jsbundle` was inspected and contains `var height = event.nativeEvent.layout.height;` before `setViewport`, with only the captured numeric `height` used in the reducer. The original failing generated bundle was retained separately in `/private/tmp/filmer-startup-crash-original.jsbundle`.

Device build commands used the existing DerivedData path above with `-sdk iphoneos -destination 'generic/platform=iOS'` and `-configuration Debug` / `Release`. Simulator builds used `/private/tmp/filmer-photo-build` and `-sdk iphonesimulator -destination 'generic/platform=iOS Simulator'`; Release selected arm64. Full logs: `debug.log`, `release.log`, `device-debug.log`, `device-release.log` under the `/private/tmp/filmer-startup-crash-` prefix.

**Physical-iPhone fix verification: PENDING.** The source fix is supported by exact stack/bundle matching, reproducing the pre-fix callback, passing event-lifetime regression tests, fresh bundled artifacts, and a Release simulator Roll Detail layout smoke check. The existing installation on iPhone Bean has not been replaced or launched by this investigation.
