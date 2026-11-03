import { translations } from '../../../i18n/translations';
import type { Roll, RollBrowseMode } from '../types';
import { browseCameraName, browseFilmName, browseLocation, type RollBrowseContext } from './rollBrowse';
import { formatRollMonth } from './rollMonth';

export type RollGroup = { key: string; title: string; rolls: Roll[] };

export function isRollMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Stable month ordering; equal-month rolls keep their existing order. */
export function sortRollsByDate(rolls: Roll[]): Roll[] {
  return [...rolls].sort((left, right) => {
    const leftDate = isRollMonth(left.date) ? left.date : '';
    const rightDate = isRollMonth(right.date) ? right.date : '';
    return rightDate.localeCompare(leftDate);
  });
}

/** Legacy IDs encode creation milliseconds; never substitute edit/sync time. */
function creationTime(roll: Roll): number {
  const timestamp = roll.createdAt === undefined ? Number.NaN : Date.parse(roll.createdAt);
  if (Number.isFinite(timestamp)) return timestamp;
  const legacy = /^roll-(\d+)(?:-|$)/.exec(roll.id);
  const inferred = legacy ? Number(legacy[1]) : 0;
  return Number.isFinite(inferred) ? inferred : 0;
}

/** Deterministic ties keep order independent of SQLite/CloudKit arrival order. */
export function sortRollsByCreation(rolls: Roll[]): Roll[] {
  return [...rolls].sort((left, right) => creationTime(right) - creationTime(left) ||
    (left.id < right.id ? 1 : left.id > right.id ? -1 : 0));
}

/** All shows creation order; grouped tabs retain shooting-month order. */
export function groupRolls(rolls: Roll[], mode: RollBrowseMode, context: RollBrowseContext): RollGroup[] {
  const groups = new Map<string, RollGroup>();
  for (const roll of mode === 'all' ? sortRollsByCreation(rolls) : sortRollsByDate(rolls)) {
    let section: { key: string; title: string };
    switch (mode) {
      case 'date':
        if (!isRollMonth(roll.date)) continue;
        section = { key: `date:${roll.date}`, title: formatRollMonth(roll.date, context.language, 'long') };
        break;
      case 'film':
        section = { key: `film:${roll.filmId}${roll.filmOverride ? `:override:${browseFilmName(roll, context)}` : ''}`, title: browseFilmName(roll, context) };
        break;
      case 'camera':
        section = { key: `camera:${roll.cameraId}`, title: browseCameraName(roll, context) };
        break;
      case 'location':
        section = browseLocation(roll, context.language);
        break;
      default:
        section = { key: 'all', title: translations[context.language].recently };
    }
    const group = groups.get(section.key);
    if (group) group.rolls.push(roll);
    else groups.set(section.key, { ...section, rolls: [roll] });
  }
  return [...groups.values()];
}
