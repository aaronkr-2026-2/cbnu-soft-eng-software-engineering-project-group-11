import { useAppStore } from '../../../store/app-store';
import { translations } from '../../../i18n/translations';
import { File } from 'expo-file-system';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as MediaLibrary from 'expo-media-library';
import { AppState } from 'react-native';
import type { ApplePhotoReference, PhotoReference } from '../types';
import { useRollStore } from '../../rolls/store/rollStore';
import { referenceIdentifier, usableAssetId, usableCloudIdentifier } from '../utils/referenceIdentifier';
import { PhotoStorageService } from './PhotoStorageService';

export type PhotoStatus = 'ready' | 'loading' | 'permission-denied' | 'limited' | 'unavailable' | 'temporary-error';
export type PhotoResolution = { status: PhotoStatus; uri?: string };
export type PickedReference = { assetId: string | null; takenAt?: string; cloudId?: string };
type NativePhotos = {
  pick(single: boolean, labels: Record<string, string>, dark: boolean): Promise<{ canceled: boolean; assets: PickedReference[] }>;
  verify(id: string): Promise<PhotoResolution>;
  resolve(id: string, full: boolean, pixels: number): Promise<PhotoResolution>;
  preheat?(ids: string[], pixels: number, start: boolean): Promise<void>;
  cancelRender?(id: string, full: boolean, pixels: number): Promise<void>;
  cacheInfo?(): Promise<{ bytes: number; files: number; uri: string }>;
  clearRenders(): Promise<number>;
  /** Absent in builds before cloud-identifier recovery. */
  locate?(cloudIdentifier: string): Promise<{ status: PhotoStatus; assetId?: string }>;
};
const native = requireOptionalNativeModule<NativePhotos>('FiLogPhotos');
/** False in Expo Go and older builds, which lack the FiLog PhotoKit module. */
export const photoModuleAvailable = !!native;
export async function pickPhotoReferences(single: boolean) {
  if (!native) throw new Error('FiLog PhotoKit module requires a new iOS build');
  const settings = useAppStore.getState();
  const text = translations[settings.language];
  return native.pick(single, {
    title: text.photoPickerTitle, add: text.photoPickerTitle, cancel: text.cancel, clear: text.deselectAll,
    hint: text.photoPickerDragHint, countOne: text.photoSelected, countMany: text.photosSelected,
    loading: text.openingPhotos, empty: text.noPhotos, denied: text.photosAccessRequired, limited: text.photoAccessLimited,
    access: text.managePhotosAccess, retry: text.photoRetry, photo: text.rollPhoto, imageError: text.photoTemporaryError,
  }, settings.appearance === 'dark');
}
export { usableAssetId, usableCloudIdentifier } from '../utils/referenceIdentifier';
// Session-only derived renders. A cache hit always verifies current library access first.
const cache = new Map<string, PhotoResolution>();
const inFlight = new Map<string, Promise<PhotoResolution>>();
const metrics = { requests: 0, cacheHits: 0, coalesced: 0, cancelled: 0, completed: 0, totalResolveMs: 0 };
export function photoRenderMetrics() { return { ...metrics }; }
const cancelRequests = new Map<string, () => void>();
const consumers = new Map<string, number>();
const listeners = new Set<() => void>();
// One cloud-identifier lookup per stale reference until Retry, app activation or a library change.
const recoveries = new Map<string, Promise<string | undefined>>();
let epoch = 0;
let stop: (() => void) | undefined;
export function invalidatePhotoRenders() {
  epoch++;
  // Cancel the previous generation before notifying hooks. A late old consumer
  // must never cancel a new request for the same asset and pixel tier.
  cancelRequests.forEach(cancel => cancel());
  cancelRequests.clear(); inFlight.clear();
  cache.clear(); recoveries.clear(); listeners.forEach(listener => listener());
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
export async function resolvePhoto(photo: PhotoReference, size: 'thumbnail' | 'full' = 'thumbnail', pixels = 512, signal?: AbortSignal): Promise<PhotoResolution> {
  try { return await resolvePhotoSafely(photo, size, pixels, signal); }
  catch { return { status: 'temporary-error' }; }
}
async function resolvePhotoSafely(photo: PhotoReference, size: 'thumbnail' | 'full', pixels: number, signal?: AbortSignal): Promise<PhotoResolution> {
  if (signal?.aborted) return { status: 'loading' };
  if (photo.provider === 'filmer-copy') {
    const uri = PhotoStorageService.resolveUri(photo);
    return uri && new File(uri).exists ? { status: 'ready', uri } : { status: 'unavailable' };
  }
  let id = referenceIdentifier(photo);
  const generation = epoch;
  let access = await verifyPhotoAsset(id);
  if (generation !== epoch) return { status: 'loading' };
  // Permission and transient failures never trigger recovery; only a missing or out-of-selection asset does.
  if (access.status === 'unavailable' || access.status === 'limited') {
    const recovered = await recoverReference(photo, id);
    if (generation !== epoch) return { status: 'loading' };
    if (recovered) { id = recovered; access = { status: 'ready' }; }
  }
  if (access.status !== 'ready') {
    for (const key of cache.keys()) if (key.startsWith(`${id}:`)) cache.delete(key);
    return access;
  }
  const key = `${id}:${size}:${pixels}`;
  const hit = cache.get(key);
  if (hit?.uri) {
    try { if (new File(hit.uri).exists) { metrics.cacheHits++; return hit; } } catch { /* Regenerate a purged derived render. */ }
    cache.delete(key);
  }
  if (signal?.aborted) return { status: 'loading' };
  const requestKey = `${generation}:${key}`;
  let request = inFlight.get(requestKey);
  if (!request) {
    metrics.requests++;
    request = native!.resolve(id, size === 'full', pixels);
    inFlight.set(requestKey, request);
    cancelRequests.set(requestKey, () => {
      metrics.cancelled++;
      void native?.cancelRender?.(id, size === 'full', pixels).catch(() => {});
    });
  }
  else metrics.coalesced++;
  const started = Date.now();
  consumers.set(requestKey, (consumers.get(requestKey) ?? 0) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const remaining = (consumers.get(requestKey) ?? 1) - 1;
    if (remaining > 0) consumers.set(requestKey, remaining);
    else {
      consumers.delete(requestKey);
      if (signal?.aborted && inFlight.get(requestKey) === request) {
        cancelRequests.get(requestKey)?.();
        cancelRequests.delete(requestKey);
        inFlight.delete(requestKey);
      }
    }
  };
  signal?.addEventListener('abort', release, { once: true });
  try {
    const result = await request;
    if (signal?.aborted) return { status: 'loading' };
    if (generation !== epoch) return { status: 'loading' };
    metrics.completed++; metrics.totalResolveMs += Date.now() - started;
    if (result.status === 'ready' && result.uri) {
      if (cache.size >= 256) cache.delete(cache.keys().next().value!);
      cache.set(key, result);
    }
    return result;
  } catch { return { status: 'temporary-error' }; }
  finally { signal?.removeEventListener('abort', release); release(); if (inFlight.get(requestKey) === request) { inFlight.delete(requestKey); cancelRequests.delete(requestKey); } }
}
function recoverReference(photo: ApplePhotoReference, staleId: string) {
  const cloudId = photo.cloudIdentifier;
  if (!usableCloudIdentifier(cloudId) || typeof native?.locate !== 'function') return undefined;
  const key = `${staleId}\n${cloudId}`;
  let recovery = recoveries.get(key);
  if (!recovery) {
    recovery = locateAndRepair(staleId, cloudId);
    recoveries.set(key, recovery);
  }
  return recovery;
}
async function locateAndRepair(staleId: string, cloudId: string, requirePersistence = false) {
  let located: Awaited<ReturnType<NonNullable<NativePhotos['locate']>>>;
  try { located = await native!.locate!(cloudId); } catch (error) { if (requirePersistence) throw error; return undefined; }
  if (requirePersistence && (located.status === 'temporary-error' || located.status === 'loading' || located.status === 'permission-denied')) throw new Error('PhotoKit mapping temporarily unavailable');
  if (located.status !== 'ready' || !usableAssetId(located.assetId) || located.assetId === staleId) return undefined;
  // Verify independently before any write; a failed check leaves the saved identifiers untouched.
  const verified = await verifyPhotoAsset(located.assetId);
  if (verified.status !== 'ready') {
    if (requirePersistence && (verified.status === 'temporary-error' || verified.status === 'permission-denied')) throw new Error('PhotoKit verification interrupted');
    return undefined;
  }
  try {
    const changed = useRollStore.getState().recoverPhotoReferences(staleId, cloudId, located.assetId);
    if (requirePersistence && changed === 0) throw new Error('Reference changed during repair');
  }
  catch (error) {
    if (requirePersistence) throw error;
    // Viewer-only recovery may display this session without changing the saved identifiers.
  }
  return located.assetId;
}
export async function clearPhotoRenders() {
  try { return await native?.clearRenders() ?? 0; }
  finally { invalidatePhotoRenders(); }
}

/** Checks identifiers and repairs metadata only; never downloads an image. */
export async function checkPhotoReference(photo: ApplePhotoReference): Promise<PhotoStatus> {
  const id = referenceIdentifier(photo);
  const access = await verifyPhotoAsset(id);
  if ((access.status === 'unavailable' || access.status === 'limited') && usableCloudIdentifier(photo.cloudIdentifier) && typeof native?.locate === 'function') {
    try {
      if (await locateAndRepair(id, photo.cloudIdentifier, true)) return 'ready';
    } catch {
      const fresh = await verifyPhotoAsset(id);
      return fresh.status === 'permission-denied' ? 'permission-denied' : 'temporary-error';
    }
  }
  return access.status;
}
export async function photoCacheInfo() {
  if (!native?.cacheInfo) throw new Error('Native cache measurement requires an updated FiLog build');
  return native.cacheInfo();
}

/** Hint PhotoKit about the bounded viewer neighbourhood; no persistent references are changed. */
export function preheatPhotoReferences(photos: PhotoReference[], pixels: number) {
  const ids = photos.filter((photo): photo is ApplePhotoReference => photo.provider === 'apple-photos').map(referenceIdentifier).filter(usableAssetId);
  void native?.preheat?.(ids, pixels, true).catch(() => {});
  return () => { void native?.preheat?.(ids, pixels, false).catch(() => {}); };
}
