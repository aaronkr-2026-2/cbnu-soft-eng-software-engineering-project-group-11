import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../constants/theme';

type SearchBarProps = {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchBar({ onChangeText, placeholder, value }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⌕</Text>
      <TextInput
        accessibilityLabel="Search your film archive"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.secondaryText}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
