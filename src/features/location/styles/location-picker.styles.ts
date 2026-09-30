import { StyleSheet } from 'react-native';
import { type ThemeColors, radii, spacing } from '../../../constants/theme';
export const createLocationPickerStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: spacing.md },
  title: { color: colors.text, fontSize: 19, fontWeight: '600', flex: 1 },
  mapArea: { flex: 1, minHeight: 180 }, map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  centerPin: { position: 'absolute', top: '50%', left: '50%', width: 24, height: 24, marginLeft: -12, marginTop: -12, borderRadius: 12, backgroundColor: colors.accent, borderColor: colors.background, borderWidth: 4 },
  locate: { position: 'absolute', bottom: 16, right: 16, borderRadius: 24, backgroundColor: colors.background, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.text, fontSize: 26 },
  panel: { padding: spacing.md, backgroundColor: colors.background, gap: 10, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: 12, color: colors.text },
  searchButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  text: { color: colors.text, fontSize: 15 }, secondary: { color: colors.secondaryText, fontSize: 13 },
  result: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  results: { maxHeight: 140 }, disabled: { opacity: 0.45 },
});
