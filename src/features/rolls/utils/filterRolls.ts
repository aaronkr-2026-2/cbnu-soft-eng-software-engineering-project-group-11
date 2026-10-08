import type { Roll, RollBrowseMode } from '../types';
import { browseCameraName, browseFilmName, browseLocation, type RollBrowseContext } from './rollBrowse';
import { isRollMonth } from './groupRolls';
import { formatRollMonth } from './rollMonth';

export function filterRolls(
  rolls: Roll[],
  query: string,
  mode: RollBrowseMode,
  context: RollBrowseContext,
): Roll[] {
  const normalizedQuery = query.trim().toLocaleLowerCase(context.language);

  if (!normalizedQuery) {
    return rolls;
  }

  return rolls.filter((roll) => {
    const values = {
      film: [browseFilmName(roll, context)],
      camera: [browseCameraName(roll, context)],
      date: [roll.date, isRollMonth(roll.date) ? formatRollMonth(roll.date, context.language, 'long') : ''],
      location: [browseLocation(roll, context.language).title, roll.location?.name ?? '', roll.location?.address ?? ''],
    };
    // One matching rule for all modes; All and Date retain archive-wide search.
    const searchableValues = mode === 'all' || mode === 'date'
      ? [...values.film, ...values.camera, ...values.date, ...values.location]
      : values[mode];

    return searchableValues.some((value) =>
      value.toLocaleLowerCase(context.language).includes(normalizedQuery),
    );
  });
}
