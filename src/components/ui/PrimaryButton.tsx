import { Pressable, Text } from 'react-native';

import { useThemedStyles } from '../../constants/theme';
import { createPrimaryButtonStyles } from './styles/primary-button.styles';

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  const styles = useThemedStyles(createPrimaryButtonStyles);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}
