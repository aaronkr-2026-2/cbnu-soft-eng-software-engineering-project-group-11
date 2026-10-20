import { create } from 'zustand';
import { builtInFilms } from '../data/films';
import type { Film } from '../../../types/models';
import { createCatalogRepository, validCustomFilm, type CatalogLoad } from '../../catalog/data/CatalogRepository';
export type CreateCustomFilmInput = Omit<Film, 'id' | 'isCustom'>;
const repository = createCatalogRepository('filmer.films.v1', 'films', validCustomFilm, new Set(builtInFilms.map(f => f.id)));
let sequence = 0;
type FilmState = { films: Film[]; archive: CatalogLoad<Film>; retryLoad: () => void; addCustomFilm: (input: CreateCustomFilmInput) => Film };
export const useFilmStore = create<FilmState>((set, get) => {
  const archive = repository.load();
  return {
    archive, films: [...builtInFilms, ...(archive.status === 'ready' ? archive.items : [])],
    retryLoad: () => { const archive = repository.load(); set(archive.status === 'ready' ? { archive, films: [...builtInFilms, ...archive.items] } : { archive }); },
    addCustomFilm: input => {
      let id: string;
      do { id = `custom-film-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`; } while (get().films.some(f => f.id === id));
      const film: Film = { ...input, id, isCustom: true, source: 'custom' };
      const films = [...get().films, film];
      try { repository.save(films.filter(f => f.isCustom)); }
      catch (error) { const archive = repository.getFailure(); if (archive) set({ archive }); throw error; }
      set({ films }); return film;
    },
  };
});
