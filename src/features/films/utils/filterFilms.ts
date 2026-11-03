import type { Film } from '../../../types/models';
const normalize = (s: string) => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function filterFilms(films: Film[], query: string): Film[] {
  const tokens = query.trim().split(/\s+/).map(normalize).filter(Boolean);
  return films.filter(film => {
    const fields = [film.brand, film.name, film.iso, film.process, ...(film.aliases ?? [])].join(' ');
    return tokens.every(token => normalize(fields).includes(token));
  });
}
