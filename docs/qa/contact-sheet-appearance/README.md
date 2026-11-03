# Contact-sheet appearance QA — 2026-10-28

[styles.html](styles.html) is a standalone visual projection of the actual ContactSheetCanvas JSX
with synthetic, code-generated SVG images. Seven frame styles are shown; black border uses cream
to make its edges visible, and the other examples use black. It uses no user photographs or film
branding. The image fixtures and HTML are fully embedded; no server or third-party asset is needed.

The gallery was inspected in local Chrome. Native image load, EXIF orientation, view-shot output,
Photos saving and sharing still require physical-device verification. Automated actual-canvas
prop/geometry tests separately cover all 35 style/background combinations at preview and capture
scales, and an integration test verifies that changing appearance disposes the old cached PNG.

Commands run successfully:

- `npm run typecheck`
- `npm run lint`
- `npm test` — 246 passed, 0 failed/skipped
- `npx expo export --platform ios --output-dir /private/tmp/filog-appearance-export`
- `git diff --check`

Logs: `/private/tmp/filog-appearance-final-tests.log`, `/private/tmp/filog-appearance-export.log`.

Device acceptance: open a populated roll, test each background and frame style, enter valid/invalid
hex colors, close/reopen and restart to check persistence, export/save/share and compare to preview.
Switch style after a successful export and confirm the new image changes. Check en/vi/ko, both app
themes, custom hex keyboard, 1/7/36/72 mixed portrait/landscape photos, missing sources, permission
refusal and partial rows. Confirm photo IDs/order/notes and originals remain unchanged. Use only
synthetic fixtures for deliberate deletion tests; never reset real app/cloud data.


Follow-up coverage: dimensions and photo openings remain identical across all seven frame styles
and 35mm/120/110/other formats at 1/7/36/72 photos. RGB channel clamping and gesture behavior are
tested, including no preference commit during movement and one commit on release. Device checks
should include dragging each slider inside the settings scroll area and VoiceOver adjustment.
Latest test/lint logs: /private/tmp/filog-contact-update-tests.log and
/private/tmp/filog-contact-update-lint.log.
