import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createSettingsStyles = (colors: ThemeColors) => StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.text, fontSize: 28 }, spacer: { width: 48 }, title: { color: colors.text, fontSize: 24, fontWeight: '600' },
  group: { marginTop: 32 }, heading: { color: colors.secondaryText, fontSize: 12, letterSpacing: 1, marginBottom: 10, marginLeft: 12 },
  card: { borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  row: { minHeight: 58, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  label: { color: colors.text, fontSize: 16, flex: 1 }, value: { color: colors.secondaryText, fontSize: 16, flexShrink: 1 }, destructive: { color: colors.destructive },
  note: { color: colors.secondaryText, fontSize: 14, lineHeight: 21, marginTop: 12 },
});
