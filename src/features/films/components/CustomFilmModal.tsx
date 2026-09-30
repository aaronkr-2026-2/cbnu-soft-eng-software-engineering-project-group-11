import { useTranslation } from '../../../i18n/useTranslation';
import { useState } from 'react';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import { CatalogChoices, CatalogField, CatalogFormatField, CatalogImageField, CatalogItemModal } from '../../catalog/components/CatalogItemModal';
import { useFilmStore } from '../store/filmStore';

type CustomFilmModalProps = { onAdded: (filmId: string) => void; onClose: () => void; visible: boolean };

export function CustomFilmModal({ onAdded, onClose, visible }: CustomFilmModalProps) {
  const { t } = useTranslation();
  const addCustomFilm = useFilmStore((state) => state.addCustomFilm);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [iso, setIso] = useState('');
  const [format, setFormat] = useState<'35mm' | '120' | '110'>('35mm');
  const [type, setType] = useState<'color' | 'black-and-white' | 'slide'>('color');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [error, setError] = useState(false);

  function addFilm() {
    const parsedIso = Number(iso);
    if (!brand.trim() || !name.trim() || !Number.isFinite(parsedIso) || parsedIso <= 0) { setError(true); return; }
    const film = addCustomFilm({ brand: brand.trim(), name: name.trim(), iso: parsedIso, format, type, imageUri });
    onAdded(film.id); onClose();
  }

  return <CatalogItemModal title={t('addCustomFilm')} actionLabel={t('addFilm')} visible={visible} onClose={onClose} onSubmit={addFilm} error={error ? t('invalidFilm') : null}>
    <CatalogField label={t('brand')} value={brand} onChangeText={setBrand} placeholder="Kodak" />
    <CatalogField label={t('filmName')} value={name} onChangeText={setName} placeholder="Portra 160" />
    <CatalogField label={t('requiredIso')} value={iso} onChangeText={setIso} placeholder="160" keyboardType="number-pad" />
    <CatalogFormatField value={format} onChange={setFormat} />
    <CatalogChoices label={t('filmType')}>{(['color', 'black-and-white', 'slide'] as const).map((value) => <SelectionChip key={value} label={t(value)} onPress={() => setType(value)} selected={type === value} />)}</CatalogChoices>
    <CatalogImageField label={t('filmImage')} imageUri={imageUri} onChange={setImageUri} />
  </CatalogItemModal>;
}
