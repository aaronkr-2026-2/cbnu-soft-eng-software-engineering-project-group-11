import { Text, TextInput, View } from 'react-native';

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
