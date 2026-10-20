import type { PhotoReference } from '../types';
import { PhotoStorageService } from '../services/PhotoStorageService';

/** Synchronous compatibility helper for owned Copy files only. References require async verification. */
export function resolvePhotoUri(photo: PhotoReference): string | undefined {
  return photo.provider === 'filmer-copy' ? PhotoStorageService.resolveUri(photo) : undefined;
}
