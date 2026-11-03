import { StyleSheet } from 'react-native';
import { type ThemeColors } from '../../../constants/theme';

export const createBackButtonStyles = (colors: ThemeColors) => StyleSheet.create({
  button: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  darkButton: { backgroundColor: '#1C1C1E', borderColor: '#2C2C2E' },
  pressed: { opacity: 0.7 },
  chevron: {
    borderBottomWidth: 2,
    borderColor: colors.text,
    borderLeftWidth: 2,
    borderRadius: 1,
    height: 10,
    marginLeft: 4,
    transform: [{ rotate: '45deg' }],
    width: 10,
  },
  darkChevron: { borderColor: '#FFFFFF' },
});
