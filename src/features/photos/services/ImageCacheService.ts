import { clearPhotoRenders } from './PhotoReferenceService';
// Only derived PhotoKit renders and expired share files are disposable.
// Documents/photos and custom covers remain user data.
import { PhotoShareCacheService } from './PhotoShareCacheService';

export const ImageCacheService = {
  async clear(): Promise<{ status: 'empty' | 'cleared'; deletedFiles: number }> {
    const renders = await clearPhotoRenders();
    const deletedFiles = renders + PhotoShareCacheService.clearExpired();
    return { status: deletedFiles > 0 ? 'cleared' : 'empty', deletedFiles };
  },
};
