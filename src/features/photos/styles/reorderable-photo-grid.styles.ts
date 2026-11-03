import { StyleSheet } from 'react-native';
import { type ThemeColors, spacing } from '../../../constants/theme';

export const gridGap = spacing.sm;

export const createReorderablePhotoGridStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { marginTop: 12 },
  tile: { position: 'absolute', left: 0, top: 0, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  // Shadow shown while a photo is lifted; its opacity is animated in the component.
  lifted: { shadowColor: '#000', shadowOpacity: 0, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
  image: { width: '100%', height: '100%', borderRadius: 8 },
  hint: { color: colors.secondaryText, fontSize: 12, marginTop: 8 },
  addTile: { position: 'absolute', borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderColor: colors.border, borderStyle: 'dashed', borderWidth: 1.5 },
  addTilePressed: { backgroundColor: colors.border },
  addIcon: { color: colors.secondaryText, fontSize: 34, fontWeight: '300' },
});
