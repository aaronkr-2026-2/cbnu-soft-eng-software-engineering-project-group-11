import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { validateContactSheetAppearance, type ContactSheetAppearance } from '../utils/contactSheetAppearance';

const key = 'filog.contactSheet.appearance.v1';
// Frame card backdrop per roll: photo id, or null for no photo. Separate key so appearance stays schema 1.
const backdropKey = 'filog.contactSheet.backdrops.v1';
function readBackdrops(): Record<string, string | null> {
  try {
    const saved = JSON.parse(Storage.getItemSync(backdropKey) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([, value]) => value === null || typeof value === 'string')) as Record<string, string | null>;
  } catch { return {}; }
}
function read(): ContactSheetAppearance {
  try {
    const raw = Storage.getItemSync(key);
    const saved = raw ? JSON.parse(raw) : undefined;
    return validateContactSheetAppearance(saved?.schema === 1 ? saved.appearance : undefined);
  } catch { return validateContactSheetAppearance(undefined); }
}
export const useContactSheetPreferences = create<{
  appearance: ContactSheetAppearance;
  updateAppearance: (patch: Partial<ContactSheetAppearance>) => void;
  backdrops: Record<string, string | null>;
  setBackdrop: (rollId: string, photoId: string | null) => void;
}>((set, get) => ({
  appearance: read(),
  backdrops: readBackdrops(),
  setBackdrop: (rollId, photoId) => {
    const backdrops = { ...get().backdrops, [rollId]: photoId };
    Storage.setItemSync(backdropKey, JSON.stringify(backdrops));
    set({ backdrops });
  },
  updateAppearance: patch => {
    const appearance = validateContactSheetAppearance({ ...get().appearance, ...patch });
    Storage.setItemSync(key, JSON.stringify({ schema: 1, appearance }));
    set({ appearance }); // A failed write must not claim the preference was saved.
  },
}));
