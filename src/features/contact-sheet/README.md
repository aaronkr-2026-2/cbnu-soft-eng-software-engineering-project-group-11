# Contact Sheet export

Roll Detail's ellipsis menu preserves Edit and opens a read-only Contact Sheet Preview.
Delete Roll requires destructive confirmation; it persists removal before deleting exclusively
owned copies, preserving original Apple Photos assets and copied paths used by other Rolls.

`contactSheetLayout` derives a 2400px-wide layout from format and photo count. 35mm uses six
frames per strip, generated light borders and dark rectangular perforations. Other formats
currently use a plain archival grid; their geometry can be replaced independently later.
Photos are sorted by persisted `sortOrder`. Native `Image.getSize` supplies effective dimensions
(including EXIF axis swapping on iOS). The shared photo transform rotates portrait images 90°
clockwise, preserves landscape/square orientation, and center-crops with aspect-fill inside a
clipped opening. Preview and export use the same renderer; source files and metadata are untouched.
The final row contains only actual photos. Header metadata is saved month, camera, format and
film name; no fictional Roll number is added. Export colors are independent of app theme.

The screen-fit preview uses the same renderer at reduced dimensions. High-resolution image
views are mounted only for Save/Share, at `2400 / PixelRatio` logical width, and removed after
capture. Capture waits for root layout, every successful image load and two animation frames.
Unavailable photos or a 30-second load timeout produce a localized error instead of silently
exporting an incomplete sheet. Normal Roll Detail rendering performs no export work.

`react-native-view-shot` captures this dedicated off-screen canvas, not the phone viewport.
For installed view-shot 5.1, iOS capture dimensions use logical UIKit points and Android output
dimensions use physical bitmap pixels. `contactSheetCaptureSize` accounts for that distinction.
iOS uses layer rendering so off-screen canvas bounds remain capturable. Actual native output
resolution and off-screen image drawing still require device verification.

The export session deduplicates concurrent generation, reuses the PNG for Save/Share, permits
retry after generation errors and releases temporary files on close. Save checks/adds write-only
photo permission and uses SDK 57's `Asset.create`; Share uses `expo-sharing` without requesting
photo-library permission. A successful Save triggers the existing nonblocking Toast.

Dependencies were installed with `npx expo install`. Native permission configuration exists
in `app.json` and the current iOS/Android projects. Rebuild the native app after dependency changes;
an existing development client cannot load newly added native modules through Metro alone.

## Verification

```sh
node --test src/features/contact-sheet/utils/__tests__/contactSheet.test.cjs src/features/photos/services/__tests__/photoImport.test.cjs src/features/rolls/utils/__tests__/browseRolls.test.cjs
npx tsc --noEmit
```

Automated tests cover 1/6/12/24/36/72 photos, row sizing, partial rows, reordering, density-aware
capture options, fixed black design, clipped cover images, export reuse/cleanup/retry, permission refusal
and safe Roll deletion. Native capture/media/share IO is mocked, and component tests inspect
render props rather than rendered pixels or actual device performance.

On a physical iPhone/Android, verify all requested photo counts, reordered Reference/Copy photos,
portrait/landscape mixes, both app themes, and a PNG whose width is exactly 2400 pixels. Confirm
the full sheet appears without clipping, including the bottom strip, and a 36-photo export remains
responsive. Check Save success/permission refusal, Share reusing the same image, and unavailable
Reference images. Review Delete cancellation and confirmed deletion separately.

## Appearance customization (2026-10-28)

Open **Appearance** in the contact-sheet toolbar. Background choices are Black, White, Warm cream,
Dark gray, Kraft paper, Slate, Darkroom red and Custom, each shown with a color swatch. Custom accepts six hexadecimal digits with an optional leading `#`;
invalid input keeps the last valid preview color and disables Save/Share until corrected.
Frame choices are None, Classic white border, Black border, Warm print, Instant print, Film strip, Film strip dark,
Color negative, B&W negative and 120 film edge.
The original black background/light horizontal film-strip treatment remains the default.

