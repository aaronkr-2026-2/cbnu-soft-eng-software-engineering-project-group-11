import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from '../../../components/ui/Toast';
import { type ThemeColors, useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { useBatchPhotoActions } from '../hooks/useBatchPhotoActions';
import type { PhotoReference } from '../types';
import { PhotoSelectionHeader } from './PhotoSelectionHeader';
import { PhotoSelectionIcon } from './PhotoSelectionIcon';

export function PhotoSelectionControls({ rollId, photos, allSelected, onToggleAll, onExit, onBusyChange }: {
  rollId: string; photos: PhotoReference[]; allSelected: boolean;
  onToggleAll: () => void; onExit: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const actions = useBatchPhotoActions(rollId, photos, onExit, onBusyChange);
  // iOS Screen already applies native safe-area padding; Android needs explicit insets.
  const top = 12 + (Platform.OS === 'android' ? insets.top : 0);
  const bottom = 16 + (Platform.OS === 'android' ? insets.bottom : 0);
  const disabled = actions.busy || photos.length === 0;
  return <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
    <View pointerEvents="box-none" style={[styles.header, { top }]}>
      <PhotoSelectionHeader allSelected={allSelected} disabled={actions.busy} count={photos.length}
        onToggleAll={onToggleAll} onExit={onExit} onSave={actions.save} />
    </View>
    <View pointerEvents="box-none" style={[styles.bottom, { bottom }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('shareSelectedPhotos')} accessibilityState={{ disabled }} disabled={disabled}
        onPress={actions.share} style={[styles.circle, disabled && styles.disabled]}>
        <PhotoSelectionIcon name="share" color={colors.text} />
      </Pressable>
      <View pointerEvents="none" style={styles.countPill}>
        <Text accessibilityLiveRegion="polite" style={styles.count}>{t(photos.length === 1 ? 'photoSelected' : 'photosSelected', { count: photos.length })}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('removeSelectedPhotos')} accessibilityState={{ disabled }} disabled={disabled}
        onPress={actions.confirmRemove} style={[styles.circle, disabled && styles.disabled]}>
        <PhotoSelectionIcon name="trash" color={colors.destructive} />
      </Pressable>
    </View>
    {actions.error ? <View pointerEvents="none" style={[styles.errorPill, { bottom: bottom + 72 }]}>
      <Text accessibilityRole="alert" style={styles.error}>{t(actions.error.key, { count: actions.error.count ?? 0 })}</Text>
    </View> : null}
    {actions.saved.count > 0 ? <View pointerEvents="none" style={[styles.toast, { bottom: bottom + (actions.error ? 144 : 64) }]}>
      <Toast key={actions.saved.operation} message={t(actions.saved.count === 1 ? 'photoSaved' : 'photosSaved', { count: actions.saved.count })} />
    </View> : null}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: { position: 'absolute', left: 24, right: 24 },
  bottom: { position: 'absolute', left: 24, right: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  circle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth },
  countPill: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 26, backgroundColor: '#242424', flexShrink: 1 },
  count: { color: '#FFFFFF', fontSize: 13, lineHeight: 18, textAlign: 'center', fontWeight: '500' },
  disabled: { opacity: 0.35 },
  errorPill: { position: 'absolute', left: 24, right: 24, padding: 12, borderRadius: 16, backgroundColor: colors.surface },
  error: { color: colors.destructive, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  toast: { position: 'absolute', left: 0, right: 0, height: 64 },
});
