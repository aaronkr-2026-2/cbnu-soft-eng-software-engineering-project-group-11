# Reflx Lab and Yes!Star reference-grounded correction

13 covers (11 Reflx Lab + 2 Yes!Star) regenerated with built-in imagegen using the downloaded
product photos/scans in references/, then normalized to 492 × 400 at their existing app paths.
Prompts, source URLs, color/layout notes, full-size outputs and checksums are in manifest.json.
index.html compares previous artwork, the product reference and the new artwork.

Official Reflx Lab references cover 200T/500T 120, Pro100, Pan200, 640T AHU, Double X and Diablo.
Panda Camera supplies Yes!Star 200/400 references. Legacy 400D/800T use physical packaging scans
from fp-archive.com; 100D uses Tahusa's product photo and 100R uses 8storeytree's 35mm photo.
The current official 100D URL now describes 50D AHU; that different product was not substituted.
The current official 110 100R was not substituted for the existing 35mm catalog entry either.

Final 100R uses v2 (36 EXP corrected). Final 100D uses v3 (incorrect generated exposure line
removed). Earlier variants remain here but are not applied. All final outputs were inspected
visually for identity, dominant colors and flat composition. Reconstructed typography, subtle
colors and artwork proportions remain approximate; this is not an official packaging scan.

active-overrides.json at the parent folder selects these sources over original batch outputs.
Reapply only active corrections with:

    node scripts/film-cover-review/apply-generated.mjs --only-active-overrides

Reapplying the entire catalog also respects active corrections. Film IDs, ISO/process metadata,
asset keys and paths, original batches, and user roll/custom-film data are unchanged.
