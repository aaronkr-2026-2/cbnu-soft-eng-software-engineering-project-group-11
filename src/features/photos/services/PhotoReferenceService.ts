import { useAppStore } from '../../../store/app-store';
import { translations } from '../../../i18n/translations';
import { File } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as MediaLibrary from 'expo-media-library';
import { AppState } from 'react-native';
import type { PhotoReference } from '../types';
import { PhotoStorageService } from './PhotoStorageService';

export type PhotoStatus = 'ready' | 'loading' | 'permission-denied' | 'limited' | 'unavailable' | 'temporary-error';
export type PhotoResolution = { status: PhotoStatus; uri?: string };
export type PickedReference = { assetId: string | null; takenAt?: string };
type NativePhotos = {
  pick(single: boolean, labels: Record<string, string>, dark: boolean): Promise<{ canceled: boolean; assets: PickedReference[] }>;
  verify(id: string): Promise<PhotoResolution>;
  resolve(id: string, full: boolean, pixels: number): Promise<PhotoResolution>;
  clearRenders(): Promise<number>;
};
const native = requireOptionalNativeModule<NativePhotos>('FilmerPhotos');
export async function pickPhotoReferences(single: boolean) {
  if (!native) throw new Error('FILMER PhotoKit module requires a new iOS build');
  const settings = useAppStore.getState();
  const text = translations[settings.language];
  return native.pick(single, {
    title: text.photoPickerTitle, add: text.photoPickerTitle, cancel: text.cancel, clear: text.deselectAll,
    hint: text.photoPickerDragHint, countOne: text.photoSelected, countMany: text.photosSelected,
    loading: text.openingPhotos, empty: text.noPhotos, denied: text.photosAccessRequired, limited: text.photoAccessLimited,
    access: text.managePhotosAccess, retry: text.photoRetry, photo: text.rollPhoto, imageError: text.photoTemporaryError,
  }, settings.appearance === 'dark');
}
export function usableAssetId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !/[:\x00-\x1f]/.test(value) && !value.startsWith('/');
}
// Session-only derived renders. A cache hit always verifies current library access first.
const cache = new Map<string, PhotoResolution>();
const inFlight = new Map<string, Promise<PhotoResolution>>();
const listeners = new Set<() => void>();
let epoch = 0;
let stop: (() => void) | undefined;
export function invalidatePhotoRenders() {
  epoch++; cache.clear(); listeners.forEach(listener => listener());
}
export function observePhotoLibrary(listener: () => void) {
  listeners.add(listener);
  if (!stop) {
    const app = AppState.addEventListener('change', state => { if (state === 'active') invalidatePhotoRenders(); });
    let library: ReturnType<typeof MediaLibrary.addListener> | undefined;
    try { library = MediaLibrary.addListener(invalidatePhotoRenders); } catch { /* Missing native module remains recoverable. */ }
    stop = () => { app.remove(); library?.remove(); stop = undefined; };
  }
  return () => { listeners.delete(listener); if (!listeners.size) stop?.(); };
}
export async function verifyPhotoAsset(id: unknown): Promise<PhotoResolution> {
  if (!usableAssetId(id)) return { status: 'unavailable' };
  try { return native ? await native.verify(id) : { status: 'temporary-error' }; }
  catch { return { status: 'temporary-error' }; }
}
export async function resolvePhoto(photo: PhotoReference, size: 'thumbnail' | 'full' = 'thumbnail', pixels = 512): Promise<PhotoResolution> {
  try { return await resolvePhotoSafely(photo, size, pixels); }
  catch { return { status: 'temporary-error' }; }
}
async function resolvePhotoSafely(photo: PhotoReference, size: 'thumbnail' | 'full', pixels: number): Promise<PhotoResolution> {
  if (photo.provider === 'filmer-copy') {
    const uri = PhotoStorageService.resolveUri(photo);
    return uri ? { status: 'ready', uri } : { status: 'unavailable' };
  }
  const id = usableAssetId(photo.localIdentifier) ? photo.localIdentifier : photo.assetId;
  const generation = epoch;
  const access = await verifyPhotoAsset(id);
  if (generation !== epoch) return { status: 'loading' };
  if (access.status !== 'ready') { cache.clear(); return access; }
  const key = `${id}:${size}:${pixels}`;
  const hit = cache.get(key);
  if (hit?.uri) {
    try { if (new File(hit.uri).exists) return hit; } catch { /* Regenerate a purged derived render. */ }
    cache.delete(key);
  }
  const requestKey = `${generation}:${key}`;
  let request = inFlight.get(requestKey);
  if (!request) {
    request = native!.resolve(id, size === 'full', pixels);
    inFlight.set(requestKey, request);
  }
  try {
    const result = await request;
    if (generation !== epoch) return { status: 'loading' };
    if (result.status === 'ready' && result.uri) {
      if (cache.size >= 256) cache.delete(cache.keys().next().value!);
      cache.set(key, result);
    }
    return result;
  } catch { return { status: 'temporary-error' }; }
  finally { if (inFlight.get(requestKey) === request) inFlight.delete(requestKey); }
}
export async function clearPhotoRenders() {
  try { return await native?.clearRenders() ?? 0; }
  finally { invalidatePhotoRenders(); }
}
