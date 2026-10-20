import { useFilmStore } from '../store/filmStore';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { Film, FilmOverride } from '../../../types/models';
import { useTranslation } from '../../../i18n/useTranslation';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import { CatalogChoices, CatalogField, CatalogImageField, CatalogItemModal } from '../../catalog/components/CatalogItemModal';
import { FILM_ASSETS } from '../data/filmAssets';
import { FilmCoverStorage, filmImageUri } from '../services/FilmCoverStorage';

export function FilmForm({ mode, initialValues, visible, onClose, onSubmit }: {
  mode: 'create' | 'edit'; initialValues?: Film; visible: boolean; onClose: () => void; onSubmit: (film: FilmOverride) => void;
}) {
  const { t } = useTranslation();
  const [brand, setBrand] = useState(initialValues?.brand ?? '');
  const [name, setName] = useState(initialValues?.name ?? '');
  const [iso, setIso] = useState(initialValues ? String(initialValues.iso) : '');
  const [formats, setFormats] = useState<Film['format'][]>(initialValues?.formats ?? [initialValues?.format ?? '35mm']);
  const [type, setType] = useState<Film['type']>(initialValues?.type ?? 'color');
  const [process, setProcess] = useState(initialValues?.process ?? '');
  const initialUri = filmImageUri(initialValues);
  const [imageUri, setImageUri] = useState(initialUri);
  const [imageKey, setImageKey] = useState<string | null>(initialValues?.imageKey ?? null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const dirty = brand !== (initialValues?.brand ?? '') || name !== (initialValues?.name ?? '') ||
    iso !== (initialValues ? String(initialValues.iso) : '') || type !== (initialValues?.type ?? 'color') ||
    process !== (initialValues?.process ?? '') || imageUri !== initialUri || imageKey !== (initialValues?.imageKey ?? null) ||
    JSON.stringify(formats) !== JSON.stringify(initialValues?.formats ?? [initialValues?.format ?? '35mm']);
  function close() {
    if (busy.current) return;
    if (!dirty) { onClose(); return; }
    Alert.alert(t('discardFilmChanges'), undefined, [{ text: t('keepEditing'), style: 'cancel' },
      { text: t('discard'), style: 'destructive', onPress: onClose }]);
  }
  async function submit() {
    if (busy.current) return;
    const parsedIso = Number(iso);
    if (!brand.trim() || !name.trim() || !Number.isFinite(parsedIso) || parsedIso <= 0 || !formats.length) { setError(t('invalidFilm')); return; }
    busy.current = true; setError(null);
    let submitted = false;
    let copied: Awaited<ReturnType<typeof FilmCoverStorage.copy>> | undefined;
    try {
      if (imageUri && (imageUri !== initialUri || !initialValues?.imageDocumentPath)) copied = await FilmCoverStorage.copy(imageUri);
      onSubmit({ brand: brand.trim(), name: name.trim(), iso: parsedIso, type, format: formats[0], formats: [...formats],
        process: process.trim() || undefined, imageKey,
        imageUri: copied?.imageUri ?? imageUri,
        imageDocumentPath: copied?.imageDocumentPath ?? (imageUri === initialUri ? initialValues?.imageDocumentPath : undefined) });
      submitted = true;
      onClose();
    } catch {
      if (copied && !submitted) {
        const retained = new Set(useFilmStore.getState().films.flatMap(film => film.imageDocumentPath ? [film.imageDocumentPath] : []));
        FilmCoverStorage.removeUnreferenced([copied.imageDocumentPath], retained);
      }
      setError(t('filmSaveError'));
    }
    finally { busy.current = false; }
  }
  return <CatalogItemModal title={t(mode === 'edit' ? 'editFilm' : 'addCustomFilm')} actionLabel={t(mode === 'edit' ? 'saveChanges' : 'addFilm')} visible={visible} onClose={close} onSubmit={() => void submit()} error={error}>
    <CatalogField label={t('brand')} value={brand} onChangeText={setBrand} placeholder="Kodak" />
    <CatalogField label={t('filmName')} value={name} onChangeText={setName} placeholder="Portra 160" />
    <CatalogField label={t('requiredIso')} value={iso} onChangeText={setIso} placeholder="160" keyboardType="number-pad" />
    <CatalogChoices label={t('requiredFormat')}>{(['35mm', '120', '110', 'other'] as const).map(value => <SelectionChip key={value} label={value === 'other' ? t('other') : value} selected={formats.includes(value)} onPress={() => setFormats(previous => previous.includes(value) ? previous.filter(item => item !== value) : [...previous, value])} />)}</CatalogChoices>
    <CatalogChoices label={t('filmType')}>{(['color', 'black-and-white', 'slide', 'cinema'] as const).map(value => <SelectionChip key={value} label={t(value)} selected={type === value} onPress={() => setType(value)} />)}</CatalogChoices>
    <CatalogField label={t('filmProcess')} value={process} onChangeText={setProcess} placeholder="C-41" />
    <CatalogImageField label={t('filmImage')} imageUri={imageUri} previewSource={imageKey ? FILM_ASSETS[imageKey] : undefined}
      onChange={uri => { setImageUri(uri); setImageKey(null); }} onRemove={() => { setImageUri(undefined); setImageKey(null); }} />
  </CatalogItemModal>;
}
