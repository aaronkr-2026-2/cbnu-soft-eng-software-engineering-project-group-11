import { create } from 'zustand';
import type { Roll, RollFormat, RollLocation } from '../types';
import type { FilmOverride } from '../../../types/models';
import { FilmCoverStorage } from '../../films/services/FilmCoverStorage';
import { useFilmStore } from '../../films/store/filmStore';
import { useRollStore } from './rollStore';

export type NewRollDraft = {
  filmId?: string;
  filmOverride?: FilmOverride;
  cameraId?: string;
  format: RollFormat;
  date: string;
  frameCount?: number;
  location?: RollLocation;
  lab: string;
  notes: string;
};
function emptyDraft(): NewRollDraft {
  const now = new Date();
  return { format: '35mm', date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, lab: '', notes: '' };
}
export const useNewRollDraftStore = create<{
  draft: NewRollDraft;
  editingId: string | null;
  editDraft: NewRollDraft | null;
  editOriginalCover?: string;
  beginEdit: (roll: Roll) => void;
  updateEdit: (patch: Partial<NewRollDraft>) => void;
  endEdit: () => void;
  update: (patch: Partial<NewRollDraft>) => void;
  reset: () => void;
}>((set, get) => {
  function clean(paths: (string | undefined)[]) {
    const state = get();
    const retained = new Set([
      state.draft.filmOverride?.imageDocumentPath, state.editDraft?.filmOverride?.imageDocumentPath,
      ...useRollStore.getState().rolls.map(roll => roll.filmOverride?.imageDocumentPath),
      ...useFilmStore.getState().films.map(film => film.imageDocumentPath),
    ].filter((path): path is string => !!path));
    FilmCoverStorage.removeUnreferenced(paths.filter((path): path is string => !!path), retained);
  }
  return {
  draft: emptyDraft(),
  editingId: null,
  editDraft: null,
  beginEdit: (roll) => set({ editingId: roll.id, editOriginalCover: roll.filmOverride?.imageDocumentPath, editDraft: {
    filmId: roll.filmId, filmOverride: roll.filmOverride ? { ...roll.filmOverride, formats: roll.filmOverride.formats ? [...roll.filmOverride.formats] : undefined } : undefined, cameraId: roll.cameraId, format: roll.format,
    date: roll.date, frameCount: roll.frameCount, lab: roll.lab ?? '', notes: roll.notes ?? '',
    location: roll.location ? { ...roll.location } : undefined,
  } }),
  updateEdit: (patch) => {
    const previous = get().editDraft?.filmOverride?.imageDocumentPath;
    set((state) => state.editDraft ? { editDraft: { ...state.editDraft, ...patch } } : {});
    clean([previous]);
  },
  endEdit: () => {
    const previous = get();
    set({ editingId: null, editDraft: null, editOriginalCover: undefined });
    clean([previous.editDraft?.filmOverride?.imageDocumentPath, previous.editOriginalCover]);
  },
  update: (patch) => {
    const previous = get().draft.filmOverride?.imageDocumentPath;
    set((state) => ({ draft: { ...state.draft, ...patch } })); clean([previous]);
  },
  reset: () => {
    const previous = get().draft.filmOverride?.imageDocumentPath;
    set({ draft: emptyDraft() }); clean([previous]);
  },
}; });
