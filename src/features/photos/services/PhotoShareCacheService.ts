import { Directory, File, Paths } from 'expo-file-system';

const active = new Set<string>();
const retention = 24 * 60 * 60 * 1000;
let sequence = 0;

export const PhotoShareCacheService = {
  createSession() {
    const root = new Directory(Paths.cache, 'share');
    root.create({ intermediates: true, idempotent: true });
    const directory = new Directory(root, `batch-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`);
    directory.create();
    active.add(directory.uri);
    return directory;
  },
  finishSession(directory: Directory) {
    // Receivers can still read file URLs after the share promise resolves. Keep files for a day.
    active.delete(directory.uri);
  },
  clearExpired(now = Date.now()): number {
    const root = new Directory(Paths.cache, 'share');
    if (!root.exists) return 0;
    let deletedFiles = 0;
    for (const entry of root.list()) {
      const match = /^batch-(\d+)-\d+-[a-z0-9]+$/.exec(entry.name);
      if (!(entry instanceof Directory) || !match || active.has(entry.uri) || now - Number(match[1]) < retention) continue;
      try {
        const count = entry.list().filter(file => file instanceof File).length;
        entry.delete(); deletedFiles += count;
      } catch { /* A cache cleanup failure must not affect user photos. */ }
    }
    return deletedFiles;
  },
};
