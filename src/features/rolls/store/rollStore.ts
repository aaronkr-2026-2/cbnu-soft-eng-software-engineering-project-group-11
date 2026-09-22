import { create } from 'zustand';

import type { PhotoReference } from '../../photos/types';
import { mockRolls } from '../data/mockRolls';
import type { Roll, RollFormat } from '../types';

export type CreateRollInput = {
  cameraName: string;
  cameraId: string;
  date: string;
  filmId: string;
  filmName: string;
  format: RollFormat;
  frameCount: number;
  notes?: string;
};

type RollState = {
  addPhotosToRoll: (rollId: string, photos: PhotoReference[]) => void;
  createRoll: (input: CreateRollInput) => Roll;
  rolls: Roll[];
};

export const useRollStore = create<RollState>((set) => ({
  rolls: mockRolls,
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
