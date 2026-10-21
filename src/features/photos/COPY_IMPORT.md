> Current routing: imports use PhotoKit references when the FILMER native module is present. When absent (Expo Go or an older build), `PhotoFallbackPickerService` opens the system image picker and saves durable copies using `PhotoCopyService`. The fallback uses default multi-selection with no app-imposed count limit, allowing range dragging rather than ordered numbered selection. Copies preserve the order returned by iOS, which need not be tap order. Roll Detail explains this storage behavior before selection. The saved import preference is ignored. Existing references are never converted. The remaining routing descriptions below are historical; see [REFERENCE_MODE.md](REFERENCE_MODE.md) for native references.

# Copy photo imports

Roll Detail calls `PhotoImportService.addToRoll`. The existing Apple Photos provider reads
the saved import preference and uses the same system picker and permission flow for both modes.
Reference records retain their identifiers, metadata and picker display URI.

Copy mode requests the current image representation without editing. The installed SDK 57
picker has a raw-file path for this configuration at quality 1. `PhotoCopyService` asynchronously
copies the selected local bytes into `Paths.document/photos/<rollId>/<unique-photoId>.<extension>`.
It verifies destination existence and size, skips failed items, and attempts to remove incomplete files.
The original picker file and Apple Photos asset are never modified by these services.

Copy records use `provider: 'filmer-copy'`, `storageMode: 'copy'`, `localUri`, and `documentPath`.
The shared `resolvePhotoUri` uses the relative document path to accommodate app-container URI changes.
Grid images, Home thumbnails, Viewer images and Viewer sharing all use that resolver.

The existing Roll store now commits its archive to the same SQLite KV facility already used
for global settings, under `filmer.rolls.v1`. Every Roll edit, photo metadata edit and reorder
is saved before state is published. Existing mock Rolls seed only an archive with no saved value.
There is no second Roll store or alternate photo database. Custom catalog persistence is unchanged;
existing Roll name fields remain available as catalog fallbacks.

The confirmation uses the successfully saved count. Failed individual copies are reported separately
in the existing localized inline message area. A failed archive write rolls back this batch's new copies.
`ImageCacheService.clear()` only removes expired share-temporary folders from cache and never accesses Documents.

`PhotoStorageService.deleteOwnedCopies` handles import rollback and cleanup after a confirmed Roll
deletion. It requires the Roll directory, generated filename and copied photo ID to match, and
ignores Apple Photos references. Roll deletion persists the archive removal first and preserves
copied paths still referenced by other Rolls. There is currently no individual photo removal UI.

## Automated checks

```sh
node --test src/features/photos/services/__tests__/photoImport.test.cjs src/features/rolls/utils/__tests__/browseRolls.test.cjs
npx tsc --noEmit
```

The import tests exercise the real provider, services, stores, repository and resolver with mocked
native picker/filesystem/SQLite IO. They cover reference compatibility, copied bytes, duplicate
filenames, 25-photo imports, partial failures, rollback, cache isolation, restart, URI rebasing,
reorder and metadata persistence. They do not prove native device behavior or gesture responsiveness.

## Physical iPhone checks still required

1. Import three photos in Reference, then three in Copy; confirm the correct success count and both display normally.
2. Restart FILMER and confirm copied images and the selected import mode persist.
3. Clear Image Cache; confirm copied images remain available.
4. Confirm a copied image remains visible after its original is removed from Apple Photos.
5. Import images with identical filenames and a batch of 20+; confirm no overwrite and responsive UI.
6. Verify a copy failure produces only successful records, the correct confirmation count and an inline failure message.
7. Reorder mixed Reference/Copy photos and restart; confirm the saved order.
8. Verify Viewer swipe, pinch/double-tap zoom, sharing, info sheet and metadata editing for copied files.
