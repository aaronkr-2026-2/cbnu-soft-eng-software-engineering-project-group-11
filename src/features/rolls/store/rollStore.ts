import { normalizeDisplayName } from '../../catalog/utils/normalizeDisplayName';
import { create } from 'zustand';

import type { PhotoDetailsPatch, PhotoReference } from '../../photos/types';
import { PhotoStorageService } from '../../photos/services/PhotoStorageService';
import { referenceIdentifier } from '../../photos/utils/referenceIdentifier';
import type { ArchiveLoad } from '../data/RollRepository';
import { ArchiveRecoveryError, RollRepository } from '../data/RollRepository';
import type { Roll, RollFormat, RollLocation } from '../types';
import type { FilmOverride } from '../../../types/models';

export type CreateRollInput = {
  cameraName: string;
  cameraId: string;
  date: string;
  frameCount?: number;
  filmId: string;
  filmOverride?: FilmOverride;
  filmName: string;
  format: RollFormat;
  location?: RollLocation;
  lab?: string;
  notes?: string;
};

function normalizeRollInput(input: CreateRollInput): CreateRollInput {
  return {
    ...input,
    filmName: normalizeDisplayName(input.filmName),
    cameraName: normalizeDisplayName(input.cameraName),
    ...(input.filmOverride ? { filmOverride: {
      ...input.filmOverride,
      brand: normalizeDisplayName(input.filmOverride.brand),
      name: normalizeDisplayName(input.filmOverride.name),
    } } : {}),
    ...(input.lab !== undefined ? { lab: normalizeDisplayName(input.lab) || undefined } : {}),
    ...(input.location ? { location: {
      ...input.location,
      ...(input.location.name ? { name: normalizeDisplayName(input.location.name) } : {}),
    } } : {}),
  };
}

type RollState = {
  archive: ArchiveLoad;
  applyCloudRolls: (rolls: Roll[], expected: Roll[]) => void;
  retryLoad: () => void;
  relinkPhoto: (rollId: string, photoId: string, assetId: string, cloudIdentifier?: string) => void;
  recoverPhotoReferences: (staleId: string, cloudIdentifier: string, assetId: string) => number;
  removePhotos: (rollId: string, ids: ReadonlySet<string>) => number;
  deleteRoll: (rollId: string) => boolean;
  updateRoll: (rollId: string, input: CreateRollInput) => void;
  reorderPhotos: (rollId: string, ids: string[]) => void;
  updatePhoto: (rollId: string, photoId: string, patch: PhotoDetailsPatch) => void;
  addPhotosToRoll: (rollId: string, photos: PhotoReference[]) => number;
  createRoll: (input: CreateRollInput) => Roll;
  rolls: Roll[];
};

