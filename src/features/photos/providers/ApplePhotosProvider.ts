import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../../store/app-store';

import type { PhotoPickResult, PhotoProvider, PhotoReference } from '../types';

class ApplePhotosProvider implements PhotoProvider {
  async pickMultiplePhotos(): Promise<PhotoPickResult> {
    // Copy requires a managed file-storage implementation; never silently import references instead.
    if (useAppStore.getState().importMode === 'copy') return { status: 'copy-unavailable' };
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
    storageMode: 'reference',
    assetId,
    localIdentifier: asset.assetId ?? undefined,
    sortOrder,
    thumbnailUri: asset.uri,
  };
}

export const applePhotosProvider = new ApplePhotosProvider();
