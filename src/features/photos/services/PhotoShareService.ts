import { File, type Directory } from 'expo-file-system';
import { Asset } from 'expo-media-library';
import type { PhotoReference } from '../types';
import { resolvePhotoUri } from '../utils/resolvePhotoUri';
import { PhotoShareCacheService } from './PhotoShareCacheService';

export type PhotoShareResult = { preparedCount: number; failedCount: number; cancelled: boolean };

function log(event: string, detail: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[PhotoShare] ${event}`, detail);
}

async function resolveShareSource(photo: PhotoReference, index: number): Promise<File> {
  const uri = resolvePhotoUri(photo);
  try {
    const source = uri ? new File(uri) : undefined;
    const exists = source?.exists ?? false;
    log('source', { index, provider: photo.provider, scheme: uri?.split(':')[0], exists });
    if (source && exists && source.size > 0) return source;
  } catch (error) {
    log('source-unreadable', { index, provider: photo.provider, exists: false,
      reason: error instanceof Error ? error.message : String(error) });
  }
  if (photo.provider === 'apple-photos') {
    // Recover an accessible original when a picker display URI has expired or is provider-only.
    // Asset.getUri reads through the existing Photos access; it never edits/deletes the asset.
    const recoveredUri = await new Asset(photo.localIdentifier ?? photo.assetId).getUri();
    const recovered = new File(recoveredUri);
    log('source-recovered', { index, provider: photo.provider, scheme: recoveredUri.split(':')[0], exists: recovered.exists });
    if (recovered.exists && recovered.size > 0) return recovered;
  }
  throw new Error('Photo file is missing or empty');
}

export const PhotoShareService = {
  async sharePhotos(photos: PhotoReference[]): Promise<PhotoShareResult> {
    log('start', { selectedCount: photos.length });
    if (photos.length === 0) return { preparedCount: 0, failedCount: 0, cancelled: false };
    const urls: string[] = [];
    let failedCount = 0;
    let session: Directory | undefined;
    try {
      for (const [index, photo] of [...photos].sort((a, b) => a.sortOrder - b.sortOrder).entries()) {
        let destination: File | undefined;
        try {
          const source = await resolveShareSource(photo, index);
          if (photo.provider === 'filmer-copy' && source.uri.startsWith('file://')) {
            urls.push(source.uri);
          } else {
            session ??= PhotoShareCacheService.createSession();
            const extension = /\.(jpg|jpeg|png|heic|heif|webp|gif|bmp|tif|tiff|avif)$/i.exec(source.uri.split(/[?#]/)[0])?.[1].toLowerCase() ?? 'img';
            destination = new File(session, `photo-${index + 1}.${extension}`);
            await source.copy(destination, { overwrite: false });
            if (!destination.exists || destination.size !== source.size || destination.size <= 0) throw new Error('Share file copy is incomplete');
            if (!destination.uri.startsWith('file://')) throw new Error('Share attachment is not a local file');
            urls.push(destination.uri);
          }
          log('prepared', { index, provider: photo.provider, exists: true });
        } catch (error) {
          failedCount++;
          log('prepare-failed', { index, provider: photo.provider, reason: error instanceof Error ? error.message : String(error) });
          try { if (destination?.exists) destination.delete(); } catch { /* Later cache cleanup will retry. */ }
        }
      }
      log('ready', { selectedCount: photos.length, resolvedCount: urls.length, failedCount });
      if (urls.length === 0) throw new Error('No selected photo could be prepared for sharing');
      // Lazy loading keeps an unavailable native module from breaking Roll Detail itself.
      const { default: Share } = await import('react-native-share');
      const result = await Share.open({ urls, type: 'image/*', failOnCancel: false });
      return { preparedCount: urls.length, failedCount, cancelled: !result.success };
    } catch (error) {
      log('share-failed', { resolvedCount: urls.length, reason: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      if (session) PhotoShareCacheService.finishSession(session);
    }
  },
};
