import type { PhotoReference } from '../types';
import { PhotoStorageService } from '../services/PhotoStorageService';

export function resolvePhotoUri(photo: PhotoReference): string | undefined {
  return photo.provider === 'filmer-copy' ? PhotoStorageService.resolveUri(photo) : photo.thumbnailUri;
}
