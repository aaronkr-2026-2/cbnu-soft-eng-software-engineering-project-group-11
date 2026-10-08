import type { RollLocation } from '../rolls/types';

export type PhotoProviderName = 'apple-photos' | 'filmer-copy';

type PhotoDetails = {
  id: string;
  sortOrder: number;
  thumbnailUri?: string;
  /** Day the photo was taken, as YYYY-MM-DD. */
  takenAt?: string;
  location?: RollLocation;
  note?: string;
};

export type ApplePhotoReference = PhotoDetails & {
  provider: 'apple-photos';
  /** Absent on older references; treated as reference mode. */
  storageMode?: 'reference';
  assetId: string;
  localIdentifier?: string;
};

export type CopiedPhotoReference = PhotoDetails & {
  provider: 'filmer-copy';
  storageMode: 'copy';
  localUri: string;
  /** Relative to Documents so a changed iOS app-container URI can be resolved. */
  documentPath: string;
};

export type PhotoReference = ApplePhotoReference | CopiedPhotoReference;

export type PhotoDetailsPatch = Partial<Pick<PhotoReference, 'takenAt' | 'location' | 'note'>>;

export type PhotoPickResult =
  | { status: 'cancelled' }
  | { status: 'permission-denied' }
  | { photos: PhotoReference[]; status: 'selected'; failedCount?: number };

export interface PhotoProvider {
  pickMultiplePhotos(rollId: string): Promise<PhotoPickResult>;
}
