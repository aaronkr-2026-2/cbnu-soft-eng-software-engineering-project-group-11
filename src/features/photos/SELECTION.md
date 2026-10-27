# Multi-photo selection

Roll Detail's More menu enters a local selection mode through `usePhotoSelection`. No selection
fields are persisted. The header replaces normal editing controls with Select/Deselect All and
Close. Screen removal (including native back gestures) exits selection first through the installed
Expo Router navigation hook. Photo Viewer, reorder and Add Photos are unavailable while selecting.

The existing grid remains the only photo grid. Selection overlays and checkbox accessibility
states sit on the existing thumbnails. Tiles memoize URI resolution and unchanged tiles are
memoized; Roll photo sorting is also memoized outside touch callbacks.

## Gesture ownership

- Browse: Tap opens Viewer; the existing 250ms LongPress lifts for reorder. Its manual Pan
  still explicitly fails on pre-hold motion beyond the existing tolerance.
- Select: Reorder's LongPress and Pan are disabled and excluded from the active composition.
  A grid-level manual Pan has **no activation timer**. A predominantly vertical movement
  beyond six points fails it immediately; touching gaps/outside photo slots fails on touch-down.
  A quick tap fails the Pan on touch-up so the thumbnail Tap can toggle selection.
- A deliberate horizontal start beyond six points activates drag selection. After activation,
  the finger may move across rows. Only then is parent scrolling paused, until finalization.
  Selection adds crossed index ranges, including skipped intermediate slots, without toggling
  already-selected IDs. Crossing the same slot repeatedly schedules no extra JS updates.
  No filesystem operations run during selection. There is no automatic edge scrolling yet;
  release to scroll vertically and resume another selection drag, or use Select All.
- Each selected-mode thumbnail Tap requires this selection Pan to fail. There are no parent
  ScrollView wait-for/failure relationships, and no waiting LongPress in selection mode.

`PhotoSelectionControls` floats outside the ScrollView. Top left is a Select/Deselect All pill;
top right is one Download/Close capsule. Bottom Share, the informational count pill, and destructive
Trash are three separate controls with transparent space between them. There is no full-width
toolbar or bottom Save action. The surrounding overlay uses `box-none` and the count/status views
ignore touches, leaving scrolling available between controls. The ScrollView has 160 points plus
the bottom inset of extra padding so the final photo row can move above the controls. iOS inherits
Screen's safe-area padding; Android adds its insets explicitly. Batch actions lock selection
interactions while an operation is in progress. Selected photos have only a six-percent dark overlay.

## Batch actions and ownership

`PhotoShareService` shares local source files as a multi-URL native share sheet using
`react-native-share`. File order follows persisted `sortOrder`; no Set insertion order, thumbnail
resize or base64 conversion is used. Only selected photos are passed. Cancellation preserves selection.
Generic sharing uses native autolinking and needs no social-app query/plugin configuration.
Expo Go does not include RNShare. Single-photo Viewer sharing uses React Native's built-in Share,
so it can work in Expo Go even while batch sharing fails with `RNShare could not be found`.
`npm start` targets the native app explicitly. Build/install FiLog with `npm run ios` (or
`npm run android`) before testing batch sharing; a Metro reload cannot add native modules to Expo Go.
Reference sources are read through the shared URI resolver, with `Asset.getUri` recovery through
existing library access if a picker URI expired or is provider-only. Original bytes are copied to
`Paths.cache/share/batch-...`, preserving image extensions. Copy sources reuse their owned local
files directly. A single bad source no longer aborts the whole operation: valid attachments enter
one native sheet, with a localized preparation-failure count. Zero valid files show the existing error.
Share-only cache folders are retained at least 24 hours; Clear Image Cache removes expired folders,
excluding active sessions. It never deletes persistent copies, picker references or original library
assets. Development `[PhotoShare]` logs contain counts, provider/scheme/existence and failure reasons,
not binary data. The existing Viewer single-photo Share implementation is unchanged.

`PhotoExportService` uses the shared resolver and `expo-media-library`'s `Asset.create` directly.
Write-only permission is checked/requested only for Save. This permission helper is also reused
by Contact Sheet export. Each failed asset is counted separately, and success toast counts include
only successful writes. Save and Share preserve the selection for another action.

Removal confirmation explains that Apple Photos originals are preserved and exclusively owned
FiLog copies may be deleted. `removePhotos` commits the updated Roll first, compacts surviving
`sortOrder` values, then delegates owned-file cleanup to `PhotoStorageService`. Copied paths used
by another Roll or surviving photo are retained. No Apple Photos delete API is called. A failed
archive write leaves records, selection and owned files intact. Successful removal exits selection.

Reference IDs remain unique when the same original is reimported after removal; existing surviving
IDs do not change. Copy IDs remain bound to their owned filenames for safe cleanup.

## Checks

```sh
node --test src/features/photos/utils/__tests__/photoSelection.test.cjs src/features/photos/services/__tests__/photoImport.test.cjs src/features/contact-sheet/utils/__tests__/contactSheet.test.cjs src/features/rolls/utils/__tests__/browseRolls.test.cjs
npx tsc --noEmit
```

The tests exercise real utilities/hooks/gesture callbacks/services/store logic using simulated
React hooks and mocked native IO. They cover tap, additive drag ranges, 20 repeated early swipes,
Select All, deselect/exit, disabled reorder/Viewer, URI memoization, multi-file Share, partial Save,
mixed removal, shared-file preservation, failed persistence and reimport IDs. They cannot verify
native gesture arbitration, safe-area pixels, UI frame rate or share-sheet rendering.

Rebuild the native app to include `react-native-share`. On-device checks still needed: all 19
scenarios in the request, especially repeated swipes starting on thumbnails/gaps in both modes,
horizontal selection followed by row crossings, native back, 36+ photos, multi-file share targets,
Photos permission refusal/partial Save, and both Reference and Copy removal confirmations.
