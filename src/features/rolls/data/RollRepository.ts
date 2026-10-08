import Storage from 'expo-sqlite/kv-store';
import type { PhotoReference } from '../../photos/types';
import type { Roll } from '../types';
import { mockRolls } from './mockRolls';

const storageKey = 'filmer.rolls.v1';

function isPhoto(value: unknown): value is PhotoReference {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<PhotoReference>;
  if (typeof photo.id !== 'string' || typeof photo.sortOrder !== 'number') return false;
  return photo.provider === 'apple-photos'
    ? typeof photo.assetId === 'string'
    : photo.provider === 'filmer-copy' && photo.storageMode === 'copy' &&
      typeof photo.localUri === 'string' && typeof photo.documentPath === 'string';
}

function isRoll(value: unknown): value is Roll {
  if (!value || typeof value !== 'object') return false;
  const roll = value as Partial<Roll>;
  return [roll.id, roll.filmId, roll.filmName, roll.cameraId, roll.cameraName, roll.date].every(field => typeof field === 'string') &&
    ['35mm', '120', '110', 'other'].includes(roll.format ?? '') && Array.isArray(roll.photos) && roll.photos.every(isPhoto);
}

/** Persistence for the existing Roll store, using the same SQLite KV facility as settings. */
export const RollRepository = {
  load(): Roll[] {
    const raw = Storage.getItemSync(storageKey);
    if (raw === null) return mockRolls;
    const saved: unknown = JSON.parse(raw);
    // Do not silently overwrite an unreadable archive with the initial mock data.
    if (!Array.isArray(saved) || !saved.every(isRoll)) throw new Error('Invalid saved Roll archive');
    return saved;
  },
  save(rolls: Roll[]): void {
    Storage.setItemSync(storageKey, JSON.stringify(rolls));
  },
};
