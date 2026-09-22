import { create } from 'zustand';
import { builtInFilms } from '../data/films';
import type { Film } from '../../../types/models';

export type CreateCustomFilmInput = Omit<Film, 'id' | 'isCustom'>;

type FilmState = {
  addCustomFilm: (input: CreateCustomFilmInput) => Film;
  films: Film[];
};

export const useFilmStore = create<FilmState>((set) => ({
  films: builtInFilms,
  addCustomFilm: (input) => {
    const film: Film = { ...input, id: 'custom-film-' + Date.now(), isCustom: true };
    set((state) => ({ films: [...state.films, film] }));
    return film;
  },
}));
