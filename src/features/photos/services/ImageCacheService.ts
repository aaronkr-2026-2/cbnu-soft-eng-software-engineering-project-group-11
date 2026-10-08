// Picker URIs are live catalog/roll references, not disposable FILMER cache files.
// Only expired, FILMER-owned share cache files are disposable here.
// Copy imports live in Documents/photos (user data), and must never be cleared here.
import { PhotoShareCacheService } from './PhotoShareCacheService';

export const ImageCacheService = {
  async clear(): Promise<{ status: 'empty' | 'cleared'; deletedFiles: number }> {
    const deletedFiles = PhotoShareCacheService.clearExpired();
    return { status: deletedFiles > 0 ? 'cleared' : 'empty', deletedFiles };
  },
};
