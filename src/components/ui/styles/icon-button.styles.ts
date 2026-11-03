import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createIconButtonStyles = (colors: ThemeColors) => StyleSheet.create({
  button: { alignItems: 'center', height: 24, justifyContent: 'center', width: 24 },
  circular: { backgroundColor: colors.surface, borderRadius: 22, height: 44, width: 44 },
  icon: { color: colors.text, fontSize: 17 },
});