Film strip dark uses segmented vertical rails, side perforations, spacing and orange frame numbers/
small marks. Decorations are generic: no film logos or copied packaging text. The explicit dark
style is decorative for every roll format, while the existing Film strip default continues to show
35mm perforations only for 35mm rolls. Frame numbers/photos remain in saved row-major order;
vertical rails do not reorder them. Partial rows never add photos or fictional numbered frames.

`contactSheetAppearance.ts` validates appearance and derives a contrast-aware header palette.
`contactSheetPreferences.ts` persists schema-1 preferences under the separate SQLite KV key
`filog.contactSheet.appearance.v1`. Reads recover invalid preferences without writing data;
updates persist before publication. Roll records, global appearance and sync projection are untouched.

Both preview and export pass the same appearance to `ContactSheetCanvas`; frame geometry comes
from `getContactSheetLayout(format, count, frameStyle)`. The capture canvas snapshots appearance
at generation time. Any appearance change disposes the old cached export session and releases
its temporary PNG before a new export. Controls lock during Save/Share, and existing availability,
permission, timeout and failed-generation safeguards remain. Background/frame colors do not
follow the app theme; the controls themselves support light/dark themes and en/vi/ko labels.

Verification: TypeScript and ESLint passed; **246 tests passed**, including all original
contact-sheet tests and six new appearance tests. Coverage includes backgrounds/hex validation,
all styles/counts, persistence/reload/failure isolation, scaled actual-canvas rendering parity across
35 appearance combinations, controls, and a preview/save integration that proves a style change
cannot reuse the old exported image. iOS Metro/Hermes production export passed to
`/private/tmp/filog-appearance-export`. No new native dependency or prebuild was needed.

A standalone [visual QA gallery](../../../docs/qa/contact-sheet-appearance/styles.html) projects
the actual canvas into browser DOM with synthetic SVG fixtures. It is visual layout evidence,
not a native export screenshot or a production UI dependency. Native iPhone capture, keyboard
interaction, Save/Share results and large-library memory behavior still require device checks.

Current limits: fixed six columns, fixed border thickness, fixed vertical orientation for Dark,
RGB sliders plus hex (no alpha/color wheel), and preferences apply globally to future sheets rather than
to individual rolls. Future enhancements could add border width, strip orientation/group sizing,
reusable appearance presets without changing roll metadata.


Frame changes preserve the original six-column photo aperture, row positions and exported sheet
dimensions for each format/count. Borders paint outside the photo opening; they never reduce or
recrop it. Instant print adds a deeper white bottom edge; Warm print uses a cream paper edge.
Dark strips use slim generic perforated side rails within the same fixed gutters.

Custom backgrounds offer red, green and blue sliders, a live draft swatch, and optional hex entry.
Dragging changes the swatch locally; lifting the finger applies the color to the sheet and persists
once. Screen-reader increment/decrement actions are supported. No native dependency was added.

Preview framing follows the selected sheet background, including any unused area needed to
preserve the full sheet aspect ratio; there is no gray rounded backing panel. Frame URI refreshes
retain their measured dimensions instead of unmounting the Image during remeasurement. Temporary
refresh errors preserve ready previews; actual library invalidation or access loss still clears them.

The Appearance panel reserves a fixed 240-point height (capped at 35% on compact screens).
Switching a preset to Custom only adds scrollable content inside that panel, without resizing
the preview. Background and frame choices stay above the custom RGB/hex controls.

Film rebate styles (2026-10-28): Color negative prints an orange-mask strip with amber `12 ▸ 12A`
half-frame numbering; B&W negative is a near-black strip with light numbers; 120 film edge is an
unperforated dark strip with `◂ 12 ▸` arrows. Only 35mm rolls show sprocket holes. Instant print uses a
4-unit border that keeps a visible gap between prints plus a 30-unit chin below the photo. The light
Film strip draws an overlay edge so it stays visible on light paper. All of these keep the shared
sheet size and photo aperture, so preview and export still match.
