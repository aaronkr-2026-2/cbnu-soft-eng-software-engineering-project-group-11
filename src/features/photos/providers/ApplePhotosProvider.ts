import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../../store/app-store';

import type { PhotoPickResult, PhotoProvider, PhotoReference } from '../types';
import { PhotoCopyService } from '../services/PhotoCopyService';
import { photoDateFromExif } from '../utils/photoDate';

class ApplePhotosProvider implements PhotoProvider {
  async pickMultiplePhotos(rollId: string): Promise<PhotoPickResult> {
    const importMode = useAppStore.getState().importMode;

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    console.log('PHOTO PERMISSION:', permission);

    if (!permission.granted) {
      return { status: 'permission-denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      exif: true,
      mediaTypes: ['images'],
      quality: 1,
      ...(importMode === 'copy' ? {
        // SDK 57 passes through the raw representation at quality 1 without editing.
        preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
      } : {}),
    });

    if (importMode === 'reference') console.log('IMAGE PICKER RESULT:', result);

    if (result.canceled) {
      return { status: 'cancelled' };
    }

    if (importMode === 'copy') {
      const copied = await PhotoCopyService.copySelected(rollId, result.assets);
      return { status: 'selected', ...copied };
    }

    console.log('ASSETS:', result.assets);

    const photos = result.assets.map((asset, index) => {
      console.log('ASSET', index, {
        uri: asset.uri,
        assetId: asset.assetId,
        fileName: asset.fileName,
        width: asset.width,
        height: asset.height,
        exif: asset.exif,
      });

      const photo = toPhotoReference(asset, index);

      console.log('PHOTO REFERENCE:', photo);

      return photo;
    });

    return {
      status: 'selected',
      photos,
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
    takenAt: photoDateFromExif(asset.exif),
  };
}

export const applePhotosProvider = new ApplePhotosProvider();
