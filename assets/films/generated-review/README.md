# Generated film covers for review

Open [index.html](index.html) to browse all saved batches. Batch 01 contains the ten initial
samples; batches 02 onward cover the rest of the built-in catalog (261 catalog entries total).
Each PNG is copied here immediately after generation, with its exact app-generated prompt.
`remaining-queue.json` records the planned remaining entries, not a claim that they are generated.
Each batch manifest is updated only after a valid PNG exists locally.

Generation: built-in imagegen, one product per call. No CLI/API fallback or API key is used.
Images use the app's `buildFilmCoverPrompt` from `src/features/films/utils/filmCoverPrompt.ts`.
The requested dimensions are 1230 × 1000; actual native dimensions and ratios are recorded without
stretching/cropping. The original PNGs in this folder remain unreferenced by FILM_ASSETS. Normalized 492 × 400 copies now replace all 261 existing runtime covers at their original per-brand asset paths.

Packaging fidelity is unverified until reviewed. Old/discontinued/rebranded or specialty stocks
may not have a single authoritative retail package. Do not interpret an AI rendering as evidence
of real packaging, manufacturing details or official endorsement. Keep known catalog identity;
check lettering, ISO, colors, packaging edition and full-bleed rectangular composition before import.

To re-index saved files without calling any image API:

    node scripts/film-cover-review/update-review.cjs

The indexer reads PNG metadata and builds HTML; it does not modify image pixels.
Manufacturer source links used for initial research are retained in batch-01/README.md.

Completion: 251 remaining catalog covers were saved across batches 02–27, for 261 catalog covers
including batch 01. Each has a PNG, exact generation prompt, recorded dimensions and SHA-256.
`validation.json` records file-level checks: no missing covers/prompts, no duplicate PNG hashes,
and no output aspect ratio differing from 1.23 by more than 0.01. These checks do not certify
packaging or typography fidelity. Additional variants, if present, are kept separately and excluded
from catalog-cover counts. All 261 existing runtime PNGs were replaced using the established normalization pipeline; asset IDs and require paths stay the same.

Local Apple Vision OCR returned text for all 261 covers. Heuristic matching flagged 39 images,
often because of stylized lettering; these are not confirmed image errors. See review-flags.html
for targeted visual review, ocr-results.json for raw text, and ocr-review.json for token flags.
The visual spot checks included Sensia 200, Konica GX 100, Tiger 200 and Delta 400; the expected
product name and ISO remain visible in these examples despite OCR misses. No automated check
certifies exact manufacturer packaging fidelity.

Applied to app by explicit user request. Runtime assets total 68,304,827 bytes; dimensions 492 × 400.
See scripts/film-cover-review/applied-assets.json for source/runtime SHA-256 and file paths.
To reapply the full set: node scripts/film-cover-review/apply-generated.mjs. This replaces runtime
PNGs only; source sheets, generated originals and roll/custom-film records are preserved.

Reflx Lab/Yes!Star color correction: 13 active sources now come from color-correction-01,
using product-photo references. active-overrides.json takes precedence over the initial batch
images when applying assets or browsing galleries. The other 248 runtime covers are unchanged.
See color-correction-01/index.html for before/reference/after comparison and source links.
