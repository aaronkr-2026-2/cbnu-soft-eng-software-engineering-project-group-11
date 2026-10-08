import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createContactSheetStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  toolbar: { paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { color: colors.text, fontSize: 20, fontWeight: '600', flex: 1 },
  stage: { flex: 1, marginHorizontal: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 28 },
  button: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, paddingHorizontal: 12 },
  buttonText: { color: colors.background, fontSize: 15, fontWeight: '600' },
  secondary: { backgroundColor: colors.surface },
  secondaryText: { color: colors.text },
  disabled: { opacity: 0.4 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
  statusText: { color: colors.secondaryText, fontSize: 13 },
  error: { color: colors.destructive, fontSize: 13, lineHeight: 19, textAlign: 'center', marginHorizontal: 20, marginTop: 12 },
  exportLayer: { position: 'absolute', left: -10000, top: 0 },
});
