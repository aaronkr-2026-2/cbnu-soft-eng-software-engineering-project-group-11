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
};

export type PhotoPickResult =
  | { status: 'cancelled' }
  | { status: 'copy-unavailable' }
  | { status: 'permission-denied' }
  | { photos: PhotoReference[]; status: 'selected' };

export interface PhotoProvider {
  pickMultiplePhotos(): Promise<PhotoPickResult>;
}
