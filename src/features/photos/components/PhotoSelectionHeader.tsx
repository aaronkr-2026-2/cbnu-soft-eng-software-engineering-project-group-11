import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { type ThemeColors, useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { PhotoSelectionIcon } from './PhotoSelectionIcon';

export function PhotoSelectionHeader({ allSelected, disabled, count, onToggleAll, onExit, onSave }: {
  allSelected: boolean; disabled: boolean; count: number; onToggleAll: () => void; onExit: () => void; onSave: () => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const saveDisabled = disabled || count === 0;
  return <View pointerEvents="box-none" style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onToggleAll}
      style={[styles.pill, disabled && styles.disabled]}>
      <Text style={styles.label}>{t(allSelected ? 'deselectAll' : 'selectAll')}</Text>
    </Pressable>
    <View style={styles.capsule}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('downloadSelectedPhotos')} accessibilityState={{ disabled: saveDisabled }}
        disabled={saveDisabled} onPress={onSave} style={[styles.iconButton, saveDisabled && styles.disabled]}>
        {disabled ? <ActivityIndicator size="small" color={colors.text} /> : <PhotoSelectionIcon name="download" color={colors.text} />}
      </Pressable>
      <View style={styles.divider} />
      <Pressable accessibilityRole="button" accessibilityLabel={t('exitPhotoSelection')} accessibilityState={{ disabled }}
        disabled={disabled} onPress={onExit} style={[styles.iconButton, disabled && styles.disabled]}>
        <PhotoSelectionIcon name="close" color={colors.text} />
      </Pressable>
    </View>
  </View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pill: { minHeight: 46, paddingHorizontal: 18, borderRadius: 25, justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, flexShrink: 1 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  capsule: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: 'hidden' },
  iconButton: { width: 48, height: 46, alignItems: 'center', justifyContent: 'center' },
  divider: { width: StyleSheet.hairlineWidth, height: 20, backgroundColor: colors.border },
  disabled: { opacity: 0.35 },
});
