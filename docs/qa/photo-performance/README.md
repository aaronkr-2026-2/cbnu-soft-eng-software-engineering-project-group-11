# Photo loading performance — 2026-10-24

## Findings and implementation

Source inspection confirmed the following work on critical paths. These findings are not device profiling results.

| Before | After |
| --- | --- |
| PhotoKit callbacks dispatched JPEG encoding, directory enumeration and file writes to main | A serial render queue owns requests, encoding, disposable file IO, cancellation and timeout completion |
| Every new native render used a UUID URL | Temporary URL hashes asset ID, edit date, dimensions and original/export flag; current PhotoKit access is checked before reuse |
| Full viewer quality requested `PHImageManagerMaximumSize` | Viewer progressively requests thumbnail, physical screen size and (active High Resolution only) up to 4096px; explicit export still supports originals |
| Changing thumbnail to full discarded rendered state | Stable reference identity retains verified preview during upgrades; decoded image remains beneath its replacement until onLoad |
| Active viewer image resolved separately by toolbar and slot | Only the slot resolves images; sharing independently validates through the existing export service |
| Neighbours requested only thumbnails | Three mounted slots request screen previews; matching PHCachingImageManager preheat starts/stops around the selected frame |
| ScrollView mounted every Roll and every grid photo | SectionList virtualizes Rolls; grid retains its absolute reorder geometry but mounts a viewport with one screen of overscan on either side |
| Ignored async results still consumed native resources | AbortSignal consumers share requests; last-consumer cancellation cancels PhotoKit. Generation and identity checks reject stale results |
| Entire photo metadata participated in hook identity | Only reference identity and library revision restart image work; caption/order edits do not |
| One unavailable reference cleared every render | Only that asset's session cache entries are evicted |

ApplePhotosProvider already imports verified identifiers without copying originals and did not need changes. IDs, sortOrder, cloud mapping, recoveries, existing covers, Copy records and persisted storage formats are unchanged. A missing/limited/denied reference removes its preview; a transient upgrade error retains the independently verified preview and exposes Retry instead of silently leaving a low-quality image. Library changes and activation invalidate it immediately.

Thumbnail sizes use rendered points × screen scale, rounded to 128px buckets. Viewer thumbnails use a shared 512px tier. The JS URI cache retains up to 256 entries. Native renders live only under the existing temporary directory; a sweep every 32 writes removes JPEGs older than a day and trims existing files toward 128 MiB before writing. This is a periodic budget, not a strict instantaneous cap. Memory warnings cancel outstanding native requests and stop PhotoKit preheating. Only three viewer slots retain decoded images; distant slots unmount. Regenerable files can be removed by iOS and are checked before JS cache reuse.

Native changes require rebuilding the development client. Older bridges retain optional-method compatibility, but need the new bridge for native cancellation, bounded 4096px requests and deterministic cache paths.

## Measurement and verification

The pre-change Node suite passed 197/197 tests. The changed suite passes 202/202 tests, including shared cancellation, cache reuse and purge, invalidation, out-of-order completion, progressive upgrade failures and a 1,000-photo grid window. The deterministic 1,000-photo fixture mounts 30 cells initially and 51 after scrolling (320pt width, 600pt viewport); these are mocked component counts, not FPS or device memory measurements. TypeScript, ESLint and Swift syntax parsing pass. Hook/request tests use deterministic mocked bridge completions, not a device renderer.

No before/after iPhone timings, FPS, memory, iCloud latency or visual smoothness have been measured. **Physical-iPhone performance: UNVERIFIED.** No speedup percentage is claimed.

For instrumented runs, `photoRenderMetrics()` in PhotoReferenceService exposes session request, coalescing, cache-hit, cancellation and completion counters plus cumulative resolver milliseconds. Completion time includes PhotoKit/file work and excludes React Native decode/display; it counts each consumer. `RenderCacheHit` events and `PhotoRender` intervals appear under `app.filmer.photos` in Instruments Points of Interest. They contain no asset identifiers. Use image onLoad/native render tracing to measure actual first visible pixels rather than equating URI completion with visibility.

