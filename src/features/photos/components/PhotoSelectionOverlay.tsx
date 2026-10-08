import { StyleSheet, Text, View } from 'react-native';

export function PhotoSelectionOverlay({ selected }: { selected: boolean }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, selected && styles.selected]}>
    <View style={[styles.circle, selected && styles.checked]}>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { borderRadius: 8 }, selected: { backgroundColor: 'rgba(0,0,0,0.06)' },
  circle: { position: 'absolute', right: 8, bottom: 8, width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 2 },
  checked: { backgroundColor: '#FFFFFF' }, check: { color: '#111111', fontSize: 15, fontWeight: '700' },
});
