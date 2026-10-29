# FiLog built-in film catalog

`builtInCatalog.ts` contains FiLog definitions. `films.ts` supplies the existing Zustand store
and resolves historical ID aliases. No external API, external cover URL, or imported dataset is
used. Custom films remain separate in the existing store. Unknown archived stocks still use
Roll's saved filmName; no Roll data is rewritten. Matching former IDs resolve in Roll Detail,
Roll cards, Roll editing and Home search through legacyIds.

The catalog now contains 259 films across 22 brands. The original 47 entries (26 Kodak,
20 Fujifilm and Ilford HP5 Plus) retain their IDs. The 2026-10-15 import adds 212 entries
and 213 local covers, including the previously missing HP5 Plus cover. See
`assets/films/source/INVENTORY.md` for preserved source files, metadata references and exclusions.
Formats include supported archival formats rather than interpreting the artwork's printed 35mm
labels as authoritative. Double-X 5222 is ISO 250 daylight/200 tungsten, not ISO 5222.

Intentionally excluded artwork:
- Kodak: Aerocolor IV 400/800, Vericolor III 400, Portra 80NC: not verified distinct stock definitions.
- Fuji: QuickSnap, Natura Classica and Silvi 100/200/400: camera/product labels rather than verified
  interchangeable stocks; FP-100C/Instax mini: unsupported instant formats; generic Cinema ECN-2
  250D/500T and Premium 200: insufficiently identified stock names.

The original 46 covers (26 Kodak, 20 Fujifilm) are cropped inside printed card edges without sheet borders,
shadow margins or white padding. Thumbnail openings use a 1.23 landscape aspect ratio and
full-frame scaling (`stretch`) for bundled artwork, preserving the entire card with no empty margins.
User-selected URI covers retain their existing default crop. `filmAssets.ts` supplies static references to FilmImage in
selection, Film cards, Roll cards, Roll Detail and Roll information. The source sheets are not
bundled as runtime images. Regenerate with `node scripts/crop-kodak-covers.mjs` on macOS;
the script reads `assets/films/source/kodak.png` and `fuji.png`.

Metadata references (checked 2026-10-08):
- https://www.kodak.com/en/still-film/products/professional/
- https://www.kodak.com/en/motion/product/camera-films/eastman-double-x-black-white-5222-7222/resources/
- https://www.kodak.com/content/pdfs/KODAK-AEROCOLOR-III-Negative-Film-2460-datasheet-en.pdf
- https://www.fujifilm.com/jp/ja/consumer/support/films/negative-and-reversal
- https://www.fujifilm.com/ffis/ja/news/157
- https://www.fujifilm.com/us/en/business/professional-photography/film/pro-400h
- https://www.fujifilm.com/us/en/consumer/films/consumer-film/fujifilm-200

Status is archive metadata, not a guarantee of stock in a particular region. Historical film
names remain selectable. Kodak legacy Portra/T-Max names are retained as requested.

Validation:
`node --test src/features/films/utils/__tests__/catalog.test.cjs`
`npx tsc --noEmit`


## Roll-specific film editing

Film Selection's complete row selects a film, including the cover. No large detail screen is
mounted. In Roll Information, the compact cover/name/metadata area opens FilmForm in edit mode;
Change is a separate sibling button opening Film Selection. The same FilmForm backs Add Custom
Film. It supports brand, name, ISO, type, multiple formats, process, cover picking/removal and
localized discard confirmation.

Editing writes only filmOverride to the create/edit draft. The built-in catalog remains unchanged.
Selecting another film clears the override; selecting a custom film snapshots its editable data
so a created Roll does not rely on the session-only custom catalog after restarting. Saving an
existing Roll commits the override with metadata through the existing repository. Canceling the
edit discards it. resolveRollFilm centralizes effective metadata and effectiveFilmName supplies
Home and Contact Sheet names. Customized variants use separate Home film headings.

Picked covers are copied asynchronously to Documents/film-covers on FilmForm Save. Relative
imageDocumentPath rebases to the current app container. Built-in assets and picker originals
are never overwritten/deleted. Draft updates/reset/edit completion remove explicitly abandoned
owned covers only after checking all persisted Rolls, active drafts and custom films for shared
references. Failed Roll persistence protects the saved cover and leaves the draft retryable.

Tests cover compact row selection, shared-form save/cancel, immutable catalog metadata, override
restart persistence, relative cover rebasing, discarded/replaced cover cleanup and Home search.
Native picker behavior, back gestures, safe-area layout and light/dark appearance remain device checks.

## Additional artwork import (2026-10-15)

`additionalCatalog.ts` and `additionalFilmAssets.ts` are generated from
`scripts/film-cover-manifest.json` using `node scripts/import-film-covers.mjs`.
This uses the existing macOS `sips` crop workflow; no new dependencies. The manifest
preserves original sheet filenames, SHA-256 values and reviewed crop rectangles.
All 25 full source sheets have descriptive ASCII filenames under `assets/films/source/`;
mixed sheets live in `collections`, single-brand sheets in their brand directory.
213 individual covers use `<brand>/<stock>.png`. Source sheets are not runtime imports.

The artwork contains inaccurate color/process/format text. Catalog metadata takes
precedence; unverified names, unsupported instant/camera/APS products and duplicate
packaging are excluded rather than guessed. Full inventory and rationale:
`assets/films/source/INVENTORY.md`. Pocket stocks use the existing 110 format.
Historical entries are archive metadata, not a guarantee of current availability.
No persisted Rolls, overrides, custom entries, photo imports or app navigation are rewritten.

Verification: TypeScript, all 88 automated tests, static require/PNG/source checksums,
and iOS Metro export passed. No real-iPhone visual testing was performed.

## Cover framing correction

Bundled covers use `stretch` in the shared FilmImage component, so both wide
and portrait cards fill the existing frame in Selection, Film cards and Roll views.
The full source rectangle is scaled in both dimensions; no edge text is cropped
and there are no letterbox margins. Typography follows the frame proportions.
Existing frame dimensions and custom-photo crops remain unchanged. The 51 newly
imported Kodak covers were recropped from their original sheets using full card
bounds, restoring footer text lost by the previous fixed-height rectangles.
Regeneration uses the corrected manifest; original source image hashes are unchanged.

All 259 bundled PNG covers are normalized to 492 × 400 (1.23:1) using full-card resampling, without cropping or padding. Both crop generators apply this step automatically. To normalize existing generated covers only: `node scripts/normalize-film-covers.mjs`. Source sheets and custom user covers are untouched. This intentionally adjusts artwork proportions to fit the thumbnail opening.

Yes!Star follow-up: the preserved `source/yesstar/print-sheet.png` adds Yes!Star 200 and 400 with full-frame covers under `assets/films/yes-star/`. The Quickfun concept label is retained in the source only; no ISO is invented. Current totals: 261 films, 26 source sheets, 215 manifest covers.

## Generated catalog covers applied

All 261 runtime covers now use normalized 492 × 400 copies of the imagegen outputs in
`assets/films/generated-review/batch-01` through `batch-27`. Existing asset keys, paths, film
metadata and roll references stay intact. Original sheets and full-resolution generated PNGs
remain available. See `scripts/film-cover-review/applied-assets.json` for the source/runtime
checksums and `apply-generated.mjs` to reapply; the older sheet importer recreates the older art.
Packaging fidelity is still approximate; OCR review flags are available in the review gallery.
