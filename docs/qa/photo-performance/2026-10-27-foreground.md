# Foreground image refresh without blanking previews

Date: 2026-10-27 (Asia/Seoul).

## Source cause and change

Previously every AppState active event called the same global invalidation as a real Photos-library change. `useResolvedPhoto` included that revision in the displayed image identity, so returning from the Home screen immediately removed all visible URIs while native verification/rendering was pending.

PhotoReferenceService now distinguishes `refresh` (foreground revalidation) from `invalidate` (actual library changes, permission events, manual retry/cache clear). Both cancel superseded requests, reset derived JS request caches/recovery lookups and recheck native access. Foreground refresh keeps the displayed identity stable while requests run, so the existing Image stays mounted with its URI. Native resolve still runs to detect modification-date render paths, inaccessible originals and purged files. An empty incremental PhotoKit event is ignored only when all three change arrays are explicitly empty; unknown/permission/edit/deletion payloads still invalidate.

Single-photo hooks retain the prior verified preview during foreground loading/transient failures, publish ready replacements and remove the URI on unavailable/limited/permission-denied results. Hard invalidations still hide stale pixels immediately. High-quality viewer refresh does not downgrade the visible image through thumbnail/screen tiers; initial loads retain progressive quality upgrades. Contact-sheet batch refresh also keeps its existing items while revalidation is pending. Abort/active-generation guards reject outdated completions.

No original photos, local archives, cloud data, native APIs or dependencies changed. This addresses returning from the Home screen; actual library changes can still legitimately require visible refresh. Native Image memory eviction/display behavior is not measured by these tests.

## Verification

- `npm test`: **237 passed, 0 failed/skipped**. Five added regressions cover foreground URI/key continuity and temporary errors, access revocation, hard invalidation during an in-flight refresh, high-resolution tier retention, contact-sheet continuity, plus actual service refresh reasons/no-op event handling/current-access checks (the first hook test combines continuity and errors).
- Existing deletion/access/recovery/cache-cancellation and UI race tests remain passing.
- TypeScript and ESLint passed.
- Production iOS export passed: `/private/tmp/filog-foreground-export`.
- `git diff --check` passed.

Logs: `/private/tmp/filog-foreground-final-tests.log`, `/private/tmp/filog-foreground-export.log`.

Physical-device check still required: open a populated Home/roll/viewer, leave to the iPhone Home screen and return repeatedly, including slow/offline iCloud Photos and both image-quality options. Unchanged previews should remain visible. On isolated fixture images, change Photos access or edit an original while outside FiLog and confirm revalidation/missing-image UI. Do not uninstall/reset the app or delete real originals to test. No physical-device frame recording or FPS measurement was performed in this task.
