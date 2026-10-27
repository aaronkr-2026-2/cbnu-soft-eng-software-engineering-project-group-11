# Camera cover prompts and display-name formatting

Added 2026-10-27 (Asia/Seoul).

## Camera image workflow

In Add Camera, enter brand/model/format. Under the image picker, tap **Copy image prompt** and paste into ChatGPT. No sample image or API key is required. The prompt requests a single centered front view of the exact camera, whole body/lens/controls visible at about 85% frame width, on a neutral background. Canvas target is 1230×1000 PNG, ratio 1.23:1, matching existing film/camera covers. It prohibits substituting another model, invented serial numbers/lens labels and floating captions. Unknown physical details cannot be certified by text-only generation; review the output before importing with the existing fixed-ratio crop.

Controls and guidance are localized in English, Vietnamese and Korean. Copy uses the existing user-initiated, write-only clipboard bridge and selectable-text fallback for older builds. No network call, generated image or automatic upload is added to FiLog. Copying never creates a camera or submits the form. No new native code/dependency was needed.

## Formatting at explicit save

New custom cameras and film entries normalize brand/model/name. FilmForm also normalizes per-roll film overrides. Creating or explicitly editing a roll normalizes stored film/camera display names, override brand/name, lab and location name. Examples:

| Input | Saved display text |
| --- | --- |
| `leica` / `m6` | `Leica` / `M6` |
| `nikon fm2` | `Nikon FM2` |
| `canon ae-1` | `Canon AE-1` |
| `kodak portra 400` | `Kodak Portra 400` |
| `ilford hp5 plus 400` | `Ilford HP5 Plus 400` |
| `cinestill` | `CineStill` |
| `hà nội` | `Hà Nội` |
| `35mm` | `35mm` |

Known product/brand spellings and available canonical catalog names take precedence. Lowercase words get initial capitals, recognized model codes keep uppercase letters, and existing deliberate mixed case/acronyms remain intact. Whitespace in display names is collapsed. The original typed draft is not mutated while typing; formatting takes effect on save and is also reflected in copied prompts.

Free-form notes, photo metadata, detailed addresses, IDs, dates, coordinates, image paths and unknown archive fields retain their existing semantics. No archive load, migration or incoming cloud projection applies the formatter. Existing records are not rewritten just by opening the app; a roll explicitly saved by the user may have its display labels normalized. Persistence-before-publication and copy rollback protections remain in place.

## Checks

Focused tests cover brand/model/acronym/Unicode/idempotence cases, prompt validation/framing and old clipboard fallback, and actual camera/film/roll save + restart persistence with untouched notes/addresses/IDs/creation time. Existing FilmForm mocks resolve the real pure formatter. A cloud merge test now expects `From B` for an explicitly saved lowercase lab name while preserving the free-text note `from A`.

Final verification results are appended below. No physical-iPhone copy/paste flow or actual camera image generation has been performed for this change. On device: create `leica` / `m6`, copy/paste prompt and verify normalized fields, import an image, save, select the camera for a roll, add lowercase lab/place names and a mixed-case note, save/reopen/restart and verify formatting and note preservation.

Final verification: `npm run typecheck` passed; `npm run lint` passed; `npm test` passed **232 tests, 0 failed/skipped**. Production iOS Metro/Hermes export passed to `/private/tmp/filog-camera-prompt-export`; `git diff --check` passed. Logs: `/private/tmp/filog-camera-final-tests.log` and `/private/tmp/filog-camera-export.log`. No new native build was required for the source-only camera panel/formatter; automatic copying uses the already-existing native clipboard method. Physical-device UX and generated camera accuracy remain manual checks.
