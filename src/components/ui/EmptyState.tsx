import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../constants/theme';

type EmptyStateProps = {
  description: string;
  title: string;
};

export function EmptyState({ description, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 36,
  },
  title: { color: colors.text, fontSize: typography.size.label, fontWeight: typography.weight.semibold },
  description: { color: colors.secondaryText, fontSize: 13, marginTop: spacing.xs },
});
