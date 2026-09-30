export type RollFormat = '35mm' | '120' | '110' | 'other';

import type { PhotoReference } from '../photos/types';

export type RollLocation = {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
};

export type Roll = {
  id: string;
  filmId: string;
  filmName: string;
  cameraId: string;
  cameraName: string;
  format: RollFormat;
  date: string;
  location?: RollLocation;
  lab?: string;
  notes?: string;
  photos: PhotoReference[];
};

export type RollSearchField = 'all' | 'camera' | 'film';
