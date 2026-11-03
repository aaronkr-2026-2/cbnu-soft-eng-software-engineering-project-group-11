import { File } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';
import type { CopiedPhotoReference } from '../types';
import { photoDateFromExif } from '../utils/photoDate';
import { PhotoStorageService } from './PhotoStorageService';

const supportedExtensions = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'avif']);
const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/webp': 'webp', 'image/gif': 'gif', 'image/bmp': 'bmp', 'image/tiff': 'tiff', 'image/avif': 'avif',
};

export function selectedImageExtension(asset: ImagePickerAsset): string {
  // The picker can export a different representation than the original filename.
  const uriExtension = /\.([a-z0-9]+)$/i.exec(asset.uri.split(/[?#]/)[0])?.[1].toLowerCase();
  if (uriExtension && supportedExtensions.has(uriExtension)) return uriExtension;
  const mimeExtension = mimeExtensions[asset.mimeType?.toLowerCase() ?? ''];
  if (mimeExtension) return mimeExtension;
  const originalExtension = /\.([a-z0-9]+)$/i.exec(asset.fileName ?? '')?.[1].toLowerCase();
  return originalExtension && supportedExtensions.has(originalExtension) ? originalExtension : 'img';
}

export const PhotoCopyService = {
  async copySelected(rollId: string, assets: ImagePickerAsset[]): Promise<{ photos: CopiedPhotoReference[]; failedCount: number }> {
    const photos: CopiedPhotoReference[] = [];
    let failedCount = 0;
    // Async native copies run sequentially: bounded IO without loading image bytes into JS.
    for (const asset of assets) {
      let pending: CopiedPhotoReference | undefined;
      try {
        const { id, file, documentPath } = PhotoStorageService.createDestination(rollId, selectedImageExtension(asset));
        pending = {
          id, provider: 'filmer-copy', storageMode: 'copy', localUri: file.uri, documentPath,
          sortOrder: photos.length, takenAt: photoDateFromExif(asset.exif),
        };
        const source = new File(asset.uri);
        const sourceSize = source.size;
        await source.copy(file, { overwrite: false });
        if (!file.exists || file.size <= 0) throw new Error('Photo copy is empty or missing');
        if (sourceSize > 0 && file.size !== sourceSize) throw new Error('Photo copy is incomplete');
        photos.push(pending);
      } catch {
        failedCount++;
        if (pending) PhotoStorageService.deleteOwnedCopies(rollId, [pending]);
      }
    }
    return { photos, failedCount };
  },
};
