import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemedStyles, type ThemeColors, radii, typography } from '../../constants/theme';

type PrimaryButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress, disabled = false }: PrimaryButtonProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  disabled: { opacity: 0.45 },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  label: { color: colors.background, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
});
