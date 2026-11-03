import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';

type CardProps = {
  accessibilityLabel?: string;
  children: ReactNode;
  onPress?: () => void;
  pressedStyle?: StyleProp<ViewStyle>;
  style: StyleProp<ViewStyle>;
};

export function Card({ accessibilityLabel, children, onPress, pressedStyle, style }: CardProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && onPress ? pressedStyle : undefined]}
    >
      {children}
    </Pressable>
  );
}
