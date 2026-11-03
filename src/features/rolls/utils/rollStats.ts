import { resolveRollFilm } from '../../films/utils/resolveRollFilm';
import type { Film } from '../../../types/models';
import type { Roll } from '../types';
import { browseCameraName, browseFilmName, type RollBrowseContext } from './rollBrowse';

export type FilmType = Film['type'];
export type StatCount<Key extends string = string> = { key: Key; label: string; count: number };

export type RollStats = {
  rollCount: number;
  photoCount: number;
  thisYearCount: number;
  /** Newest year first. */
  years: StatCount[];
  films: StatCount[];
  cameras: StatCount[];
  /** Rolls whose film type is unknown are left out. */
  types: StatCount<FilmType>[];
};

const filmTypes: FilmType[] = ['color', 'black-and-white', 'slide', 'cinema'];

function tally(counts: Map<string, StatCount>, key: string, label: string) {
  const entry = counts.get(key);
  if (entry) entry.count++;
  else counts.set(key, { key, label, count: 1 });
}

/** Most rolls first; ties keep alphabetical order so the list is stable. */
function ranked(counts: Map<string, StatCount>, language: string, limit: number): StatCount[] {
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, language) || left.key.localeCompare(right.key))
    .slice(0, limit);
}

export function computeRollStats(rolls: readonly Roll[], films: readonly Film[], context: RollBrowseContext,
  currentYear: number, limit = 5): RollStats {
  const years = new Map<string, StatCount>();
  const filmCounts = new Map<string, StatCount>();
  const cameraCounts = new Map<string, StatCount>();
  const typeCounts = new Map<FilmType, number>();
  let photoCount = 0;

  for (const roll of rolls) {
    photoCount += roll.photos.length;
    // Roll dates are YYYY-MM, or YYYY-MM-DD on older Rolls.
    const year = roll.date.slice(0, 4);
    tally(years, year, year);
    const filmName = browseFilmName(roll, context);
    // Group by visible name so a Roll-specific override joins the same stock.
    tally(filmCounts, filmName.toLocaleLowerCase(context.language), filmName);
    tally(cameraCounts, roll.cameraId, browseCameraName(roll, context));
    const type = resolveRollFilm(films, roll)?.type;
    if (type) typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  return {
    rollCount: rolls.length,
    photoCount,
    thisYearCount: years.get(String(currentYear))?.count ?? 0,
    years: [...years.values()].sort((left, right) => right.key.localeCompare(left.key)),
    films: ranked(filmCounts, context.language, limit),
    cameras: ranked(cameraCounts, context.language, limit),
    types: filmTypes.flatMap(type => typeCounts.has(type) ? [{ key: type, label: type, count: typeCounts.get(type)! }] : []),
  };
}

/** Percentages always use all rolls, including cameras outside the top five. */
export function rollShare(count: number, total: number): number {
  return total > 0 ? Math.round(count / total * 100) : 0;
}

/** Chronological chart with explicit zero-count gaps; long gaps stay compact. */
export function activityYears(years: readonly StatCount[]): StatCount[] {
  const ordered = [...years].sort((a, b) => a.key.localeCompare(b.key));
  return ordered.flatMap((item, index) => {
    const previous = Number(ordered[index - 1]?.key);
    const current = Number(item.key);
    if (index === 0 || !Number.isInteger(previous) || !Number.isInteger(current) || current - previous <= 1) return [item];
    const first = previous + 1;
    const last = current - 1;
    const label = first === last ? String(first) : `${first}–${last}`;
    return [{ key: `gap-${first}`, label, count: 0 }, item];
  });
}

/** Match the exact grouping keys used by the favorites counts. */
export function favoriteRolls(rolls: readonly Roll[], context: RollBrowseContext, kind: 'film' | 'camera', key: string): Roll[] {
  return rolls.filter(roll => (kind === 'camera' ? roll.cameraId : browseFilmName(roll, context).toLocaleLowerCase(context.language)) === key)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
