import Storage from 'expo-sqlite/kv-store';
import type { Roll } from '../types';
import { validateRollArchive } from './validateRollArchive';
const storageKey = 'filmer.rolls.v1';
export type ArchiveLoad = { status: 'ready'; rolls: Roll[] } | { status: 'recovery'; raw?: string; reason: string };
export class ArchiveRecoveryError extends Error {
  constructor(public archive: Extract<ArchiveLoad, { status: 'recovery' }>) { super(archive.reason); }
}
let expectedRaw: string | null = null;
let writable = false;
let envelope: Record<string, unknown> | undefined;
export const RollRepository = {
  load(): ArchiveLoad {
    writable = false;
    let raw: string | null | undefined;
    try {
      raw = Storage.getItemSync(storageKey);
      const value: unknown = raw === null ? [] : JSON.parse(raw);
      const rolls = validateRollArchive(value);
      envelope = !Array.isArray(value) && value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined;
      expectedRaw = raw;
      writable = true;
      return { status: 'ready', rolls };
    } catch (error) {
      return { status: 'recovery', ...(typeof raw === 'string' ? { raw } : {}), reason: error instanceof Error ? error.message : 'Storage read failed' };
    }
  },
  save(rolls: Roll[]): void {
    if (!writable) throw new Error('Roll archive requires recovery before writing');
    validateRollArchive(rolls);
    let currentRaw: string | null;
    try { currentRaw = Storage.getItemSync(storageKey); }
    catch {
      writable = false;
      throw new ArchiveRecoveryError({ status: 'recovery', ...(expectedRaw === null ? {} : { raw: expectedRaw }), reason: 'Storage read failed before write' });
    }
    if (currentRaw !== expectedRaw) {
      writable = false;
      throw new ArchiveRecoveryError({ status: 'recovery', ...(currentRaw === null ? {} : { raw: currentRaw }), reason: 'Stored archive changed; retry loading before writing' });
    }
    const serialized = JSON.stringify(envelope ? { ...envelope, rolls } : rolls);
    Storage.setItemSync(storageKey, serialized);
    expectedRaw = serialized;
  },
};
