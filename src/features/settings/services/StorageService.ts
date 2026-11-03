import { Directory, File, Paths } from 'expo-file-system';
import { defaultDatabaseDirectory } from 'expo-sqlite';
import { clearPhotoRenders, photoCacheInfo } from '../../photos/services/PhotoReferenceService';

export type StorageCategory = 'database' | 'covers' | 'copies' | 'other';
export type StorageMeasurement = Record<StorageCategory, number> & { cache: number | null; total: number; measuredAt: number };

export class PhotoCacheClearError extends Error {
  constructor(public freedBytes: number | null) { super('Photo preview cleanup was incomplete'); }
}

export const StorageService = {
  async measure(): Promise<StorageMeasurement> {
    const result: StorageMeasurement = { database: 0, covers: 0, copies: 0, other: 0, cache: null, total: 0, measuredAt: Date.now() };
    const native = await photoCacheInfo().catch(() => undefined);
    if (native) result.cache = native.bytes;
    const database = new Directory(defaultDatabaseDirectory).uri.replace(/\/$/, '') + '/';
    const document = Paths.document.uri.replace(/\/$/, '') + '/';
    const seen = new Set<string>();
    let visited = 0;
    async function walk(directory: Directory) {
      const key = directory.uri.replace(/\/$/, '');
      if (seen.has(key)) return;
      seen.add(key);
      if (!directory.exists) return;
      for (const entry of directory.list()) {
        if (entry instanceof Directory) await walk(entry);
        else if (entry instanceof File && !seen.has(entry.uri)) {
          seen.add(entry.uri);
          if (native && entry.uri.startsWith(native.uri.replace(/\/$/, '') + '/') && entry.name.endsWith('.jpg')) continue;
          const relative = entry.uri.startsWith(document) ? entry.uri.slice(document.length) : '';
          const category: StorageCategory = entry.uri.startsWith(database) ? 'database'
            : /^(film-covers|camera-covers)\//.test(relative) ? 'covers'
            : relative.startsWith('photos/') ? 'copies' : 'other';
          const size = entry.size;
          if (!Number.isFinite(size) || size < 0) throw new Error('File size unavailable');
          result[category] += size;
          if (++visited % 50 === 0) await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }
    for (const root of [Paths.document, Paths.cache, new Directory(defaultDatabaseDirectory)]) await walk(root);
    result.total = result.database + result.covers + result.copies + result.other + (result.cache ?? 0);
    return result;
  },
  async clearPhotoCache() {
    // Only the module-owned temporary renders are cleared. No Documents or share sessions.
    const before = await photoCacheInfo();
    let failed = false;
    try { await clearPhotoRenders(); } catch { failed = true; }
    let after: Awaited<ReturnType<typeof photoCacheInfo>>;
    try { after = await photoCacheInfo(); }
    catch { throw new PhotoCacheClearError(null); }
    const freed = Math.max(0, before.bytes - after.bytes);
    // Preview deletion cannot be rolled back. Report partial completion; user files are never touched.
    if (failed) throw new PhotoCacheClearError(freed);
    return freed;
  },
};
