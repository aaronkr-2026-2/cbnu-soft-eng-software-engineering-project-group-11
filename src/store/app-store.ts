import { create } from 'zustand';

type AppState = {
  importMode: 'reference' | 'copy';
  setImportMode: (mode: AppState['importMode']) => void;
};

export const useAppStore = create<AppState>((set) => ({
  importMode: 'reference',
  setImportMode: (importMode) => set({ importMode }),
}));
