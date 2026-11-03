import { StyleSheet } from 'react-native';

// Lives inside the always-black photo viewer, so its colors are fixed rather than themed.
export const photoInfoSheetStyles = StyleSheet.create({
  sheet: {
    backgroundColor: '#1C1C1E',
    borderRadius: 34,
    marginHorizontal: 8,
    paddingBottom: 20,
    paddingHorizontal: 14,
  },
  handleArea: { alignItems: 'center', paddingBottom: 14, paddingTop: 10 },
  handle: { backgroundColor: '#5A5A5E', borderRadius: 3, height: 5, width: 40 },
  card: { backgroundColor: '#2C2C2E', borderRadius: 24, paddingHorizontal: 18 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 12, minHeight: 64 },
  divider: { backgroundColor: '#3A3A3C', height: StyleSheet.hairlineWidth },
  label: { color: '#FFFFFF', fontSize: 17 },
  valuePill: { backgroundColor: '#3A3A3C', borderRadius: 20, flexShrink: 1, paddingHorizontal: 14, paddingVertical: 8 },
  value: { color: '#FFFFFF', fontSize: 16 },
  placeholderValue: { color: '#8E8E93', fontSize: 15 },
  pressed: { opacity: 0.6 },
  noteLabel: { color: '#8E8E93', fontSize: 17, marginTop: 16 },
  noteInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 18,
    marginTop: 12,
    minHeight: 96,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  error: {
    color: '#FF453A',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
    marginTop: -8,
  },
});
