export type RollFormat = '35mm' | '120' | '110' | 'other';

import type { PhotoReference } from '../photos/types';

export type Roll = {
  id: string;
  filmId: string;
  filmName: string;
  cameraId: string;
  cameraName: string;
  format: RollFormat;
  frameCount: number;
  date: string;
  notes?: string;
  photos: PhotoReference[];
};

export type RollSearchField = 'all' | 'camera' | 'film';
