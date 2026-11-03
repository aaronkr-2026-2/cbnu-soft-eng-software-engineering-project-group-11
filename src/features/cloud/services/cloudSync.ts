import { retainLocalPreimages } from './retainLocalPreimages';
import Storage from 'expo-sqlite/kv-store';
import { File } from 'expo-file-system';
import { PhotoStorageService } from '../../photos/services/PhotoStorageService';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { AppState } from 'react-native';
import { create } from 'zustand';
import { useRollStore } from '../../rolls/store/rollStore';
import { useFilmStore } from '../../films/store/filmStore';
import { useCameraStore } from '../../cameras/store/cameraStore';
import { canonical } from '../utils/cloudModel';
import { validateRollArchive } from '../../rolls/data/validateRollArchive';
import { validCustomCamera, validCustomFilm } from '../../catalog/data/CatalogRepository';
import { CloudSyncEngine, type CloudState, type CloudTransport, type Journal } from './CloudSyncEngine';
import type { CloudProjection } from '../utils/cloudProjection';
import { ReferenceRepairService, type RepairReport } from '../../settings/services/ReferenceRepairService';

type NativeResponse<T> = T | { error: { code: string; kind?: string; message: string; retryAfter: number } };
type NativeCloud = { addListener(event: 'onAccountChanged', listener: () => void): { remove(): void }; deviceID: string; namespace: string; account(): Promise<NativeResponse<Awaited<ReturnType<CloudTransport['account']>>>>;
  fetch(token: string | null, account: string): Promise<NativeResponse<Awaited<ReturnType<CloudTransport['fetch']>>>>;
  save(key: string, document: string, tag: string | null, account: string): Promise<NativeResponse<Awaited<ReturnType<CloudTransport['save']>>>> };
