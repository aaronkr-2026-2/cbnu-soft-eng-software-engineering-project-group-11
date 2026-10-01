import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createBackButtonStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  darkButton: { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' },
  pressed: { opacity: 0.7 },
  chevron: {
    borderBottomWidth: 2.5,
    borderColor: colors.text,
    borderLeftWidth: 2.5,
    borderRadius: 1,
    height: 13,
    marginLeft: 5,
    transform: [{ rotate: '45deg' }],
    width: 13,
  },
  darkChevron: { borderColor: '#FFFFFF' },
});
