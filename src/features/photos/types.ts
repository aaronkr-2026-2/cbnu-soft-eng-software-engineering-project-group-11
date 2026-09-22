export type PhotoProviderName = 'apple-photos';

export type PhotoReference = {
  id: string;
  provider: PhotoProviderName;
  assetId: string;
  localIdentifier?: string;
  sortOrder: number;
  thumbnailUri?: string;
};

export type PhotoPickResult =
  | { status: 'cancelled' }
  | { status: 'permission-denied' }
  | { photos: PhotoReference[]; status: 'selected' };

export interface PhotoProvider {
  pickMultiplePhotos(): Promise<PhotoPickResult>;
}
