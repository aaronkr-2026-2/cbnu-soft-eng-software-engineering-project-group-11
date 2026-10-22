import type { ApplePhotoReference } from '../types';

export function usableAssetId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[:\x00-\x1f]/.test(value) && !value.startsWith('/');
}
/** PHCloudIdentifier strings contain ':' so they get their own, looser check. */
export function usableCloudIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 4096 && !/[\x00-\x1f]/.test(value);
}
/** The identifier resolution uses: a verified localIdentifier, else the legacy assetId. */
export function referenceIdentifier(photo: ApplePhotoReference) {
  return usableAssetId(photo.localIdentifier) ? photo.localIdentifier : photo.assetId;
}
