import { effectiveFilmName } from '../../films/utils/resolveRollFilm';
import { translations } from '../../../i18n/translations';
import type { AppLanguage } from '../../../store/app-store';
import type { Camera, Film } from '../../../types/models';
import type { Roll } from '../types';

export type RollBrowseContext = {
  filmNames: ReadonlyMap<string, string>;
  cameraNames: ReadonlyMap<string, string>;
  language: AppLanguage;
};

export function createRollBrowseContext(films: Film[], cameras: Camera[], language: AppLanguage): RollBrowseContext {
  return {
    filmNames: new Map(films.flatMap((film) => [film.id, ...(film.legacyIds ?? [])].map(id => [id, `${film.brand} ${film.name}`.trim()] as const))),
    cameraNames: new Map(cameras.map((camera) => [camera.id, `${camera.brand} ${camera.model}`.trim()])),
    language,
  };
}

export function browseFilmName(roll: Roll, context: RollBrowseContext): string {
  return effectiveFilmName(roll, context.filmNames.get(roll.filmId)) || translations[context.language].film;
}

export function browseCameraName(roll: Roll, context: RollBrowseContext): string {
  return context.cameraNames.get(roll.cameraId) || roll.cameraName || translations[context.language].camera;
}

export function browseLocation(roll: Roll, language: AppLanguage): { key: string; title: string } {
  if (!roll.location) return { key: 'location:none', title: translations[language].noLocation };
  const title = roll.location.name?.trim() || roll.location.address?.trim();
  return title
    ? { key: `location:saved:${title.toLocaleLowerCase(language)}`, title }
    : { key: 'location:unknown', title: translations[language].unknownLocation };
}
