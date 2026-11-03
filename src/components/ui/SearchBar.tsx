import { Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme, useThemedStyles } from '../../constants/theme';
import { createSearchBarStyles } from './styles/search-bar.styles';

type SearchBarProps = {
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

export function SearchBar({ onChangeText, placeholder, value }: SearchBarProps) {
  const styles = useThemedStyles(createSearchBarStyles);
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <SymbolView name="magnifyingglass" size={17} weight="medium" tintColor={colors.secondaryText} style={styles.icon}
        fallback={<Text style={styles.iconGlyph}>⌕</Text>} />
      <TextInput
        accessibilityLabel={placeholder}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={styles.input}
        value={value}
      />
    </View>
  );
}
