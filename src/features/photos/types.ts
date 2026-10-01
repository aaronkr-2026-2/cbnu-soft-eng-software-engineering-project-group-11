import type { RollLocation } from '../rolls/types';

export type PhotoProviderName = 'apple-photos';

export type PhotoReference = {
  /** Absent on older references; treated as reference mode. */
  storageMode?: 'reference';
  id: string;
  provider: PhotoProviderName;
  assetId: string;
  localIdentifier?: string;
  sortOrder: number;
  thumbnailUri?: string;
  /** Day the photo was taken, as YYYY-MM-DD. */
  takenAt?: string;
  location?: RollLocation;
  note?: string;
};

export type PhotoDetailsPatch = Partial<Pick<PhotoReference, 'takenAt' | 'location' | 'note'>>;

export type PhotoPickResult =
  | { status: 'cancelled' }
  | { status: 'copy-unavailable' }
  | { status: 'permission-denied' }
  | { photos: PhotoReference[]; status: 'selected' };

export interface PhotoProvider {
  pickMultiplePhotos(): Promise<PhotoPickResult>;
}
