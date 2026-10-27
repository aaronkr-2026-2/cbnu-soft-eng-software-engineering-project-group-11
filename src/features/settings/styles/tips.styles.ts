import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createTipsStyles = (colors: ThemeColors) => StyleSheet.create({
  intro: { alignItems: 'center', paddingHorizontal: 12, marginTop: 12, marginBottom: 28 },
  heart: { marginBottom: 16 },
  heading: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.secondaryText, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 76, paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 20, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginBottom: 12,
  },
  pressed: { opacity: 0.6 },
  icon: { width: 30, alignItems: 'center' },
  copy: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  detail: { color: colors.secondaryText, fontSize: 13, marginTop: 3 },
  price: { fontSize: 16, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 20 },
  footer: { color: colors.secondaryText, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 12 },
  appreciation: { color: colors.secondaryText, fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 12, marginBottom: 32 },
  status: { color: colors.secondaryText, fontSize: 14, textAlign: 'center', marginVertical: 8 },
  retry: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  retryText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
