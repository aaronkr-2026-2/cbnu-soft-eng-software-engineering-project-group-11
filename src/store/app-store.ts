import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';

export type AppLanguage = 'vi' | 'en' | 'ko';
export type AppearanceMode = 'light' | 'dark';
export type PhotoImportMode = 'reference' | 'copy';

type AppSettings = { language: AppLanguage; appearance: AppearanceMode; importMode: PhotoImportMode };
type AppState = AppSettings & {
  setLanguage: (language: AppLanguage) => void;
  setAppearance: (appearance: AppearanceMode) => void;
  setImportMode: (importMode: PhotoImportMode) => void;
};
const storageKey = 'filmer.settings.v1';
const defaults: AppSettings = { language: 'en', appearance: 'light', importMode: 'reference' };

function readSettings(): AppSettings {
  try {
    const raw = Storage.getItemSync(storageKey);
    if (!raw) return defaults;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      language: 'language' in saved && (saved.language === 'vi' || saved.language === 'ko') ? saved.language : 'en',
      appearance: 'appearance' in saved && saved.appearance === 'dark' ? 'dark' : 'light',
      importMode: 'importMode' in saved && saved.importMode === 'copy' ? 'copy' : 'reference',
    };
  } catch { return defaults; }
}

export const useAppStore = create<AppState>((set, get) => {
  function update(patch: Partial<AppSettings>) {
    const { language, appearance, importMode } = { ...get(), ...patch };
    const settings = { language, appearance, importMode };
    // Persist before publishing: a failed write must not look like a saved preference.
    Storage.setItemSync(storageKey, JSON.stringify(settings));
    set(settings);
  }
  return {
    ...readSettings(),
    setLanguage: (language) => update({ language }),
    setAppearance: (appearance) => update({ appearance }),
    setImportMode: (importMode) => update({ importMode }),
  };
});
