import type { Film } from '../../../types/models';
import { builtInCatalog } from './builtInCatalog';
import { resolveFilm } from '../utils/resolveFilm';
import { getBuiltInFilmDescription } from './filmDescriptions';

const legacyIds: Record<string, string[]> = {
  'kodak-portra-160': ['kodak-professional-portra-160'],
  'kodak-portra-800': ['kodak-professional-portra-800'],
  'kodak-ultramax-400': ['kodak-gc-ultramax-400'],
  'kodak-ektar-100': ['kodak-professional-ektar-100'],
  'kodak-e100': ['kodak-professional-ektachrome-e100'],
  'kodak-t-max-100': ['kodak-professional-t-max-100'],
  'kodak-t-max-400': ['kodak-professional-t-max-400'],
  'kodak-tri-x-400': ['kodak-professional-tri-x-400'],
  'fujifilm-200': ['fujifilm-fujicolor-200'],
  'fujifilm-superia-xtra-400': ['fujifilm-fujicolor-superia-x-tra-400'],
  'fujifilm-pro-400h': ['fujifilm-fujicolor-pro-400h-professional'],
  'fujifilm-provia-100f': ['fujifilm-fujichrome-provia-100f-professional'],
  'fujifilm-velvia-50': ['fujifilm-fujichrome-velvia-50-professional'],
  'fujifilm-neopan-acros-100-ii': ['fujifilm-neopan-100-acros-ii'],
};
export const builtInFilms: Film[] = builtInCatalog.map(film => ({ ...film, legacyIds: legacyIds[film.id], shortDescription: getBuiltInFilmDescription(film) }));
export function getFilmById(id: string): Film | undefined { return resolveFilm(builtInFilms, id); }
