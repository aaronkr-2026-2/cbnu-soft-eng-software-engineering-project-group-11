import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, typography } from '../../constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
};

export function PrimaryButton({ label, onPress }: PrimaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    justifyContent: 'center',
    paddingVertical: 15,
  },
  label: { color: colors.background, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
});
