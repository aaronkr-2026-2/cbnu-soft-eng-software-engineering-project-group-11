import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

import { type ThemeColors, useThemedStyles } from '../../constants/theme';

type Props = { message: string; duration?: number };
const fadeDuration = 150;

/** A temporary confirmation overlay that lets every touch pass through. */
export function Toast({ message, duration = 1800 }: Props) {
  const styles = useThemedStyles(createStyles);
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    opacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: fadeDuration, useNativeDriver: true }),
      Animated.delay(Math.max(0, duration - fadeDuration * 2)),
      Animated.timing(opacity, { toValue: 0, duration: fadeDuration, useNativeDriver: true }),
    ]);
    animation.start(({ finished }) => { if (finished) setVisible(false); });
    return () => animation.stop();
  }, [message, duration, opacity]);

  if (!visible) return null;
  return <Animated.View pointerEvents="none" style={[styles.container, { opacity }]}>
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
  </Animated.View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    position: 'absolute', bottom: 20, left: 24, right: 24,
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  message: { color: colors.text, fontSize: 13, lineHeight: 18, textAlign: 'center' },
});
