import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../../constants/theme';

type IconButtonProps = {
  accessibilityLabel: string;
  circular?: boolean;
  icon: string;
  onPress: () => void;
};

export function IconButton({ accessibilityLabel, circular = false, icon, onPress }: IconButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, circular && styles.circular]}
    >
      <Text style={styles.icon}>{icon}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  circular: { backgroundColor: colors.surface, borderRadius: 22, height: 44, width: 44 },
  icon: { color: colors.text, fontSize: 17 },
});
