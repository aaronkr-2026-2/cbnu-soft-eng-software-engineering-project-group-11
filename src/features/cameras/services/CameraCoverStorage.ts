import { Directory, File, Paths } from 'expo-file-system';
import type { Camera } from '../../../types/models';
const owned = (path?: string) => !!path && /^camera-covers\/cover-[a-z0-9-]+\.[a-z0-9]+$/.test(path);
let sequence = 0;
export function cameraImageUri(camera: Camera) {
  return owned(camera.imageDocumentPath) ? new File(Paths.document, camera.imageDocumentPath!).uri : camera.imageUri ?? camera.imageUrl;
}
export const CameraCoverStorage = {
  async copy(uri: string) {
    const directory = new Directory(Paths.document, 'camera-covers'); directory.create({ intermediates: true, idempotent: true });
    const extension = /\.(jpg|jpeg|png|heic|heif|webp)$/i.exec(uri.split(/[?#]/)[0])?.[1].toLowerCase() ?? 'jpg';
    let path: string, file: File;
    do { path = `camera-covers/cover-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 10)}.${extension}`; file = new File(Paths.document, path); } while (file.exists);
    const source = new File(uri);
    try {
      await source.copy(file, { overwrite: false });
      if (!file.exists || file.size <= 0 || (source.size > 0 && file.size !== source.size)) throw new Error('Incomplete Camera cover');
      return { imageDocumentPath: path, imageUri: file.uri };
    } catch (error) { try { if (file.exists) file.delete(); } catch { /* Retain an orphan rather than hide the save error. */ } throw error; }
  },
  rollback(path: string) {
    if (!owned(path)) return;
    try { const file = new File(Paths.document, path); if (file.exists) file.delete(); } catch { /* Never remove a source/shared file. */ }
  },
};
