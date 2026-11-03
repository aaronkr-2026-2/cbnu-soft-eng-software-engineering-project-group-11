import { Directory, File, Paths } from 'expo-file-system';
import type { CopiedPhotoReference, PhotoReference } from '../types';

const safeRollId = /^[A-Za-z0-9_-]+$/;
const ownedPath = /^photos\/([A-Za-z0-9_-]+)\/(photo-[a-z0-9-]+)\.([a-z0-9]+)$/;
let sequence = 0;

export const PhotoStorageService = {
  createDestination(rollId: string, extension: string) {
    if (!safeRollId.test(rollId) || !/^[a-z0-9]+$/.test(extension)) throw new Error('Invalid photo storage path');
    const directory = new Directory(Paths.document, 'photos', rollId);
    directory.create({ intermediates: true, idempotent: true });
    let id: string;
    let file: File;
    do {
      id = `photo-${Date.now().toString(36)}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`;
      file = new File(directory, `${id}.${extension}`);
    } while (file.exists);
    return { id, file, documentPath: `photos/${rollId}/${id}.${extension}` };
  },

  resolveUri(photo: CopiedPhotoReference): string | undefined {
    if (!ownedPath.test(photo.documentPath)) return undefined;
    return new File(Paths.document, ...photo.documentPath.split('/')).uri;
  },

  /** Only this Roll's generated Documents files may be deleted, never picker URIs. */
  deleteOwnedCopies(rollId: string, photos: PhotoReference[]): number {
    let deleted = 0;
    for (const photo of photos) {
      if (photo.provider !== 'filmer-copy') continue;
      const match = ownedPath.exec(photo.documentPath);
      if (!match || match[1] !== rollId || match[2] !== photo.id) continue;
      try {
        const file = new File(Paths.document, ...photo.documentPath.split('/'));
        if (file.exists) { file.delete(); deleted++; }
      } catch {
        // A failed cleanup may leave an orphan, but must not discard successful imports.
      }
    }
    return deleted;
  },
};
