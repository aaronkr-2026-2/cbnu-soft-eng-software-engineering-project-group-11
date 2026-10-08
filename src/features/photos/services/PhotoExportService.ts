import { Asset } from 'expo-media-library';
import type { PhotoReference } from '../types';
import { resolvePhotoUri } from '../utils/resolvePhotoUri';
import { ensurePhotoWritePermission } from './PhotoLibraryPermissionService';

export const PhotoExportService = {
  async savePhotos(photos: PhotoReference[]) {
    if (photos.length === 0) return { savedCount: 0, failedCount: 0 };
    await ensurePhotoWritePermission();
    let savedCount = 0;
    let failedCount = 0;
    for (const photo of [...photos].sort((a, b) => a.sortOrder - b.sortOrder)) {
      try {
        const uri = resolvePhotoUri(photo);
        if (!uri) throw new Error('Photo source is unavailable');
        await Asset.create(uri);
        savedCount++;
      } catch { failedCount++; }
    }
    return { savedCount, failedCount };
  },
};
