import { create } from 'zustand';

import type { PhotoDetailsPatch, PhotoReference } from '../../photos/types';
import { mockRolls } from '../data/mockRolls';
import type { Roll, RollFormat, RollLocation } from '../types';

export type CreateRollInput = {
  cameraName: string;
  cameraId: string;
  date: string;
  filmId: string;
  filmName: string;
  format: RollFormat;
  location?: RollLocation;
  lab?: string;
  notes?: string;
};

type RollState = {
  updateRoll: (rollId: string, input: CreateRollInput) => void;
  reorderPhotos: (rollId: string, ids: string[]) => void;
  updatePhoto: (rollId: string, photoId: string, patch: PhotoDetailsPatch) => void;
  addPhotosToRoll: (rollId: string, photos: PhotoReference[]) => void;
  createRoll: (input: CreateRollInput) => Roll;
  rolls: Roll[];
};

export const useRollStore = create<RollState>((set) => ({
  rolls: mockRolls,
  updateRoll: (rollId, input) => set((state) => ({
    rolls: state.rolls.map((roll) => roll.id === rollId ? {
      ...roll,
      filmId: input.filmId, filmName: input.filmName,
      cameraId: input.cameraId, cameraName: input.cameraName,
      format: input.format, date: input.date,
      lab: input.lab?.trim() || undefined, notes: input.notes?.trim() || undefined,
      location: input.location ? { ...input.location } : undefined,
    } : roll),
  })),
  updatePhoto: (rollId, photoId, patch) => set((state) => ({
    rolls: state.rolls.map((roll) => roll.id !== rollId ? roll : {
      ...roll,
      photos: roll.photos.map((photo) => photo.id === photoId ? { ...photo, ...patch } : photo),
    }),
  })),
  reorderPhotos: (rollId, ids) => set((state) => ({
    rolls: state.rolls.map((roll) => {
      if (roll.id !== rollId) return roll;
      const byId = new Map(roll.photos.map((photo) => [photo.id, photo]));
      if (ids.length !== roll.photos.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) return roll;
      return { ...roll, photos: ids.map((id, sortOrder) => ({ ...byId.get(id)!, sortOrder })) };
    }),
  })),
  createRoll: (input) => {
    const roll: Roll = {
      id: 'roll-' + Date.now(),
      ...input,
      photos: [],
    };
    set((state) => ({ rolls: [roll, ...state.rolls] }));
    return roll;
  },
  addPhotosToRoll: (rollId, photos) => {
    set((state) => ({
      rolls: state.rolls.map((roll) =>
        roll.id === rollId
          ? {
              ...roll,
              photos: [
                ...roll.photos,
                ...photos.map((photo, index) => ({
                  ...photo,
                  id: photo.id + '-' + (roll.photos.length + index),
                  sortOrder: roll.photos.length + index,
                })),
              ],
            }
          : roll,
      ),
    }));
  },
}));

export function getRollById(rollId: string): Roll | undefined {
  return useRollStore.getState().rolls.find((roll) => roll.id === rollId);
}
