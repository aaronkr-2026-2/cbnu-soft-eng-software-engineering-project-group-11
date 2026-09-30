import { create } from 'zustand';
import type { Roll, RollFormat, RollLocation } from '../types';

export type NewRollDraft = {
  filmId?: string;
  cameraId?: string;
  format: RollFormat;
  date: string;
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
  beginEdit: (roll: Roll) => void;
  updateEdit: (patch: Partial<NewRollDraft>) => void;
  endEdit: () => void;
  update: (patch: Partial<NewRollDraft>) => void;
  reset: () => void;
}>((set) => ({
  draft: emptyDraft(),
  editingId: null,
  editDraft: null,
  beginEdit: (roll) => set({ editingId: roll.id, editDraft: {
    filmId: roll.filmId, cameraId: roll.cameraId, format: roll.format,
    date: roll.date, lab: roll.lab ?? '', notes: roll.notes ?? '',
    location: roll.location ? { ...roll.location } : undefined,
  } }),
  updateEdit: (patch) => set((state) => state.editDraft ? { editDraft: { ...state.editDraft, ...patch } } : {}),
  endEdit: () => set({ editingId: null, editDraft: null }),
  update: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  reset: () => set({ draft: emptyDraft() }),
}));
