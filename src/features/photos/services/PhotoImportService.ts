import { getRollById, useRollStore } from '../../rolls/store/rollStore';
import { applePhotosProvider } from '../providers/ApplePhotosProvider';
import type { PhotoPickResult } from '../types';
import { PhotoStorageService } from './PhotoStorageService';

type PhotoImportResult = Exclude<PhotoPickResult, { status: 'selected' }> |
  { status: 'selected'; addedCount: number; failedCount: number };

export const PhotoImportService = {
  async addToRoll(rollId: string): Promise<PhotoImportResult> {
    if (!getRollById(rollId)) throw new Error('Roll not found');
    const result = await applePhotosProvider.pickMultiplePhotos(rollId);
    if (result.status !== 'selected') return result;
    try {
      const addedCount = useRollStore.getState().addPhotosToRoll(rollId, result.photos);
      if (addedCount !== result.photos.length) throw new Error('Roll is no longer available');
      return { status: 'selected', addedCount, failedCount: result.failedCount ?? 0 };
    } catch (error) {
      // Failed archive writes or a removed Roll must not leave this import's copies behind.
      PhotoStorageService.deleteOwnedCopies(rollId, result.photos);
      throw error;
    }
  },
};
