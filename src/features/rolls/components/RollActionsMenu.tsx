import { useState } from 'react';
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { type ThemeColors, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';

type Props = { onSelect: () => void; onEdit: () => void; onExport: () => void; onDelete: () => void };

export function RollActionsMenu({ onSelect, onEdit, onExport, onDelete }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [visible, setVisible] = useState(false);
  function confirmDelete() {
    Alert.alert(t('deleteRoll'), t('deleteRollConfirm'), [
      { text: t('cancel'), style: 'cancel' }, { text: t('deleteRoll'), style: 'destructive', onPress: onDelete },
    ]);
  }
  const actions = [
    { label: t('selectPhotos'), run: onSelect },
    { label: t('editRoll'), run: onEdit },
    { label: t('exportContactSheet'), run: onExport },
    { label: t('deleteRoll'), run: confirmDelete, destructive: true },
  ];
  function open() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options: [...actions.map(action => action.label), t('cancel')],
        destructiveButtonIndex: 3, cancelButtonIndex: 4 }, index => { actions[index]?.run(); });
    } else setVisible(true);
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t('more')} onPress={open} style={styles.more}>
      <Text style={styles.dots}>•••</Text>
    </Pressable>
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel={t('cancel')} accessibilityRole="button" style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
        <View accessibilityViewIsModal style={styles.sheet}>
          {actions.map(action => <Pressable key={action.label} accessibilityRole="button" style={styles.row}
            onPress={() => { setVisible(false); action.run(); }}>
            <Text style={[styles.label, action.destructive && styles.destructive]}>{action.label}</Text>
          </Pressable>)}
          <Pressable accessibilityRole="button" style={styles.row} onPress={() => setVisible(false)}><Text style={styles.label}>{t('cancel')}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  more: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  dots: { color: colors.text, fontSize: 20, letterSpacing: 2 },
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: 'flex-end' },
  sheet: { paddingHorizontal: 24, paddingBottom: 32, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background },
  row: { minHeight: 56, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.text, fontSize: 17 }, destructive: { color: colors.destructive },
});
