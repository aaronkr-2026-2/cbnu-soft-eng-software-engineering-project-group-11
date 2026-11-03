# Imported film artwork — 2026-10-15

25 original sheets were renamed and organized without changing their bytes. SHA-256, original filenames and reviewed crop rectangles are recorded in [the manifest](../../../scripts/film-cover-manifest.json). Mixed-brand originals live in `collections`; runtime covers live in `assets/films/<brand>/<stock>.png`. Original sheets are never required by the app.

| Original file | Organized path (under source/) | Selected covers |
| --- | --- | --- |
| Ảnh ChatGPT 13_48_52 15 thg 10, 2026-1.png | `fujifilm/catalog-sheet.png` | 46 |
| Ảnh ChatGPT 13_48_53 15 thg 10, 2026-2.png | `kodak/catalog-sheet.png` | 51 |
| Ảnh ChatGPT 13_48_54 15 thg 10, 2026-3.png | `collections/lucky-filmneverdie-foma-nolan-yashica.png` | 11 |
| Ảnh ChatGPT 13_48_56 15 thg 10, 2026-4.png | `collections/svema-lfani-617-ferrania.png` | 2 |
| Ảnh ChatGPT 13_48_57 15 thg 10, 2026-5.png | `collections/agfa-three-film-rolls-tianjiao-harman.png` | 21 |
| Ảnh ChatGPT 13_48_58 15 thg 10, 2026-6.png | `collections/takumi-marix-cinemot-cinestill.png` | 7 |
| Ảnh ChatGPT 13_48_59 15 thg 10, 2026-1.png | `collections/small-brands-a.png` | 3 |
| Ảnh ChatGPT 13_48_59 15 thg 10, 2026-7.png | `collections/reflx-alien-rollei.png` | 0 |
| Ảnh ChatGPT 13_49_01 15 thg 10, 2026-2.png | `collections/small-brands-b.png` | 0 |
| Ảnh ChatGPT 13_49_02 15 thg 10, 2026-3.png | `collections/small-brands-c.png` | 0 |
| Ảnh ChatGPT 13_49_02 15 thg 10, 2026-8.png | `collections/yue-orwo-adox.png` | 0 |
| Ảnh ChatGPT 13_49_03 15 thg 10, 2026-1.png | `lucky/catalog-sheet.png` | 0 |
| Ảnh ChatGPT 13_49_03 15 thg 10, 2026-4.png | `collections/small-brands-d.png` | 0 |
| Ảnh ChatGPT 13_49_04 15 thg 10, 2026-2.png | `svema/catalog-sheet.png` | 0 |
| Ảnh ChatGPT 13_49_04 15 thg 10, 2026-5.png | `collections/small-brands-e.png` | 3 |
| Ảnh ChatGPT 13_49_04 15 thg 10, 2026-9.png | `collections/ilford-polaroid-efke.png` | 11 |
| Ảnh ChatGPT 13_49_05 15 thg 10, 2026-10.png | `collections/lomography-konica-shanghai.png` | 2 |
| Ảnh ChatGPT 13_49_05 15 thg 10, 2026-3.png | `takumi/catalog-sheet.png` | 0 |
| Ảnh ChatGPT 13_49_06 15 thg 10, 2026-4.png | `reflx-lab/catalog-sheet.png` | 11 |
| Ảnh ChatGPT 13_49_07 15 thg 10, 2026-5.png | `yue-crystal/catalog-sheet.png` | 0 |
| Ảnh ChatGPT 13_49_08 15 thg 10, 2026-6.png | `orwo/catalog-sheet.png` | 2 |
| Ảnh ChatGPT 13_49_09 15 thg 10, 2026-7.png | `polaroid/catalog-sheet.png` | 0 |
| Ảnh ChatGPT 13_49_10 15 thg 10, 2026-8.png | `lomography/catalog-sheet.png` | 14 |
| Ảnh ChatGPT 13_49_12 15 thg 10, 2026-9.png | `konica/catalog-sheet.png` | 16 |
| Ảnh ChatGPT 13_49_13 15 thg 10, 2026-10.png | `collections/alien-rollei-adox.png` | 13 |

213 selected covers include the existing HP5 Plus entry; 212 new records bring the catalog to 259 films across 22 brands. Existing Kodak/Fujifilm IDs and original 46 covers are preserved. Repeated artwork, renamed packaging and unsupported products do not become duplicate Film IDs. Some original sheets supply no selected covers because another sheet provides that stock or the labels need verification.

Not imported automatically: Polaroid/Instax/pack film, disposable cameras, APS and sheet-only products; ambiguous LFANI/Svema/GOST codes; unverified Takumi, Marix, Cinemot, Shancha, 617 Film Club, Yue Crystal, Alien, Optik Oldschool, Youqu, Focal Plane, Tianjiao, Three Film Rolls and other repack labels. Their original artwork remains here. Missing ISO/process/format information is not guessed. This is a curated import, not an assertion that every printed label is a real stock.

Artwork is decorative and contains mistakes: e.g. Rollei Retro, Ultrafine and Lucky SHD are monochrome; CMS 20 II is monochrome rather than C-41 color; Diablo 100 is C-41 redscale, not monochrome; UN54 is ISO 100, not ISO 54; Ferrania P30/P33 are 80/160; pocket films Orca/Tiger/Lobster use 110. Catalog fields take precedence over decorative text. Box/EI ratings are presented as nominal ISO/EI rather than claiming ISO certification (e.g. P3200/Delta 3200 and variable EI LomoChrome films).

