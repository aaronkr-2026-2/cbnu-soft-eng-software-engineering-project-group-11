export type CloudKind = 'roll' | 'photo' | 'film' | 'camera';
export type Stamp = { n: number; device: string };
export type Register = { stamp: Stamp; value: unknown };
export type CloudDocument = { schema: 1; kind: CloudKind; id: string; rollId?: string; fields: Record<string, Register>; deleted?: Stamp };
export type WireItem = { kind: CloudKind; id: string; rollId?: string; data: Record<string, unknown> };
export const cloudKey = (item: Pick<WireItem, 'kind' | 'id' | 'rollId'>) => JSON.stringify([item.kind, item.rollId ?? '', item.id]);
export const newer = (a: Stamp, b: Stamp) => a.n > b.n || a.n === b.n && a.device > b.device;
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export function mergeDocument(a: CloudDocument | undefined, b: CloudDocument): CloudDocument {
  validateDocument(b);
  if (!a) return b;
  if (cloudKey(a) !== cloudKey(b)) throw new Error('Cloud identity mismatch');
  const fields = { ...a.fields };
  for (const [key, field] of Object.entries(b.fields)) {
    if (!fields[key] || newer(field.stamp, fields[key].stamp)) fields[key] = field;
    else if (canonical(field.stamp) === canonical(fields[key].stamp) && canonical(field.value) !== canonical(fields[key].value)) throw new Error('Conflicting cloud revision');
  }
  const deleted = a.deleted && b.deleted ? newer(a.deleted, b.deleted) ? a.deleted : b.deleted : a.deleted ?? b.deleted;
  return { ...a, fields, ...(deleted ? { deleted } : {}) };
}
export function materialize(document: CloudDocument): Record<string, unknown> {
  return Object.fromEntries(Object.entries(document.fields).filter(([, field]) => field.value !== null).map(([key, field]) => [key, field.value]));
}
export function updateDocument(previous: CloudDocument | undefined, item: WireItem, before: Record<string, unknown> | undefined, stamp: Stamp): CloudDocument {
  if (previous?.deleted) return previous; // Stable IDs are never resurrected; a deliberate new item needs a new ID.
  const fields = { ...previous?.fields };
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(item.data)])) {
    if (!previous || canonical(before?.[key]) !== canonical(item.data[key])) fields[key] = { stamp, value: item.data[key] ?? null };
  }
  return { schema: 1, kind: item.kind, id: item.id, ...(item.rollId ? { rollId: item.rollId } : {}), fields };
}
export function validateDocument(value: unknown): asserts value is CloudDocument {
  const doc = value as CloudDocument;
  const validStamp = (v: Stamp) => v && Number.isSafeInteger(v.n) && v.n > 0 && typeof v.device === 'string' && v.device.length > 0;
  if (!doc || doc.schema !== 1 || !['roll', 'photo', 'film', 'camera'].includes(doc.kind) || typeof doc.id !== 'string' || !doc.id.trim() || doc.id.length > 4096 || (doc.kind === 'photo' && (typeof doc.rollId !== 'string' || !doc.rollId)) || !doc.fields || typeof doc.fields !== 'object' || Array.isArray(doc.fields) || doc.deleted && !validStamp(doc.deleted)) throw new Error('Unsupported cloud entity');
  for (const [key, field] of Object.entries(doc.fields)) if (['__proto__', 'constructor', 'prototype', 'id', 'photos'].includes(key) || !field || !validStamp(field.stamp) || field.value === undefined) throw new Error('Invalid cloud field');
}
