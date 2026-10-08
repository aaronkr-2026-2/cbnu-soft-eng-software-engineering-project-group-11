import { useMemo } from 'react';

import type { AppLanguage } from '../../../store/app-store';
import { useCameraStore } from '../../cameras/store/cameraStore';
import { useFilmStore } from '../../films/store/filmStore';
import type { RollBrowseMode } from '../types';
import { filterRolls } from '../utils/filterRolls';
import { groupRolls } from '../utils/groupRolls';
import { createRollBrowseContext } from '../utils/rollBrowse';
import { useRollStore } from '../store/rollStore';

type UseRollsOptions = {
  query: string;
  browseMode: RollBrowseMode;
  language: AppLanguage;
};

export function useRolls({ query, browseMode, language }: UseRollsOptions) {
  const rolls = useRollStore((state) => state.rolls);
  const films = useFilmStore((state) => state.films);
  const cameras = useCameraStore((state) => state.cameras);
  const context = useMemo(() => createRollBrowseContext(films, cameras, language), [films, cameras, language]);
  const filteredRolls = useMemo(
    () => filterRolls(rolls, query, browseMode, context),
    [query, rolls, browseMode, context],
  );
  const groups = useMemo(() => groupRolls(filteredRolls, browseMode, context), [filteredRolls, browseMode, context]);

  return {
    groups,
    totalCount: rolls.length,
  };
}

export function useRoll(rollId: string) {
  return useRollStore((state) =>
    state.rolls.find((roll) => roll.id === rollId),
  );
}
