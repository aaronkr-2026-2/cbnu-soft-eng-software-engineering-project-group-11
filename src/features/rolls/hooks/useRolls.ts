import { useMemo } from 'react';

import type { RollSearchField } from '../types';
import { filterRolls } from '../utils/filterRolls';
import { useRollStore } from '../store/rollStore';

type UseRollsOptions = {
  query: string;
  searchField: RollSearchField;
};

export function useRolls({ query, searchField }: UseRollsOptions) {
  const rolls = useRollStore((state) => state.rolls);
  const filteredRolls = useMemo(
    () => filterRolls(rolls, query, searchField),
    [query, rolls, searchField],
  );

  return {
    rolls: filteredRolls,
    totalCount: rolls.length,
  };
}

export function useRoll(rollId: string) {
  return useRollStore((state) =>
    state.rolls.find((roll) => roll.id === rollId),
  );
}
