import { useTranslation } from '../../../i18n/useTranslation';
import { useState, type ReactNode } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PrimaryButton } from '../../../components/ui/PrimaryButton';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import { useTheme, useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../../constants/theme';
import type { Camera } from '../../../types/models';

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
  const styles = useThemedStyles(createStyles);

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
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  return <><Text style={styles.label}>{label}</Text><TextInput {...inputProps} accessibilityLabel={label} placeholderTextColor={colors.secondaryText} style={styles.input} /></>;
}

export function CatalogChoices({ label, children }: { label: string; children: ReactNode }) {
  const styles = useThemedStyles(createStyles);

  return <><Text style={styles.label}>{label}</Text><View style={styles.chips}>{children}</View></>;
}

export function CatalogFormatField({ value, onChange }: { value: NonNullable<Camera['format']>; onChange: (value: NonNullable<Camera['format']>) => void }) {
  const { t } = useTranslation();
  return <CatalogChoices label={t('requiredFormat')}>{(['35mm', '120', '110'] as const).map((item) => <SelectionChip key={item} label={item} onPress={() => onChange(item)} selected={value === item} />)}</CatalogChoices>;
}

export function CatalogImageField({ label, imageUri, onChange }: { label: string; imageUri?: string; onChange: (uri: string | undefined) => void }) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const [picking, setPicking] = useState(false);
  async function chooseImage() {
    if (picking) return;
    setPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { Alert.alert(t('photosAccess'), t('catalogPermission')); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) onChange(result.assets[0]?.uri);
    } catch {
      Alert.alert(t('photoError'));
    } finally {
      setPicking(false);
    }
  }
  return <><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={imageUri ? t('changeImage') : t('chooseImage')} disabled={picking} onPress={chooseImage} style={styles.imageButton}>{imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.image} /> : <Text style={styles.imageText}>{picking ? t('openingPhotos') : t('chooseImage')}</Text>}</Pressable></>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { backgroundColor: colors.backdrop, flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', padding: spacing.lg }, title: { color: colors.text, fontSize: typography.size.screenTitle, fontWeight: typography.weight.semibold }, label: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.semibold, marginTop: spacing.md, marginBottom: spacing.sm }, input: { borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, color: colors.text, fontSize: typography.size.body, padding: 12 }, chips: { flexDirection: 'row', gap: spacing.sm }, imageButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, height: 96, justifyContent: 'center', overflow: 'hidden' }, image: { height: '100%', width: '100%' }, imageText: { color: colors.secondaryText, fontSize: typography.size.body }, error: { color: colors.text, fontSize: typography.size.small, marginTop: spacing.sm }, actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }, cancel: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', paddingHorizontal: spacing.lg }, cancelText: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, add: { flex: 1 },
});
