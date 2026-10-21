import * as ImagePicker from 'expo-image-picker';
import type { PhotoPickResult } from '../types';
import { PhotoCopyService } from './PhotoCopyService';

/** Without PhotoKit, keep durable copies instead of unverifiable asset references. */
export async function pickPhotoCopies(rollId: string): Promise<PhotoPickResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    // Ordered PHPicker selection disables range dragging. Prefer bulk selection here;
    // copies retain the result order supplied by the system picker.
    mediaTypes: ['images'], allowsMultipleSelection: true, orderedSelection: false,
    selectionLimit: 0,
    quality: 1, exif: true,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (result.canceled) return { status: 'cancelled' };
  return { status: 'selected', ...await PhotoCopyService.copySelected(rollId, result.assets) };
}
