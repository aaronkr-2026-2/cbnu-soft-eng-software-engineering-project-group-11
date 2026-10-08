import { PixelRatio, Platform, type View } from 'react-native';
import { Asset } from 'expo-media-library';
import { ensurePhotoWritePermission, PhotoLibraryPermissionError } from '../../photos/services/PhotoLibraryPermissionService';
import * as Sharing from 'expo-sharing';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { contactSheetCaptureSize, type ContactSheetLayout } from '../utils/contactSheetLayout';

export class ContactSheetExportError extends Error {
  constructor(public reason: 'permission' | 'sharing') { super(reason); }
}

export function captureContactSheet(view: View, layout: ContactSheetLayout): Promise<string> {
  return captureRef(view, { format: 'png', quality: 1, result: 'tmpfile',
    ...contactSheetCaptureSize(layout, PixelRatio.get(), Platform.OS), useRenderInContext: true });
}

/** One image per preview session; retry failed generation and release temporary files on close. */
export function createContactSheetExportSession(generate: () => Promise<string>) {
  let image: Promise<string> | undefined;
  let disposed = false;
  function getImage(): Promise<string> {
    if (disposed) return Promise.reject(new Error('Contact sheet preview is closed'));
    if (!image) image = generate().catch(error => { image = undefined; throw error; });
    return image;
  }
  return {
    getImage,
    async save() {
      const uri = await getImage();
      try { await ensurePhotoWritePermission(); }
      catch (error) {
        if (error instanceof PhotoLibraryPermissionError) throw new ContactSheetExportError('permission');
        throw error;
      }
      await Asset.create(uri);
    },
    async share() {
      if (!await Sharing.isAvailableAsync()) throw new ContactSheetExportError('sharing');
      await Sharing.shareAsync(await getImage(), { mimeType: 'image/png', UTI: 'public.png' });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      void image?.then(uri => releaseCapture(uri)).catch(() => {});
    },
  };
}
