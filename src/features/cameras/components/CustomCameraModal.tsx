import { useTranslation } from '../../../i18n/useTranslation';
import { useRef, useState } from 'react';
import { CatalogField, CatalogFormatField, CatalogImageField, CatalogItemModal } from '../../catalog/components/CatalogItemModal';
import type { Camera } from '../../../types/models';
import { useCameraStore } from '../store/cameraStore';

type CustomCameraModalProps = { onAdded: (cameraId: string) => void; onClose: () => void; visible: boolean };

export function CustomCameraModal({ onAdded, onClose, visible }: CustomCameraModalProps) {
  const { t } = useTranslation();
  const addCustomCamera = useCameraStore((state) => state.addCustomCamera);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [format, setFormat] = useState<NonNullable<Camera['format']>>('35mm');
  const [imageUri, setImageUri] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  function close() { if (!busy.current) onClose(); }

  async function addCamera() {
    if (busy.current) return;
    if (!brand.trim() || !model.trim()) {
      setError(t('invalidCamera'));
      return;
    }
    busy.current = true; setError(null);
    try {
      const camera = await addCustomCamera({ brand, model, format, imageUri });
      onAdded(camera.id); onClose();
    } catch { setError(t('saveError')); }
    finally { busy.current = false; }
  }

  return <CatalogItemModal title={t('addCustomCamera')} actionLabel={t('addCamera')} visible={visible} onClose={close} onSubmit={() => void addCamera()} error={error}>
    <CatalogField label={t('brand')} value={brand} onChangeText={setBrand} placeholder="Contax" />
    <CatalogField label={t('model')} value={model} onChangeText={setModel} placeholder="T2" />
    <CatalogFormatField value={format} onChange={setFormat} />
    <CatalogImageField label={t('cameraImage')} imageUri={imageUri} onChange={setImageUri} />
  </CatalogItemModal>;
}
