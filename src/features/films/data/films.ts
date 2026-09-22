import type { Film } from '../../../types/models';

export const builtInFilms: Film[] = [
  { id: 'kodak-portra-400', brand: 'Kodak', name: 'Portra 400', iso: 400, format: '35mm', type: 'color', isCustom: false },
  { id: 'ilford-hp5-plus', brand: 'Ilford', name: 'HP5 Plus', iso: 400, format: '35mm', type: 'black-and-white', isCustom: false },
  { id: 'kodak-gold-200', brand: 'Kodak', name: 'Gold 200', iso: 200, format: '35mm', type: 'color', isCustom: false },
  { id: 'fujifilm-c200', brand: 'Fujifilm', name: 'C200', iso: 200, format: '35mm', type: 'color', isCustom: false },
];

export function getFilmById(id: string): Film | undefined {
  return builtInFilms.find((film) => film.id === id);
}
