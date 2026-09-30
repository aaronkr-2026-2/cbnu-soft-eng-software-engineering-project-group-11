import { useTranslation } from '../../../i18n/useTranslation';
import { useState } from 'react';
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
  const [error, setError] = useState(false);

  function addCamera() {
    if (!brand.trim() || !model.trim()) {
      setError(true);
      return;
    }
    const camera = addCustomCamera({ brand, model, format, imageUri });
    onAdded(camera.id);
    onClose();
  }

  return <CatalogItemModal title={t('addCustomCamera')} actionLabel={t('addCamera')} visible={visible} onClose={onClose} onSubmit={addCamera} error={error ? t('invalidCamera') : null}>
    <CatalogField label={t('brand')} value={brand} onChangeText={setBrand} placeholder="Contax" />
    <CatalogField label={t('model')} value={model} onChangeText={setModel} placeholder="T2" />
    <CatalogFormatField value={format} onChange={setFormat} />
    <CatalogImageField label={t('cameraImage')} imageUri={imageUri} onChange={setImageUri} />
  </CatalogItemModal>;
}
