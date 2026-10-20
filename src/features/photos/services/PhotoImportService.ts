import { usableAssetId } from './PhotoReferenceService';
import { getRollById, useRollStore } from '../../rolls/store/rollStore';
import { applePhotosProvider } from '../providers/ApplePhotosProvider';
import type { PhotoPickResult } from '../types';
import { PhotoStorageService } from './PhotoStorageService';

type PhotoImportResult = Exclude<PhotoPickResult, { status: 'selected' }> |
  { status: 'selected'; addedCount: number; failedCount: number; duplicateCount?: number };

export const PhotoImportService = {
  async addToRoll(rollId: string): Promise<PhotoImportResult> {
    if (!getRollById(rollId)) throw new Error('Roll not found');
    const result = await applePhotosProvider.pickMultiplePhotos(rollId);
    if (result.status !== 'selected') return result;
    try {
      const roll = getRollById(rollId);
      if (!roll) throw new Error('Roll is no longer available');
      const existing = new Set(roll.photos.flatMap(photo => photo.provider === 'apple-photos' ? [usableAssetId(photo.localIdentifier) ? photo.localIdentifier : photo.assetId] : []));
      const photos = result.photos.filter(photo => photo.provider !== 'apple-photos' || !existing.has(photo.localIdentifier ?? photo.assetId));
      const duplicateCount = result.photos.length - photos.length;
      const addedCount = photos.length ? useRollStore.getState().addPhotosToRoll(rollId, photos) : 0;
      if (addedCount !== photos.length) throw new Error('Roll is no longer available');
      return { status: 'selected', addedCount, failedCount: result.failedCount ?? 0, ...(duplicateCount ? { duplicateCount } : {}) };
    } catch (error) {
      // Failed archive writes or a removed Roll must not leave this import's copies behind.
      PhotoStorageService.deleteOwnedCopies(rollId, result.photos);
      throw error;
    }
  },
};
