import type { Film, FilmOverride } from '../../../types/models';
import { resolveFilm } from './resolveFilm';

export function effectiveFilmName(roll: { filmId?: string; filmName?: string; filmOverride?: FilmOverride }, catalogName?: string): string {
  return roll.filmOverride ? `${roll.filmOverride.brand} ${roll.filmOverride.name}`.trim() : catalogName || roll.filmName || '';
}

/** One resolution path for persisted Rolls and create/edit drafts; catalog is never mutated. */
export function resolveRollFilm(films: readonly Film[], roll: { filmId?: string; filmOverride?: FilmOverride }): Film | undefined {
  const base = resolveFilm(films, roll.filmId);
  if (!roll.filmOverride) return base;
  const { imageKey, ...override } = roll.filmOverride;
  return { ...base, ...override, id: roll.filmId ?? '', isCustom: base?.isCustom ?? false,
    imageKey: imageKey === null ? undefined : imageKey ?? base?.imageKey,
    imageUrl: undefined, imageUri: override.imageUri, imageDocumentPath: override.imageDocumentPath };
}
