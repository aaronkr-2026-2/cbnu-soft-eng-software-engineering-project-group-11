import type { Roll } from '../types';
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v);
const id = (v: unknown) => text(v) && !!v.trim() && v.length <= 4096;
const optionalText = (v: Record<string, unknown>, keys: string[]) => keys.every(k => v[k] === undefined || text(v[k]));
const formats = ['35mm', '120', '110', 'other'];
function location(v: unknown) {
  return v === undefined || object(v) && typeof v.latitude === 'number' && Number.isFinite(v.latitude) && Math.abs(v.latitude) <= 90 &&
    typeof v.longitude === 'number' && Number.isFinite(v.longitude) && Math.abs(v.longitude) <= 180 && optionalText(v, ['name','address']);
}
function day(v: unknown) {
  if (!text(v) || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const date = new Date(v + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v;
}
function override(v: unknown) {
  return v === undefined || object(v) && text(v.brand) && text(v.name) && typeof v.iso === 'number' && Number.isFinite(v.iso) && v.iso > 0 &&
    ['color','black-and-white','slide','cinema'].includes(v.type as string) && formats.includes(v.format as string) &&
    (v.formats === undefined || Array.isArray(v.formats) && v.formats.length > 0 && v.formats.every(f => formats.includes(f))) &&
    optionalText(v, ['process','imageUri']) && (v.imageKey == null || text(v.imageKey)) &&
    (v.imageDocumentPath === undefined || typeof v.imageDocumentPath === 'string' && /^film-covers\/cover-[a-z0-9-]+\.[a-z0-9]+$/.test(v.imageDocumentPath));
}
function photo(v: unknown) {
  if (!object(v) || !id(v.id) || !Number.isSafeInteger(v.sortOrder) || (v.sortOrder as number) < 0 ||
    !optionalText(v, ['thumbnailUri','note']) || !location(v.location) || (v.takenAt !== undefined && !day(v.takenAt))) return false;
  if (v.provider === 'apple-photos') {
    // Preserve legacy picker-URI references for relinking, but never resolve their stale images.
    return id(v.assetId) && (v.storageMode === undefined || v.storageMode === 'reference') && optionalText(v, ['localIdentifier']);
  }
  return v.provider === 'filmer-copy' && v.storageMode === 'copy' && text(v.localUri) && typeof v.documentPath === 'string' &&
    /^photos\/[A-Za-z0-9_-]+\/photo-[a-z0-9-]+\.[a-z0-9]+$/.test(v.documentPath);
}
export function validateRollArchive(value: unknown): Roll[] {
  let rolls = value;
  if (object(value)) {
    if (value.schemaVersion !== 1) throw new Error('Unsupported Roll archive version');
    rolls = value.rolls;
  }
  if (!Array.isArray(rolls)) throw new Error('Invalid saved Roll archive');
  const ids = new Set();
  for (const r of rolls) {
    if (!object(r) || !id(r.id) || ids.has(r.id) || !['filmId','filmName','cameraId','cameraName'].every(k => text(r[k])) ||
      !text(r.date) || !(/^\d{4}-(0[1-9]|1[0-2])$/.test(r.date) || day(r.date)) || !formats.includes(r.format as string) ||
      !optionalText(r, ['lab','notes']) || !location(r.location) || !override(r.filmOverride) ||
      (r.frameCount !== undefined && (!Number.isSafeInteger(r.frameCount) || (r.frameCount as number) <= 0)) ||
      !Array.isArray(r.photos) || !r.photos.every(photo) || new Set(r.photos.map(p => p.id)).size !== r.photos.length ||
      new Set(r.photos.map(p => p.sortOrder)).size !== r.photos.length) throw new Error('Invalid saved Roll archive');
    ids.add(r.id);
  }
  return rolls as Roll[];
}
