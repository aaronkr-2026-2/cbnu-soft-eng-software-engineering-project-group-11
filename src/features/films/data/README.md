# FILMER built-in film catalog

`builtInCatalog.ts` contains FILMER definitions. `films.ts` supplies the existing Zustand store
and resolves historical ID aliases. No external API, external cover URL, or imported dataset is
used. Custom films remain separate in the existing store. Unknown archived stocks still use
Roll's saved filmName; no Roll data is rewritten. Matching former IDs resolve in Roll Detail,
Roll cards, Roll editing and Home search through legacyIds.

The current selection includes 26 Kodak and 20 Fujifilm stocks, plus the original Ilford HP5 Plus.
Formats include supported archival formats rather than interpreting the artwork's printed 35mm
labels as authoritative. Double-X 5222 is ISO 250 daylight/200 tungsten, not ISO 5222.

Intentionally excluded artwork:
- Kodak: Aerocolor IV 400/800, Vericolor III 400, Portra 80NC: not verified distinct stock definitions.
- Fuji: QuickSnap, Natura Classica and Silvi 100/200/400: camera/product labels rather than verified
  interchangeable stocks; FP-100C/Instax mini: unsupported instant formats; generic Cinema ECN-2
  250D/500T and Premium 200: insufficiently identified stock names.

46 covers (26 Kodak, 20 Fujifilm) are cropped inside printed card edges without sheet borders,
shadow margins or white padding. Thumbnail openings use a 1.23 landscape aspect ratio and
aspect-fill with rounded clipping. `filmAssets.ts` supplies static references to FilmImage in
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