// An optional bridge (including its constants) must not abort root-module evaluation.
const bridge = (() => {
  try {
    const native = requireOptionalNativeModule<NativeCloud>('FiLogCloud');
    return { native, namespace: native?.namespace ?? 'unconfigured', deviceID: native?.deviceID ?? 'unconfigured' };
  } catch {
    return { native: null, namespace: 'unconfigured', deviceID: 'unconfigured' };
  }
})();
const { native } = bridge;
async function unwrap<T>(promise: Promise<NativeResponse<T>>): Promise<T> {
  const value = await promise;
  if (value && typeof value === 'object' && 'error' in value) throw Object.assign(new Error(value.error.message), value.error);
  return value as T;
}
const initial: CloudState = { configured: false, enabled: false, status: 'unavailable', pending: 0 };
export const useCloudStore = create<{ sync: CloudState; photosUnresolved: number | null }>(() => ({ sync: initial, photosUnresolved: null }));
const key = 'filmer.cloud.v1.' + bridge.namespace;
function local(): CloudProjection {
  if ([useRollStore.getState().archive, useFilmStore.getState().archive, useCameraStore.getState().archive].some(archive => archive.status !== 'ready')) throw new Error('Local archive requires recovery; sync paused');
  return { rolls: useRollStore.getState().rolls, films: useFilmStore.getState().films.filter(item => item.isCustom), cameras: useCameraStore.getState().cameras.filter(item => item.isCustom) };
}
function apply(projection: CloudProjection) {
  validateRollArchive(projection.rolls);
  if (!projection.films.every(validCustomFilm) || !projection.cameras.every(validCustomCamera)) throw new Error('Invalid cloud catalog');
  const current = local();
  retainLocalPreimages(key + '.retained', current, projection);
  if (canonical(current.films) !== canonical(projection.films)) useFilmStore.getState().applyCloudItems(projection.films, useFilmStore.getState().films);
  if (canonical(current.cameras) !== canonical(projection.cameras)) useCameraStore.getState().applyCloudItems(projection.cameras, useCameraStore.getState().cameras);
  if (canonical(current.rolls) !== canonical(projection.rolls)) useRollStore.getState().applyCloudRolls(projection.rolls, useRollStore.getState().rolls);
}
let engine: CloudSyncEngine | undefined;
function instance() {
  if (!engine) engine = new CloudSyncEngine({
    read: () => { const raw = Storage.getItemSync(key); return raw === null ? undefined : JSON.parse(raw) as Journal; },
    write: journal => Storage.setItemSync(key, JSON.stringify(journal)), local, apply,
  }, {
    deviceID: bridge.deviceID,
    account: () => native ? unwrap(native.account()) : Promise.resolve({ configured: false, reason: 'native-build' as const }),
    fetch: (token, account) => native ? unwrap(native.fetch(token ?? null, account)) : Promise.reject(new Error('Native CloudKit module unavailable')),
    save: (key, document, tag, account) => native ? unwrap(native.save(key, document, tag ?? null, account)) : Promise.reject(new Error('Native CloudKit module unavailable')),
  }, sync => useCloudStore.setState({ sync }));
  return engine;
}
let retryAfter = 0;
let failures = 0;
let operation: Promise<void> | undefined;
export function syncNow() {
  if (operation) return operation;
  operation = (async () => {
    try {
      await instance().run(); failures = 0; retryAfter = 0;
      if (instance().snapshot.status === 'metadata-synced') {
        // Reference repair is separate from CloudKit metadata success; never claim full photo restore.
        try {
          // A metadata poll must not clear visible previews. Reference checks verify
          // access directly; repaired IDs update their own tiles through the store.
          // Actual library/permission changes still invalidate via the Photos observer.
          const result = await ReferenceRepairService.run(undefined, undefined, undefined, { refreshRenders: false });
          recordReferenceCheck(result);
        } catch { useCloudStore.setState({ photosUnresolved: null }); }
      }
    } catch (error) {
      const delay = Math.max((error as { retryAfter?: number } | null)?.retryAfter ?? 0, Math.min(300, 5 * 2 ** Math.min(++failures, 6)));
      retryAfter = Date.now() + delay * 1000;
      if (!engine) useCloudStore.setState({ sync: { ...initial, status: 'error', error: error instanceof Error ? error.message : 'Cloud journal unavailable' } });
    }
  })().finally(() => { operation = undefined; });
  return operation;
}
export async function setCloudEnabled(enabled: boolean) {
  instance().setEnabled(enabled);
  if (enabled) await syncNow();
}
export function startCloudSync() {
  let debounce: ReturnType<typeof setTimeout> | undefined;
  const changed = () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        const dirty = instance().capture();
        if (dirty && AppState.currentState === 'active' && Date.now() >= retryAfter) void syncNow();
      } catch (error) {
        useCloudStore.setState(state => ({ sync: { ...state.sync, status: 'error', error: error instanceof Error ? error.message : 'Cloud journal write failed' } }));
      }
    }, 800);
  };
  const unsubscribers: (() => void)[] = [];
  let listener: { remove(): void } | undefined;
  let accountListener: { remove(): void } | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  const cleanup = () => {
    clearInterval(interval); clearTimeout(debounce);
    for (const remove of [...unsubscribers, () => listener?.remove(), () => accountListener?.remove()]) {
      try { remove(); } catch { /* Optional service cleanup must not interrupt navigation. */ }
    }
  };
  try {
    for (const store of [useRollStore, useFilmStore, useCameraStore]) unsubscribers.push(store.subscribe(changed));
    listener = AppState.addEventListener('change', state => {
      if (state === 'active') void syncNow();
      else { try { instance().capture(); } catch { /* Next foreground pass reports/retries without resetting the local archive. */ } }
    });
    try { accountListener = native?.addListener('onAccountChanged', () => { void syncNow(); }); }
    catch { /* Older native builds keep foreground/polling checks until rebuilt. */ }
    interval = setInterval(() => { if (AppState.currentState === 'active' && Date.now() >= retryAfter) void syncNow(); }, 30000);
    void syncNow();
  } catch (error) {
    cleanup();
    useCloudStore.setState({ sync: { ...initial, status: 'error', error: error instanceof Error ? error.message : 'Cloud initialization failed' } });
  }
  return cleanup;
}

export function recordReferenceCheck(result: RepairReport) {
  try {
    const missingCopies = local().rolls.flatMap(roll => roll.photos).filter(photo => {
      if (photo.provider !== 'filmer-copy') return false;
      const uri = PhotoStorageService.resolveUri(photo);
      return !uri || !new File(uri).exists;
    }).length;
    useCloudStore.setState({ photosUnresolved: result.restricted + result.inaccessible + result.errors + missingCopies });
  } catch { useCloudStore.setState({ photosUnresolved: null }); }
}
