import { Pressable, Text } from 'react-native';

import { useThemedStyles } from '../../constants/theme';
import { createIconButtonStyles } from './styles/icon-button.styles';

type IconButtonProps = {
  accessibilityLabel: string;
  circular?: boolean;
  icon: string;
  onPress: () => void;
};

export function IconButton({ accessibilityLabel, circular = false, icon, onPress }: IconButtonProps) {
  const styles = useThemedStyles(createIconButtonStyles);

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
