import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createSettingsSelectModalStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.backdrop },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  cancel: { minHeight: 44, justifyContent: 'center', paddingRight: 24 },
  title: { color: colors.text, fontSize: 19, fontWeight: '600', flexShrink: 1 },
  text: { color: colors.text, fontSize: 17, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  check: { width: 32, color: colors.text, fontSize: 20 },
});
