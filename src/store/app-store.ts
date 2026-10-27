import { create } from 'zustand';
import Storage from 'expo-sqlite/kv-store';

export type AppLanguage = 'vi' | 'en' | 'ko';
export type AppearanceMode = 'light' | 'dark';
export type PhotoQuality = 'optimized' | 'high';
export type PhotoImportMode = 'reference' | 'copy';
export type HomeTourStep = 'newRoll' | 'browse' | 'stats' | 'settings';
export const homeTourSteps: HomeTourStep[] = ['newRoll', 'browse', 'stats', 'settings'];

type AppSettings = { photoQuality: PhotoQuality; language: AppLanguage; appearance: AppearanceMode; importMode: PhotoImportMode; photoGuideSeen: boolean; homeTourSeen: HomeTourStep[] };
type AppState = AppSettings & {
  setPhotoQuality: (photoQuality: PhotoQuality) => void;
  setLanguage: (language: AppLanguage) => void;
  setAppearance: (appearance: AppearanceMode) => void;
  setImportMode: (importMode: PhotoImportMode) => void;
  markPhotoGuideSeen: () => void;
  markHomeTourSeen: (steps: HomeTourStep[]) => void;
  resetGuides: () => void;
};
const storageKey = 'filmer.settings.v1';
const defaults: AppSettings = { photoQuality: 'optimized', language: 'en', appearance: 'light', importMode: 'reference', photoGuideSeen: false, homeTourSeen: [] };

function readSettings(): AppSettings {
  try {
    const raw = Storage.getItemSync(storageKey);
    if (!raw) return defaults;
    const saved: unknown = JSON.parse(raw);
    if (!saved || typeof saved !== 'object') return defaults;
    return {
      photoQuality: 'photoQuality' in saved && saved.photoQuality === 'high' ? 'high' : 'optimized',
      language: 'language' in saved && (saved.language === 'vi' || saved.language === 'ko') ? saved.language : 'en',
      appearance: 'appearance' in saved && saved.appearance === 'dark' ? 'dark' : 'light',
      importMode: 'importMode' in saved && saved.importMode === 'copy' ? 'copy' : 'reference',
      photoGuideSeen: 'photoGuideSeen' in saved && saved.photoGuideSeen === true,
      homeTourSeen: 'homeTourSeen' in saved && Array.isArray(saved.homeTourSeen) ? homeTourSteps.filter(step => (saved.homeTourSeen as unknown[]).includes(step)) : [],
    };
  } catch { return defaults; }
}

export const useAppStore = create<AppState>((set, get) => {
  function update(patch: Partial<AppSettings>) {
    const { language, appearance, importMode, photoQuality, photoGuideSeen, homeTourSeen } = { ...get(), ...patch };
    const settings = { language, appearance, importMode, photoQuality, photoGuideSeen, homeTourSeen };
    // Persist before publishing: a failed write must not look like a saved preference.
    Storage.setItemSync(storageKey, JSON.stringify(settings));
    set(settings);
  }
  return {
    ...readSettings(),
    setPhotoQuality: (photoQuality) => update({ photoQuality }),
    setLanguage: (language) => update({ language }),
    setAppearance: (appearance) => update({ appearance }),
    setImportMode: (importMode) => update({ importMode }),
    markPhotoGuideSeen: () => update({ photoGuideSeen: true }),
    markHomeTourSeen: (steps) => update({ homeTourSeen: homeTourSteps.filter(step => steps.includes(step) || get().homeTourSeen.includes(step)) }),
    resetGuides: () => update({ photoGuideSeen: false, homeTourSeen: [] }),
  };
});
