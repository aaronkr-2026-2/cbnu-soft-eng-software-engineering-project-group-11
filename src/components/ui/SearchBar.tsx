import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme, useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../constants/theme';

type SearchBarProps = {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchBar({ onChangeText, placeholder, value }: SearchBarProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⌕</Text>
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 44,
    paddingHorizontal: 12,
  },
  icon: {
    color: colors.secondaryText,
    fontSize: 23,
    lineHeight: 23,
    marginRight: spacing.sm,
    transform: [{ rotate: '-20deg' }],
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.size.body,
    height: '100%',
    padding: 0,
  },
});
