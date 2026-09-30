// Picker URIs are live catalog/roll references, not disposable FILMER cache files.
// Only explicitly owned, regenerable cache files may be added to this service later.
export const ImageCacheService = {
  async clear(): Promise<{ status: 'empty'; deletedFiles: number }> {
    return { status: 'empty', deletedFiles: 0 };
  },
};
