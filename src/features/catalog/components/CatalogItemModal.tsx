import { useTranslation } from '../../../i18n/useTranslation';
import { useState, type ReactNode } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View, type ImageSourcePropType } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import { useTheme, useThemedStyles } from '../../../constants/theme';
import type { Camera } from '../../../types/models';
import { createCatalogItemModalStyles } from '../styles/catalog-item-modal.styles';
import { cropAvailable } from '../services/ImageCropService';
import { ImageCropModal } from './ImageCropModal';

type CatalogItemModalProps = {
  title: string;
  actionLabel: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  error: string | null;
  children: ReactNode;
};

export function CatalogItemModal({ title, actionLabel, visible, onClose, onSubmit, error, children }: CatalogItemModalProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createCatalogItemModalStyles);

  return <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
      <View style={styles.sheet}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{title}</Text>
        {children}
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>{t('cancel')}</Text></Pressable>
          <View style={styles.add}><PrimaryButton label={actionLabel} onPress={onSubmit} /></View>
        </View>
      </ScrollView></View>
    </KeyboardAvoidingView>
  </Modal>;
}

export function CatalogField({ label, ...inputProps }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'number-pad' }) {
  const styles = useThemedStyles(createCatalogItemModalStyles);
  const colors = useTheme();

  return <><Text style={styles.label}>{label}</Text><TextInput {...inputProps} accessibilityLabel={label} placeholderTextColor={colors.secondaryText} style={styles.input} /></>;
}

export function CatalogChoices({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemedStyles(createCatalogItemModalStyles);

  return <><Text style={styles.label}>{label}</Text><View style={styles.chips}>{children}</View></>;
}

export function CatalogFormatField({ value, onChange }: { value: NonNullable<Camera['format']>; onChange: (value: NonNullable<Camera['format']>) => void }) {
  const { t } = useTranslation();
  return <CatalogChoices label={t('requiredFormat')}>{(['35mm', '120', '110'] as const).map((item) => <SelectionChip key={item} label={item} onPress={() => onChange(item)} selected={value === item} />)}</CatalogChoices>;
}

export function CatalogImageField({ label, imageUri, onChange, previewSource, onRemove }: { label: string; imageUri?: string; onChange: (uri: string | undefined) => void; previewSource?: ImageSourcePropType; onRemove?: () => void }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createCatalogItemModalStyles);

  const [picking, setPicking] = useState(false);
  const [cropping, setCropping] = useState<{ uri: string; width: number; height: number } | null>(null);
  async function chooseImage() {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert(t('photosAccess'), t('catalogPermission')); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const asset = result.canceled ? undefined : result.assets[0];
      if (!asset) return;
      // Covers are framed at one fixed ratio; let the user choose which part of the photo to keep.
      if (cropAvailable && asset.width > 0 && asset.height > 0) setCropping({ uri: asset.uri, width: asset.width, height: asset.height });
      else onChange(asset.uri);
    } catch {
      Alert.alert(t('photoError'));
    } finally {
      setPicking(false);
    }
  }
  const source = imageUri ? { uri: imageUri } : previewSource;
  return <><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={source ? t('changeImage') : t('chooseImage')} disabled={picking} onPress={chooseImage} style={styles.imageButton}>{source ? <Image source={source} resizeMode="cover" style={styles.image} /> : <Text style={styles.imageText}>{picking ? t('openingPhotos') : t('chooseImage')}</Text>}</Pressable>{source && onRemove ? <Pressable accessibilityRole="button" onPress={onRemove} style={styles.remove}><Text style={styles.removeText}>{t('removeFilmPhoto')}</Text></Pressable> : null}
    {cropping ? <ImageCropModal {...cropping} onCancel={() => setCropping(null)} onDone={uri => { setCropping(null); onChange(uri); }} /> : null}</>;
}
