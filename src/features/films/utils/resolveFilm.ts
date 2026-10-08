import type { Film } from '../../../types/models';

/** ID aliases resolve archived Rolls without rewriting their stored filmId. */
export function resolveFilm(films: readonly Film[], id?: string): Film | undefined {
  return id ? films.find(film => film.id === id) ?? films.find(film => film.legacyIds?.includes(id)) : undefined;
}
