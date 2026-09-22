import type { Roll, RollSearchField } from '../types';

export function filterRolls(
  rolls: Roll[],
  query: string,
  field: RollSearchField,
): Roll[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return rolls;
  }

  return rolls.filter((roll) => {
    const searchableValues =
      field === 'camera'
        ? [roll.cameraName]
        : field === 'film'
          ? [roll.filmName]
          : [roll.filmName, roll.cameraName];

    return searchableValues.some((value) =>
      value.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
}
