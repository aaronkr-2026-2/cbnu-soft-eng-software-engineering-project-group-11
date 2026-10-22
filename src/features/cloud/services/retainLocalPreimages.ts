import Storage from 'expo-sqlite/kv-store';
import type { CloudProjection } from '../utils/cloudProjection';
import { canonical } from '../utils/cloudModel';

/** Local review history, never automatic resurrection. No photo bytes or user files are removed. */
export function retainLocalPreimages(key: string, before: CloudProjection, after: CloudProjection) {
  const changed = (['rolls', 'films', 'cameras'] as const).flatMap(kind => {
    const next = new Map(after[kind].map(item => [item.id, item]));
    return before[kind].filter(item => canonical(item) !== canonical(next.get(item.id))).map(value => ({ key: JSON.stringify([kind, value.id]), value }));
  });
  if (!changed.length) return;
  const raw = Storage.getItemSync(key);
  const saved = raw === null ? { schema: 1, records: {} } : JSON.parse(raw);
  if (saved?.schema !== 1 || !saved.records || typeof saved.records !== 'object' || Array.isArray(saved.records)) throw new Error('Local cloud review archive requires review');
  for (const item of changed) {
    const entry = { savedAt: Date.now(), value: item.value };
    const previous = saved.records[item.key];
    if (!previous) saved.records[item.key] = { ...entry, history: [] };
    else {
      if (previous.history !== undefined && !Array.isArray(previous.history)) throw new Error('Local cloud review history requires review');
      const history = previous.history ?? [];
      if (canonical(previous.value) !== canonical(item.value) && !history.some((old: { value: unknown }) => canonical(old.value) === canonical(item.value))) history.push(entry);
      previous.history = history;
    }
  }
  Storage.setItemSync(key, JSON.stringify(saved));
}
