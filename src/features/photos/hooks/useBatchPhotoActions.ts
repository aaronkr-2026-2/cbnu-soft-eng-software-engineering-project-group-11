import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import { useRollStore } from '../../rolls/store/rollStore';
import { PhotoExportService } from '../services/PhotoExportService';
import { PhotoLibraryPermissionError } from '../services/PhotoLibraryPermissionService';
import { PhotoShareService } from '../services/PhotoShareService';
import type { PhotoReference } from '../types';

export function useBatchPhotoActions(rollId: string, photos: PhotoReference[], onRemoved: () => void,
  onBusyChange: (busy: boolean) => void) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState<{ key: TranslationKey; count?: number } | null>(null);
  const [saved, setSaved] = useState({ count: 0, operation: 0 });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function perform(action: 'share' | 'save' | 'remove') {
    if (lock.current || photos.length === 0) return;
    lock.current = true; setBusy(true); onBusyChange(true); setError(null);
    try {
      if (action === 'share') {
        const result = await PhotoShareService.sharePhotos(photos);
        if (mounted.current && result.failedCount > 0) setError({
          key: result.failedCount === 1 ? 'photoSharePartialErrorOne' : 'photoSharePartialErrorOther', count: result.failedCount,
        });
      }
      if (action === 'save') {
        const result = await PhotoExportService.savePhotos(photos);
        if (mounted.current) {
          if (result.savedCount > 0) setSaved(previous => ({ count: result.savedCount, operation: previous.operation + 1 }));
          if (result.failedCount > 0) setError({ key: result.failedCount === 1 ? 'photoSavePartialErrorOne' : 'photoSavePartialErrorOther', count: result.failedCount });
        }
      }
      if (action === 'remove') {
        useRollStore.getState().removePhotos(rollId, new Set(photos.map(photo => photo.id)));
        onRemoved();
      }
    } catch (cause) {
      if (mounted.current) setError({ key: cause instanceof PhotoLibraryPermissionError ? 'photoSavePermission'
        : action === 'share' ? 'photoShareError' : action === 'remove' ? 'photoRemoveError' : 'photoSaveError' });
    } finally {
      lock.current = false; onBusyChange(false);
      if (mounted.current) setBusy(false);
    }
  }

  function confirmRemove() {
    if (lock.current || photos.length === 0) return;
    const copies = photos.filter(photo => photo.provider === 'filmer-copy').length;
    const message = [t(photos.length === 1 ? 'removePhotoConfirm' : 'removePhotosConfirm', { count: photos.length }),
      t('originalPhotosRemain'), copies > 0 ? t('ownedCopiesRemoved', { count: copies }) : ''].filter(Boolean).join('\n\n');
    Alert.alert(t('removePhotosTitle'), message, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('removeFromRoll'), style: 'destructive', onPress: () => void perform('remove') },
    ]);
  }
  return { busy, error, saved, share: () => void perform('share'), save: () => void perform('save'), confirmRemove };
}