let rollSequence = 0;
export const useRollStore = create<RollState>((set, get) => {
  function save(update: (state: RollState) => Pick<RollState, 'rolls'>) {
    const next = update(get());
    // Commit before publishing so failed imports can roll back their owned files.
    try { RollRepository.save(next.rolls); }
    catch (error) {
      if (error instanceof ArchiveRecoveryError) set({ archive: error.archive });
      throw error;
    }
    set(next);
  }
  return {
    ...(() => { const archive = RollRepository.load(); return { archive, rolls: archive.status === 'ready' ? archive.rolls : [] }; })(),
    applyCloudRolls: (rolls, expected) => {
      if (get().rolls !== expected || get().archive.status !== 'ready') throw new Error('Rolls changed during cloud merge');
      save(() => ({ rolls })); // Same validator/byte guard; deliberately no owned-file deletion.
    },
    retryLoad: () => {
      const archive = RollRepository.load();
      const previous = get().archive;
      if (archive.status === 'recovery' && archive.raw === undefined && previous.status === 'recovery') archive.raw = previous.raw;
      set(archive.status === 'ready' ? { archive, rolls: archive.rolls } : { archive });
    },
    relinkPhoto: (rollId, photoId, assetId, cloudIdentifier) => save(state => ({
      rolls: state.rolls.map(roll => roll.id !== rollId ? roll : { ...roll, photos: roll.photos.map(photo => {
        if (photo.id !== photoId || photo.provider !== 'apple-photos') return photo;
        // A different photo: the old cloud identifier no longer describes it.
        const { thumbnailUri: _stale, cloudIdentifier: _previous, ...retained } = photo;
        return { ...retained, assetId, localIdentifier: assetId, ...(cloudIdentifier ? { cloudIdentifier } : {}) };
      }) }),
    })),
    recoverPhotoReferences: (staleId, cloudIdentifier, assetId) => {
      // Compare-and-set: only references still pointing at staleId with the same cloud identifier are repaired.
      const matches = (photo: PhotoReference) => photo.provider === 'apple-photos' && photo.cloudIdentifier === cloudIdentifier &&
        referenceIdentifier(photo) === staleId;
      let count = 0;
      if (!get().rolls.some(roll => roll.photos.some(matches))) return 0;
      save(state => ({
        rolls: state.rolls.map(roll => !roll.photos.some(matches) ? roll : { ...roll, photos: roll.photos.map(photo => {
          if (!matches(photo)) return photo;
          count++;
          const { thumbnailUri: _stale, ...retained } = photo;
          return { ...retained, assetId, localIdentifier: assetId };
        }) }),
      }));
      return count;
    },
    removePhotos: (rollId, ids) => {
      const roll = get().rolls.find(item => item.id === rollId);
      const removed = roll?.photos.filter(photo => ids.has(photo.id)) ?? [];
      if (removed.length === 0) return 0;
      save(state => ({ rolls: state.rolls.map(item => item.id === rollId ? {
        ...item, photos: item.photos.filter(photo => !ids.has(photo.id)).sort((a, b) => a.sortOrder - b.sortOrder)
          .map((photo, sortOrder) => ({ ...photo, sortOrder })),
      } : item) }));
      const retainedPaths = new Set(get().rolls.flatMap(item => item.photos.flatMap(photo =>
        photo.provider === 'filmer-copy' ? [photo.documentPath] : [])));
      PhotoStorageService.deleteOwnedCopies(rollId, removed.filter(photo =>
        photo.provider !== 'filmer-copy' || !retainedPaths.has(photo.documentPath)));
      return removed.length;
    },
    deleteRoll: (rollId) => {
      const roll = get().rolls.find(item => item.id === rollId);
      if (!roll) return false;
      save(state => ({ rolls: state.rolls.filter(item => item.id !== rollId) }));
      const retainedPaths = new Set(get().rolls.flatMap(item => item.photos.flatMap(photo =>
        photo.provider === 'filmer-copy' ? [photo.documentPath] : [])));
      PhotoStorageService.deleteOwnedCopies(rollId, roll.photos.filter(photo =>
        photo.provider !== 'filmer-copy' || !retainedPaths.has(photo.documentPath)));
      return true;
    },
    updateRoll: (rollId, input) => {
      input = normalizeRollInput(input);
      save((state) => ({
        rolls: state.rolls.map((roll) => roll.id === rollId ? {
          ...roll,
          filmId: input.filmId, filmName: input.filmName,
          filmOverride: input.filmOverride,
          cameraId: input.cameraId, cameraName: input.cameraName,
          format: input.format, date: input.date,
          frameCount: input.frameCount,
          lab: input.lab?.trim() || undefined, notes: input.notes?.trim() || undefined,
          location: input.location ? { ...input.location } : undefined,
        } : roll),
      }));
    },
    updatePhoto: (rollId, photoId, patch) => save((state) => ({
      rolls: state.rolls.map((roll) => roll.id !== rollId ? roll : {
        ...roll,
        photos: roll.photos.map((photo) => photo.id === photoId ? { ...photo, ...patch } : photo),
      }),
    })),
    reorderPhotos: (rollId, ids) => save((state) => ({
      rolls: state.rolls.map((roll) => {
        if (roll.id !== rollId) return roll;
        const byId = new Map(roll.photos.map((photo) => [photo.id, photo]));
        if (ids.length !== roll.photos.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) return roll;
        return { ...roll, photos: ids.map((id, sortOrder) => ({ ...byId.get(id)!, sortOrder })) };
      }),
    })),
    createRoll: (input) => {
      input = normalizeRollInput(input);
      const roll: Roll = {
        ...input,
        id: `roll-${Date.now()}-${++rollSequence}-${Math.random().toString(36).slice(2, 12)}`,
        createdAt: new Date().toISOString(),
        photos: [],
      };
      save((state) => ({ rolls: [roll, ...state.rolls] }));
      return roll;
    },
    addPhotosToRoll: (rollId, photos) => {
      let addedCount = 0;
      save((state) => ({
        rolls: state.rolls.map((roll) => {
          if (roll.id !== rollId || photos.length === 0) return roll;
          addedCount = photos.length;
          const usedIds = new Set(roll.photos.map(photo => photo.id));
          const nextOrder = roll.photos.reduce((max, photo) => Math.max(max, photo.sortOrder), -1) + 1;
          return {
            ...roll,
            photos: [
              ...roll.photos,
              ...photos.map((photo, index) => {
                const baseId = photo.id + '-' + (roll.photos.length + index);
                let id = photo.provider === 'filmer-copy' ? photo.id : baseId;
                if (photo.provider === 'apple-photos') {
                  let suffix = 0;
                  while (usedIds.has(id)) id = `${baseId}-${++suffix}`;
                }
                usedIds.add(id);
                return { ...photo, id, sortOrder: nextOrder + index };
              }),
            ],
          };
        }),
      }));
      return addedCount;
    },
  };
});

export function getRollById(rollId: string): Roll | undefined {
  return useRollStore.getState().rolls.find((roll) => roll.id === rollId);
}
