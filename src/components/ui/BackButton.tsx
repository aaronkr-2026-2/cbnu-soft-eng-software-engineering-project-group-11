import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme, useThemedStyles } from '../../constants/theme';
import { useTranslation } from '../../i18n/useTranslation';
import { createBackButtonStyles } from './styles/back-button.styles';

type BackButtonProps = {
  accessibilityLabel?: string;
  onPress: () => void;
  /** 'dark' keeps the button dark on screens that are always black, such as the photo viewer. */
  tone?: 'theme' | 'dark';
};

export function BackButton({ accessibilityLabel, onPress, tone = 'theme' }: BackButtonProps) {
  const styles = useThemedStyles(createBackButtonStyles);
  const colors = useTheme();
  const { t } = useTranslation();
  const dark = tone === 'dark';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? t('back')}
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, dark && styles.darkButton, pressed && styles.pressed]}
    >
      <SymbolView name="chevron.left" size={15} weight="semibold" tintColor={dark ? '#FFFFFF' : colors.text}
        fallback={<View style={[styles.chevron, dark && styles.darkChevron]} />} />
    </Pressable>
  );
}
