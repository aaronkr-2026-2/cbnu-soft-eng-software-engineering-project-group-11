import { Pressable, Text } from 'react-native';

import { useThemedStyles } from '../../constants/theme';
import { createFilterChipStyles } from './styles/filter-chip.styles';

type FilterChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
};

export function FilterChip({ label, onPress, selected }: FilterChipProps) {
  const styles = useThemedStyles(createFilterChipStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text numberOfLines={1} style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}
