import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { validateContactSheetAppearance, type ContactSheetAppearance } from '../utils/contactSheetAppearance';

const key = 'filog.contactSheet.appearance.v1';
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
}>((set, get) => ({
  appearance: read(),
  updateAppearance: patch => {
    const appearance = validateContactSheetAppearance({ ...get().appearance, ...patch });
    Storage.setItemSync(key, JSON.stringify({ schema: 1, appearance }));
    set({ appearance }); // A failed write must not claim the preference was saved.
  },
}));
