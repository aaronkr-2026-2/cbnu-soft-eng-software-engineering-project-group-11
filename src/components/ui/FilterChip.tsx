import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, typography } from '../../constants/theme';

type FilterChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function FilterChip({ label, onPress, selected }: FilterChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  selected: { backgroundColor: colors.text, borderColor: colors.text },
  label: { color: colors.secondaryText, fontSize: typography.size.small, fontWeight: typography.weight.medium },
  selectedLabel: { color: colors.background },
});
