import Storage from 'expo-sqlite/kv-store';
import type { Film, Camera } from '../../../types/models';
export type CatalogLoad<T> = { status: 'ready'; items: T[] } | { status: 'recovery'; raw?: string; reason: string };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string';
const optionalText = (v: Record<string, unknown>, keys: string[]) => keys.every(k => v[k] === undefined || text(v[k]));
function common(v: unknown): v is Record<string, unknown> {
  return record(v) && typeof v.id === 'string' && !!v.id.trim() && typeof v.brand === 'string' && !!v.brand.trim() && v.isCustom === true &&
    optionalText(v, ['imageUri','imageUrl','imageKey']) && (v.imageDocumentPath === undefined || typeof v.imageDocumentPath === 'string');
}
export function validCustomFilm(v: unknown): v is Film {
  return common(v) && typeof v.name === 'string' && !!v.name.trim() && typeof v.iso === 'number' && Number.isFinite(v.iso) && v.iso > 0 &&
    ['color','black-and-white','slide','cinema'].includes(v.type as string) && ['35mm','120','110','other'].includes(v.format as string) &&
    optionalText(v, ['process','source']) && (v.formats === undefined || Array.isArray(v.formats) && v.formats.length > 0 && v.formats.every(f => ['35mm','120','110','other'].includes(f))) &&
    ['aliases','legacyIds'].every(k => v[k] === undefined || Array.isArray(v[k]) && v[k].every(text)) &&
    (v.shortDescription === undefined || record(v.shortDescription) && Object.values(v.shortDescription).every(text)) &&
    (v.imageDocumentPath === undefined || /^film-covers\/cover-[a-z0-9-]+\.[a-z0-9]+$/.test(v.imageDocumentPath as string));
}
export function validCustomCamera(v: unknown): v is Camera {
  return common(v) && typeof v.model === 'string' && !!v.model.trim() && (v.format === undefined || ['35mm','120','110'].includes(v.format as string)) &&
    (v.imageDocumentPath === undefined || /^camera-covers\/cover-[a-z0-9-]+\.[a-z0-9]+$/.test(v.imageDocumentPath as string));
}
/** Separate KV keys: loading catalogs never rewrites Roll archives or existing catalog bytes. */
export function createCatalogRepository<T extends { id: string }>(key: string, field: 'films' | 'cameras', valid: (v: unknown) => v is T, builtInIds: ReadonlySet<string>) {
  let expected: string | null = null;
  let writable = false;
  let envelope: Record<string, unknown> | undefined;
  let failure: Extract<CatalogLoad<T>, { status: 'recovery' }> | undefined;
  function validate(value: unknown): T[] {
    if (!Array.isArray(value) || !value.every(valid) || new Set(value.map(item => item.id)).size !== value.length || value.some(item => builtInIds.has(item.id))) throw new Error('Invalid custom catalog');
    return value;
  }
  return {
    load(): CatalogLoad<T> {
      writable = false;
      let raw: string | null | undefined;
      try {
        raw = Storage.getItemSync(key);
        const saved: unknown = raw === null ? [] : JSON.parse(raw);
        if (record(saved) && saved.schemaVersion !== 1) throw new Error('Unsupported custom catalog version');
        const items = validate(record(saved) ? saved[field] : saved);
        envelope = record(saved) ? saved : undefined;
        expected = raw; writable = true; failure = undefined;
        return { status: 'ready', items };
      } catch (error) {
        failure = { status: 'recovery', raw: typeof raw === 'string' ? raw : failure?.raw,
          reason: error instanceof Error ? error.message : 'Catalog storage failed' };
        return failure;
      }
    },
    getFailure() { return failure; },
    save(items: T[]) {
      if (!writable) throw new Error('Catalog requires recovery');
      validate(items);
      let raw: string | null;
      try { raw = Storage.getItemSync(key); }
      catch (error) { writable = false; failure = { status: 'recovery', raw: expected ?? undefined, reason: 'Catalog read failed before write' }; throw error; }
      if (raw !== expected) {
        writable = false; failure = { status: 'recovery', raw: raw ?? undefined, reason: 'Catalog changed; retry loading' };
        throw new Error(failure.reason);
      }
      const serialized = JSON.stringify(envelope ? { ...envelope, [field]: items } : items);
      Storage.setItemSync(key, serialized); expected = serialized;
    },
  };
}
