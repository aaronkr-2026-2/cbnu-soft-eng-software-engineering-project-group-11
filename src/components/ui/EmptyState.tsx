import { Text, View } from 'react-native';

import { useThemedStyles } from '../../constants/theme';
import { createEmptyStateStyles } from './styles/empty-state.styles';

type EmptyStateProps = {
  description: string;
  title: string;
};

export function EmptyState({ description, title }: EmptyStateProps) {
  const styles = useThemedStyles(createEmptyStateStyles);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}
