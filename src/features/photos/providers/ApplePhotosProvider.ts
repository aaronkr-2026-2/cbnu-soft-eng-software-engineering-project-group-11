import { Linking } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import type { ApplePhotoReference, PhotoPickResult, PhotoProvider } from '../types';
import { photoModuleAvailable, pickPhotoReferences, usableAssetId, usableCloudIdentifier, verifyPhotoAsset } from '../services/PhotoReferenceService';

class ApplePhotosProvider implements PhotoProvider {
  async pickMultiplePhotos(_rollId: string, single = false): Promise<PhotoPickResult> {
    // Persistent references require our PhotoKit bridge; never fall back to copying picker exports.
    if (!photoModuleAvailable) throw new Error('FILMER PhotoKit module requires a new iOS build');
    let permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (!permission.granted && permission.canAskAgain) permission = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
    if (!permission.granted) return { status: 'permission-denied' };
    const result = await pickPhotoReferences(single);
    if (result.canceled) return { status: 'cancelled' };
    const photos: ApplePhotoReference[] = [];
    let failedCount = 0;
    const seen = new Set<string>();
    for (const asset of result.assets) {
      // PHPicker may return null under limited access. Never substitute its export URI.
      if (!usableAssetId(asset.assetId)) { failedCount++; continue; }
      if (seen.has(asset.assetId)) continue;
      seen.add(asset.assetId);
      const access = await verifyPhotoAsset(asset.assetId);
      if (access.status !== 'ready') { failedCount++; continue; }
      photos.push({
        id: 'apple-photos-' + asset.assetId, provider: 'apple-photos', storageMode: 'reference',
        assetId: asset.assetId, localIdentifier: asset.assetId, sortOrder: photos.length,
        takenAt: asset.takenAt, ...(usableCloudIdentifier(asset.cloudId) ? { cloudIdentifier: asset.cloudId } : {}),
      });
    }
    return { status: 'selected', photos, failedCount };
  }
  async manageAccess() {
    const permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (permission.accessPrivileges === 'limited') await MediaLibrary.presentPermissionsPicker(['photo']);
    else await Linking.openSettings();
  }
}
export const applePhotosProvider = new ApplePhotosProvider();
