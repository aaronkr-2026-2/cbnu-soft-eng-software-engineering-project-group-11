import { Pressable, Text } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';

import { useTheme, useThemedStyles } from '../../constants/theme';
import { createIconButtonStyles } from './styles/icon-button.styles';

type IconButtonProps = {
  accessibilityLabel: string;
  circular?: boolean;
  icon: string;
  /** SF Symbol shown on iOS; `icon` remains the fallback glyph elsewhere. */
  symbol?: SFSymbol;
  onPress: () => void;
};

export function IconButton({ accessibilityLabel, circular = false, icon, symbol, onPress }: IconButtonProps) {
  const styles = useThemedStyles(createIconButtonStyles);
  const colors = useTheme();
  const glyph = <Text style={styles.icon}>{icon}</Text>;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={[styles.button, circular && styles.circular]}
    >
      {symbol ? <SymbolView name={symbol} size={20} weight="medium" tintColor={colors.text} fallback={glyph} /> : glyph}
    </Pressable>
  );
}
