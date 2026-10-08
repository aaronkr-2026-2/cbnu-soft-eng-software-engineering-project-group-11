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
