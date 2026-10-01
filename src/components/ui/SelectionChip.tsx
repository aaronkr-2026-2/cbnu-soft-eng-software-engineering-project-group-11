import { Pressable, Text } from 'react-native';
import { useThemedStyles } from '../../constants/theme';
import { createSelectionChipStyles } from './styles/selection-chip.styles';

type SelectionChipProps = { label: string; onPress: () => void; selected: boolean };

export function SelectionChip({ label, onPress, selected }: SelectionChipProps) {
  const styles = useThemedStyles(createSelectionChipStyles);

  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.selected]}><Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text></Pressable>;
}
