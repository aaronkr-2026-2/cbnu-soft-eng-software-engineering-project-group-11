import * as MediaLibrary from 'expo-media-library';
import { photoModuleAvailable } from '../../photos/services/PhotoReferenceService';
import { applePhotosProvider } from '../../photos/providers/ApplePhotosProvider';
export type PhotosAccess = 'full' | 'limited' | 'denied' | 'undetermined' | 'unavailable';
export const PhotosAccessService = {
  async read(): Promise<PhotosAccess> {
    if (!photoModuleAvailable) return 'unavailable';
    const permission = await MediaLibrary.getPermissionsAsync(false, ['photo']);
    if (permission.accessPrivileges === 'limited') return 'limited';
    if (permission.granted) return 'full';
    return permission.status === 'undetermined' ? 'undetermined' : 'denied';
  },
  async request() { await MediaLibrary.requestPermissionsAsync(false, ['photo']); return this.read(); },
  async manage() { await applePhotosProvider.manageAccess(); },
};
