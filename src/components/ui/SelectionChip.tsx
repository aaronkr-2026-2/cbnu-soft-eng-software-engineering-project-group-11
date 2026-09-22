import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radii, typography } from '../../constants/theme';

type SelectionChipProps = { label: string; onPress: () => void; selected: boolean };

export function SelectionChip({ label, onPress, selected }: SelectionChipProps) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}><Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, minWidth: 48, paddingHorizontal: 12, paddingVertical: 10 },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  label: { color: colors.text, fontSize: typography.size.small, fontWeight: typography.weight.semibold },
  selectedLabel: { color: colors.background },
});
