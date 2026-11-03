import { Directory, File, Paths } from 'expo-file-system';
import type { Film } from '../../../types/models';
const validPath = (path?: string) => !!path && /^film-covers\/cover-[a-z0-9-]+\.[a-z0-9]+$/.test(path);
export function filmImageUri(film?: Pick<Film, 'imageUri' | 'imageDocumentPath' | 'imageUrl'>): string | undefined {
  return validPath(film?.imageDocumentPath) ? new File(Paths.document, film!.imageDocumentPath!).uri : film?.imageUri ?? film?.imageUrl;
}
let sequence = 0;
export const FilmCoverStorage = {
 async copy(uri: string): Promise<{ imageUri: string; imageDocumentPath: string }> {
  const dir = new Directory(Paths.document, 'film-covers'); dir.create({ intermediates: true, idempotent: true });
  const extension = /\.(jpg|jpeg|png|heic|heif|webp)$/i.exec(uri.split(/[?#]/)[0])?.[1].toLowerCase() ?? 'jpg';
  let imageDocumentPath: string, file: File;
  do {
   imageDocumentPath = `film-covers/cover-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2)}.${extension}`;
   file = new File(Paths.document, imageDocumentPath);
  } while (file.exists);
  const source = new File(uri);
  try {
   await source.copy(file, { overwrite: false });
   if (!file.exists || file.size <= 0 || (source.size > 0 && file.size !== source.size)) throw new Error('Incomplete film cover');
   return { imageUri: file.uri, imageDocumentPath };
  } catch (error) { try { if (file.exists) file.delete(); } catch { /* Preserve the original error; never delete the source. */ } throw error; }
 },
 /** Only owned files explicitly superseded/discarded, never picker originals or bundled assets. */
 removeUnreferenced(paths: string[], retained: ReadonlySet<string>) {
  for (const path of paths) if (validPath(path) && !retained.has(path)) {
   try { const file = new File(Paths.document, path); if (file.exists) file.delete(); } catch { /* Safe retry on later cleanup. */ }
  }
 },
};
