import * as ImagePicker from 'expo-image-picker';

import type { PhotoPickResult, PhotoProvider, PhotoReference } from '../types';

class ApplePhotosProvider implements PhotoProvider {
  async pickMultiplePhotos(): Promise<PhotoPickResult> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return { status: 'permission-denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 1,
    });

    if (result.canceled) {
      return { status: 'cancelled' };
    }

    return {
      status: 'selected',
      photos: result.assets.map((asset, index) => toPhotoReference(asset, index)),
    };
  }
}

function toPhotoReference(
  asset: ImagePicker.ImagePickerAsset,
  sortOrder: number,
): PhotoReference {
  const assetId = asset.assetId ?? asset.uri;

  return {
    id: 'apple-photos-' + assetId,
    provider: 'apple-photos',
    assetId,
    localIdentifier: asset.assetId ?? undefined,
    sortOrder,
    thumbnailUri: asset.uri,
  };
}

export const applePhotosProvider = new ApplePhotosProvider();
