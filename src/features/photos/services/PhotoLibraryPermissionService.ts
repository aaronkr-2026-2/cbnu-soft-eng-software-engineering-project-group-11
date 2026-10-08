import { getPermissionsAsync, requestPermissionsAsync } from 'expo-media-library';

export class PhotoLibraryPermissionError extends Error {}

export async function ensurePhotoWritePermission() {
  let permission = await getPermissionsAsync(true, ['photo']);
  if (!permission.granted && permission.canAskAgain) permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) throw new PhotoLibraryPermissionError('Photo write permission denied');
}
