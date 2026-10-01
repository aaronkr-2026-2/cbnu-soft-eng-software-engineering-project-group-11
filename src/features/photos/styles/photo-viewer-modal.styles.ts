import { StyleSheet } from 'react-native';

// The viewer is always black regardless of the app theme, so its colors are fixed.
const chrome = { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E', borderWidth: StyleSheet.hairlineWidth } as const;

export const photoViewerModalStyles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  stage: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  strip: { ...StyleSheet.absoluteFill },
  slot: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'center' },
  fill: { alignItems: 'center', justifyContent: 'center' },
  toolbar: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 8 },
  circleButton: { ...chrome, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  titlePill: { ...chrome, flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  subtitle: { color: '#AEAEB2', fontSize: 12, marginTop: 1, fontVariant: ['tabular-nums'] },
  unavailable: { color: '#ddd', fontSize: 16 },
  footer: { position: 'absolute', right: 16, bottom: 0 },
  rotateButton: { ...chrome, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, height: 44, borderRadius: 22 },
  pressed: { opacity: 0.7 },
  rotateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rotateIcon: { width: 20, height: 20 },
  rotateFrame: { position: 'absolute', left: 0, bottom: 0, width: 13, height: 13, borderRadius: 2, borderWidth: 1.8, borderColor: '#fff' },
  rotateArrow: { position: 'absolute', right: -2, top: -5, color: '#fff', fontSize: 13, fontWeight: '700' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  sheetLayer: { ...StyleSheet.absoluteFill, justifyContent: 'flex-end' },
  shareIcon: { width: 20, height: 24, alignItems: 'center' },
  shareArrow: { color: '#fff', fontSize: 16, fontWeight: '700', lineHeight: 16 },
  shareBox: { position: 'absolute', bottom: 0, width: 18, height: 13, borderWidth: 1.8, borderTopWidth: 0, borderColor: '#fff', borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
});
