# Manual film cover generation prompt

Added 2026-10-27 (Asia/Seoul).

## Use

1. In New Roll select/add a custom film, or edit its film details. Enter brand, film name and positive ISO; select at least one film format.
2. Under the cover image field, use **Copy image prompt**. If several formats are selected, choose the single packaging format for this image; this choice does not change the saved film formats.
3. Paste the English prompt into ChatGPT yourself. No sample image or upload is required. The prompt identifies the exact stock from the entered fields; when available, ChatGPT may independently look up official packaging, otherwise it uses existing knowledge. FiLog does not open or submit anything to ChatGPT automatically, and no API key or backend is used.
4. Download and visually review the output. Use the existing Choose Image field and fixed 1.23:1 crop, then save normally. Copying a prompt never saves or modifies a film/roll/cover.

UI instructions are available in English, Vietnamese and Korean. The generated prompt is consistently English and uses current, unsaved form values. Missing required fields disable copying. Prompt preview is expandable and selectable. Clipboard is write-only and user initiated; the native method runs on the main queue. If a previous installed native build lacks `copyText`, or the write fails, the prompt opens as selectable text with manual-copy instructions. No false copy-success notification is shown. Build the updated iOS app to enable one-tap copying; JS reload alone cannot add a missing native method.

## Image contract

Existing normalized catalog covers are 492×400 pixels (1.23:1). The prompt asks for a higher resolution equivalent, **1230×1000 PNG**, one flat rectangular front printed face, edge-to-edge artwork, no side faces, 3D box, shadows, external borders, props or collage. It prioritizes known packaging colors, typography/logo placement, product name/ISO and original language. No invented labels, frame count, regional edition or packaging year.

The text-only workflow never requests user-uploaded images. Unknown or contradictory stock identities must be disclosed rather than presented as an accurate replica. Uncertain secondary labels are omitted; `other` must not imply a guessed package format. If exact pixel output is unsupported, ChatGPT is asked to disclose that rather than claim exact dimensions. Prompt text alone cannot guarantee a model's resolution, color fidelity or typography. The existing crop enforces the display ratio when supported by the installed native build; the user must still verify the artwork. Original implementation did not generate a sample. Text-only follow-up results are recorded below.

## Implementation and verification

- `FilmCoverPrompt.tsx`: themed optional workflow placed after FilmForm's existing image picker, with local single-format selection and selectable fallback.
- `filmCoverPrompt.ts`: pure prompt builder; only explicit product fields, no notes, photos, roll locations or other archive data.
- `FilmPromptClipboard.ts` / `FiLogPhotos.copyText`: optional native clipboard writer, no clipboard read or network call. No new dependency.
- Five new focused tests check text-only/ratio/layout constraints, missing input, clipboard failures/old native builds, current unsaved fields/format selection and fallback UI. Existing FilmForm persistence/rollback tests still pass.
- TypeScript and ESLint passed. Full suite: 228 tests passed, 0 failed/skipped. iOS Metro/Hermes export passed to `/private/tmp/filog-prompt-export`.
- Native unsigned device Release build: **BUILD SUCCEEDED**, exit 0, including the write-only clipboard bridge and production JS bundle. Command: `xcodebuild -workspace ios/FiLog.xcworkspace -scheme FiLog -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath /private/tmp/filog-audit-release CODE_SIGNING_ALLOWED=NO build`. Existing dependency/script/Hermes warnings remain. No installation, upload, signing change or user data reset performed.

Logs: `/private/tmp/filog-prompt-tests.log`, `/private/tmp/filog-prompt-all-tests.log`, `/private/tmp/filog-prompt-export.log`, `/private/tmp/filog-prompt-release.log`.

## Device acceptance still required

On a fresh build, enter Kodak / Portra 400 / ISO400 / 35mm, tap Copy and paste into Notes or ChatGPT to inspect the exact text. Change name/ISO/format and repeat; ensure values update and notes/locations never appear. Verify missing fields disable copy, preview selection and dark/light layouts. Confirm Copy does not submit or close the form. Complete an actual manual generation by pasting only the prompt, inspect all labels/colors, import/crop/save it, and confirm persistence after restart. On an old native build, verify selectable fallback instead of a crash or fake success.


## Text-only follow-up — 2026-10-27

Removed the mandatory packaging/layout uploads and all instructions to request an image. The same existing form and clipboard flow now produce a self-contained prompt: stock identification, optional autonomous official-source lookup, known commercial design rather than a creative redesign, single coherent packaging edition, exact name/ISO, no invented fine print, fixed 1.23:1 flat front composition. Guidance and copy confirmation updated in en/vi/ko. The model must disclose unknown packaging instead of falsely certifying accuracy. No per-brand color guesses are hardcoded.

Prompt text can improve consistency; it cannot guarantee real-world colors, exact logos or typography, especially for obscure/custom stocks. The app crop provides the display frame, not packaging verification. No API/backend/network submission was added to FiLog.

### Actual text-only generation trial

A single preview was generated with the built-in image generation tool, using the exact output of `buildFilmCoverPrompt` for Kodak / Portra 400 / ISO400 / 35mm / color / C-41. No reference image paths or conversation images were supplied. The prompt is saved at [sample prompt](qa/film-cover-prompt/kodak-portra-400-prompt.txt); output at [sample PNG](qa/film-cover-prompt/kodak-portra-400-text-only.png). The sample is QA evidence only, not a verified replacement for any built-in catalog cover.

Visual inspection: one flat front-like cover, no 3D box, legible PORTRA 400 / Kodak / Professional / 35mm and COLOR NEGATIVE FILM text, purple/magenta field with yellow lower band. No claim that this is an authenticated packaging edition or exact color/logo match. Actual PNG dimensions from `sips`: **1391×1131** (ratio approximately 1.2299), not the requested 1230×1000. This demonstrates why image-tool resolution and packaging fidelity cannot be guaranteed by wording alone; the existing app crop remains the display-ratio control. This built-in trial is not a guarantee of identical results in a user's ChatGPT account/model, and no web lookup was supplied as part of the trial.

Follow-up checks: `npm run typecheck` and `npm run lint` passed; `npm test` passed **228 tests, 0 failed/skipped**, including revised text-only constraints and clipboard/UI tests. Log `/private/tmp/filog-text-prompt-tests.log`. `git diff --check` passed. No native code changed in this follow-up; the earlier successful unsigned Release build is historical evidence, not a freshly rerun build for the new wording.
