import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createScreenStyles = (colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, backgroundColor: colors.background },
});