## Exact task files

- `app/index.tsx`
- `app/rolls/[id].tsx`
- `modules/filmer-photos/ios/FilmerPhotosModule.swift`
- `src/features/photos/components/PhotoViewerModal.tsx`
- `src/features/photos/components/ReorderablePhotoGrid.tsx`
- `src/features/photos/hooks/useResolvedPhoto.ts`
- `src/features/photos/services/PhotoReferenceService.ts`
- `src/features/photos/services/__tests__/photoRendering.test.cjs`
- `src/features/photos/utils/__tests__/photoSelection.test.cjs`
- `src/features/rolls/components/RollThumbnailStrip.tsx`
- This report

Pre-existing Settings, CloudKit, translation, package and photoImport test edits belong to other workspace work and were retained.

## Manual iPhone plan

1. Record device/iOS/build/quality/network and use the same 36-frame Roll before and after. In Instruments record Time Profiler, Animation Hitches, Allocations and Points of Interest. Measure cold and warm launch separately; log time from Roll tap to first thumbnail and viewer tap to first preview/screen image.
2. Open the Roll, swipe all 36 frames rapidly forward/backward, reverse mid-swipe, revisit images and open/close the viewer repeatedly. Check for wrong frames, blank upgrade frames, persistent low quality, stalled gestures and increasing memory. Compare request/cache counters and p50/p95 timings across at least five runs.
3. Scroll a long Roll list and a large grid repeatedly. Confirm thumbnail appearance, bounded mounted work, frame order, accessible moves, reorder/save, selection drag and taps. Record hitches and peak/settled memory; confirm no increasing memory trend after ten passes.
4. Repeat with iCloud-only assets, slow network, airplane mode and reconnect. A preview may remain during a transient upgrade failure; Retry must recover. Check loading, denied/limited access and missing-original states separately.
5. Delete/edit an original in Photos, change limited selection, return to FILMER and retry/relink. Old previews must disappear after invalidation and must never claim the missing original is available. Verify cloud-identifier recovery and existing legacy Copy/cover files.
6. Switch Optimized/High Resolution and zoom. Grids must remain thumbnail-sized; only the active High Resolution image requests the larger tier. Rotate the device and verify paging/layout. Trigger a memory warning where available and confirm cancellation, no crash, and recovery after navigation/retry.
7. Compare the saved Roll/Film/Camera records and photo IDs/order before and after; no migration or reset is expected.

## Build results

- `npm test`: 202 passed, 0 failed. Final focused resolver/hook checks: 15 passed; the additional exact grid-count assertions also pass.
- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings/errors.
- `git diff --check`: passed.
- `xcrun swiftc -frontend -parse modules/filmer-photos/ios/FilmerPhotosModule.swift`: passed.
- Full Debug simulator build, arm64 and x86_64: **BUILD SUCCEEDED**. Final incremental build after observer-capture cleanup: **BUILD SUCCEEDED**, no warning from FilmerPhotosModule.swift.
- Build command: `xcodebuild -workspace ios/FILMER.xcworkspace -scheme FILMER -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/filmer-photo-build CODE_SIGNING_ALLOWED=NO build`.
- Build/test logs are in `/private/tmp/filmer-photo-native-final.log`, `/private/tmp/filmer-photo-final-tests.log`, `/private/tmp/filmer-photo-targeted-tests.log`, `/private/tmp/filmer-photo-hook-tests.log`, `/private/tmp/filmer-photo-typecheck.log` and `/private/tmp/filmer-photo-lint.log` (temporary local artifacts).
- Simulator smoke: installed the rebuilt app without uninstalling/resetting data and launched on the booted iPhone 17 / iOS 26.5 with local Metro. The home Roll list and photo thumbnails rendered; screenshot: `/private/tmp/filmer-photo-smoke.png`. Metro bundled successfully and showed only the existing SafeAreaView deprecation warning. This does not verify viewer gestures, iCloud networking, a 36-photo browsing session or device performance.
