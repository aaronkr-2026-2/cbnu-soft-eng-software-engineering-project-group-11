import { applePhotosProvider } from '../providers/ApplePhotosProvider';
import { getRollById, useRollStore } from '../../rolls/store/rollStore';
import { invalidatePhotoRenders, verifyPhotoAsset } from './PhotoReferenceService';
export async function relinkPhoto(rollId: string, photoId: string) {
  const original = getRollById(rollId)?.photos.find(photo => photo.id === photoId);
  if (original?.provider !== 'apple-photos') throw new Error('Reference not found');
  const picked = await applePhotosProvider.pickMultiplePhotos(rollId, true);
  if (picked.status === 'cancelled') return;
  if (picked.status !== 'selected' || picked.photos.length !== 1) throw new Error('Replacement could not be verified');
  const replacement = picked.photos[0];
  if (replacement.provider !== 'apple-photos' || (await verifyPhotoAsset(replacement.assetId)).status !== 'ready') throw new Error('Replacement unavailable');
  const current = getRollById(rollId)?.photos.find(photo => photo.id === photoId);
  if (current !== original) throw new Error('Photo changed while selecting replacement');
  useRollStore.getState().relinkPhoto(rollId, photoId, replacement.assetId, replacement.cloudIdentifier);
  invalidatePhotoRenders();
}
