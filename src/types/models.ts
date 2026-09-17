export type PhotoProvider = 'apple-photos' | 'android-media' | 'local';

export type Film = {
  id: string;
  brand: string;
  name: string;
  iso: number;
  format: '35mm' | '120' | '110' | 'other';
  isCustom: boolean;
};

export type Camera = {
  id: string;
  brand: string;
  model: string;
  isCustom: boolean;
};

export type Roll = {
  id: string;
  filmId: string;
  cameraId: string | null;
  frames: number;
  shotAt: string | null;
  location: string | null;
  notes: string | null;
};

export type PhotoReference = {
  id: string;
  rollId: string;
  provider: PhotoProvider;
  providerAssetId: string;
  localIdentifier: string | null;
  frameNumber: number | null;
};
