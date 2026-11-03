import { StyleSheet, View } from 'react-native';

/** Small vector-like strokes; no raster assets or additional native dependency. */
export function PhotoSelectionIcon({ name, color }: { name: 'download' | 'share' | 'trash' | 'close'; color: string }) {
  const line = { backgroundColor: color };
  return <View pointerEvents="none" accessible={false} style={styles.icon}>
    {name === 'close' ? <>
      <View style={[styles.cross, line, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.cross, line, { transform: [{ rotate: '-45deg' }] }]} />
    </> : name === 'trash' ? <>
      <View style={[styles.lid, line]} /><View style={[styles.handle, { borderColor: color }]} />
      <View style={[styles.bin, { borderColor: color }]} />
      <View style={[styles.slit, line, { left: 9 }]} /><View style={[styles.slit, line, { left: 14 }]} />
    </> : <>
      <View style={[styles.tray, { borderColor: color }]} />
      <View style={[styles.stem, line]} />
      <View style={[styles.arrow, line, { left: 6, top: name === 'share' ? 4 : 12,
        transform: [{ rotate: name === 'share' ? '-45deg' : '45deg' }] }]} />
      <View style={[styles.arrow, line, { left: 11, top: name === 'share' ? 4 : 12,
        transform: [{ rotate: name === 'share' ? '45deg' : '-45deg' }] }]} />
    </>}
  </View>;
}

const styles = StyleSheet.create({
  icon: { width: 24, height: 24 },
  cross: { position: 'absolute', left: 3, top: 11, width: 18, height: 2, borderRadius: 1 },
  tray: { position: 'absolute', left: 4, top: 10, width: 16, height: 12, borderWidth: 1.8, borderTopWidth: 0, borderRadius: 2 },
  stem: { position: 'absolute', left: 11, top: 2, width: 2, height: 13, borderRadius: 1 },
  arrow: { position: 'absolute', width: 7, height: 2, borderRadius: 1 },
  lid: { position: 'absolute', left: 3, top: 6, width: 18, height: 2, borderRadius: 1 },
  handle: { position: 'absolute', left: 8, top: 2, width: 8, height: 5, borderWidth: 1.8, borderBottomWidth: 0, borderRadius: 2 },
  bin: { position: 'absolute', left: 5, top: 9, width: 14, height: 13, borderWidth: 1.8, borderTopWidth: 0, borderRadius: 2 },
  slit: { position: 'absolute', top: 11, width: 1.5, height: 8, borderRadius: 1 },
});