REFLX 200T/500T entries describe the manufacturer's 120 ECN-2 products, not a guess that the printed 35mm label is C-41. 640T AHU uses nominal EI 640 for C-41 / EI 500 for ECN-2, as the manufacturer specifies. PRO 100 and PAN 200 list supported 120 format rather than copying the sheet's 35mm text. Manufacturer product URLs can be reused for new formulations: consult the actual supplied cartridge/box and lab instructions for historical film.

Primary metadata references consulted:

- [ILFORD film range / technical information](https://www.ilfordphoto.com/black-white-film) and [development data including ORTHO PLUS](https://www.ilfordphoto.com/amfile/file/download/file/1829/product/708/).
- [Kentmere Pan 200](https://www.ilfordphoto.com/kentmere-200-35mm).
- [Foma film catalog](https://www.foma.cz/produkty-cernobile-filmy-22).
- [ADOX CMS 20 / developer instructions](https://www.adox.de/Technical_Informations/CMS20_ADOTECHII_Anleitung.pdf) and [Scala 50](https://www.adox.de/scala50-en/).
- [Rollei manufacturer downloads](https://www.rolleianalog.com/downloads/?lang=en).
- [Fujifilm professional film data guide](https://asset.fujifilm.com/www/ca/files/2020-03/3ab271f46f8d71c7e4c91bcedb7de050/ProfessionalFilmDataGuide.pdf) and [support](https://www.fujifilm.com/jp/ja/consumer/support/films/negative-and-reversal).
- [Kodak still-film products](https://www.kodak.com/en/still-film/products/professional/) and existing catalog references in the catalog README. Historical EXR/Vision packaging is retained as archive metadata; not a stock-availability claim.
- [Harman Phoenix II technical sheet](https://www.harmanphoto.co.uk/amfile/file/download/file/1968/product/2208/).
- [CineStill BwXX exposure index](https://help.cinestillfilm.com/hc/en-us/articles/360025489552-What-is-CineStill-BwXX-and-what-EI-ISO-should-I-rate-it-at).
- [Lomography guides](https://cdn.downloads.lomography.com/downloads/) and [Lobster 110](https://shop.lomography.com/us/lobster-redscale-110-iso-200).
- [Konica's technical report, Centuria Super ISO range](https://research.konicaminolta.com/jp/pdf/technology_report/2003/pdf/new.pdf).
- [AgfaPhoto APX](https://agfaphoto.com/en/analog-photography-single-use-cameras/).
- [Reflx film range](https://reflxlab.com/collections/film), [Diablo](https://reflxlab.com/products/reflx-lab-diablo-100-red-scale-film), [640T AHU](https://reflxlab.com/products/1-roll-reflx-lab-320d-ahu-color-film-36exp), [120 ECN-2 variants](https://reflxlab.com/en-de/products/reflx-lab-500t-color-negative-film-120).
- [ORWO official shop](https://www.orwo.shop/), [Candido FAQ](https://www.candidocollective.com/frequently-asked-questions), [FilmNeverDie KIRO 400](https://filmneverdie.asia/products/filmneverdie-kiro-400-35mm-27-exp).
- [Ferrania P30 practices](https://assets.website-files.com/6230f174d9792f5706c61c7f/6394eb54a8223370f9a83543_P30_Best_Practices_v3.pdf), [Ferrania P33 distributor information](https://dealers.cinestill.film/collections/film-ferrania).
- [Arista EDU Ultra data](https://www.freestylephoto.com/pdf/product_pdfs/arista/AristaEDU_Ultra_200.pdf), [Ultrafine catalog](https://site.ultrafineonline.com/pwwint2014.pdf), [Leica Monopan specification](https://leica-camera.com/en-US/photography/accessories/m/film/monopan-50/technical-specification).

Regenerate reviewed new assets/catalog with `node scripts/import-film-covers.mjs` (macOS sips). Run the existing Kodak/Fuji generator separately if desired; it retains the new asset map. No image-generation service, extra runtime dependency or external image URL is required.

Cover framing correction: bundled FilmImage uses full-frame scaling (`stretch`).
The complete artwork fills the frame, with no text cropped and no empty margins.
The 51 new Kodak crop rectangles now include the complete printed card/footer.
Source sheets remain byte-identical.

All 259 bundled PNG covers are normalized to 492 × 400 (1.23:1) using full-card resampling, without cropping or padding. Both crop generators apply this step automatically. To normalize existing generated covers only: `node scripts/normalize-film-covers.mjs`. Source sheets and custom user covers are untouched. This intentionally adjusts artwork proportions to fit the thumbnail opening.

## Yes!Star sheet addition

`yesstar-print-sheet.png` is preserved byte-for-byte at `source/yesstar/print-sheet.png`, including its Quickfun concept label. Two runtime covers in `assets/films/yes-star/` add Yes!Star 200 and 400 (35mm color negative, C-41); Quickfun is excluded because the sheet explicitly labels it a concept and supplies no ISO. Aliases support Yesstar / Yes Star search. The catalog now has 261 films across 23 brands, with 215 manifest covers (214 additions) and 26 source sheets. Earlier counts above describe the original import.
Metadata cross-check: [Yes!Star 200 product listing](https://www.sunrise-camera.net/items/94172335), [Yes!Star 400 specifications](https://www.yodobashi.com/product/100000001009020024/). Both covers use the existing complete-card 492 × 400 output.
