import type { PhotoReference } from '../photos/types';
import type { FilmOverride } from '../../types/models';

export type RollFormat = '35mm' | '120' | '110' | 'other';

export type RollLocation = {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
};

export type Roll = {
  id: string;
  filmId: string;
  filmOverride?: FilmOverride;
  filmName: string;
  cameraId: string;
  cameraName: string;
  format: RollFormat;
  date: string;
  frameCount?: number;
  location?: RollLocation;
  lab?: string;
  notes?: string;
  photos: PhotoReference[];
};

export type RollBrowseMode = 'all' | 'date' | 'film' | 'camera' | 'location';
