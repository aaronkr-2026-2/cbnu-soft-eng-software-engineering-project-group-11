import { useTranslation } from '../../i18n/useTranslation';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type ThemeColors, radii, spacing, typography } from '../../constants/theme';
import { formatRollMonth, parseRollMonth, toRollMonth } from '../../features/rolls/utils/rollMonth';

type MonthYearPickerProps = { onCancel: () => void; onConfirm: (value: string) => void; value: string; visible: boolean };

const years = Array.from({ length: 151 }, (_, index) => 1950 + index);
const itemHeight = 38;

export function MonthYearPicker({ onCancel, onConfirm, value, visible }: MonthYearPickerProps) {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const months = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleDateString(language, { month: 'short' }));
  const parsed = parseRollMonth(value);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const monthRef = useRef<FlatList<string>>(null);
  const yearRef = useRef<FlatList<number>>(null);

  useEffect(() => { if (visible) { const next = parseRollMonth(value); setMonth(next.month); setYear(next.year); requestAnimationFrame(() => { monthRef.current?.scrollToOffset({ offset: (next.month - 1) * itemHeight, animated: false }); yearRef.current?.scrollToOffset({ offset: (next.year - 1950) * itemHeight, animated: false }); }); } }, [value, visible]);

  return <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}><View style={styles.backdrop}><View style={styles.sheet}>
    <View style={styles.drag} /><View style={styles.top}><Pressable onPress={onCancel}><Text style={styles.action}>{t('cancel')}</Text></Pressable><Text style={styles.title}>{t('selectMonth')}</Text><Pressable onPress={() => onConfirm(toRollMonth(year, month))}><Text style={styles.done}>{t('done')}</Text></Pressable></View>
    <View style={styles.wheels}><Wheel data={months} getLabel={(item) => item} listRef={monthRef} onIndexChange={(index) => setMonth(index + 1)} selectedIndex={month - 1} /><Wheel data={years} getLabel={(item) => String(item)} listRef={yearRef} onIndexChange={(index) => setYear(years[index])} selectedIndex={year - 1950} /></View>
    <Text style={styles.preview}>{formatRollMonth(toRollMonth(year, month), language)}</Text>
  </View></View></Modal>;
}

function Wheel<T>({ data, getLabel, listRef, onIndexChange, selectedIndex }: { data: T[]; getLabel: (item: T) => string; listRef: React.RefObject<FlatList<T> | null>; onIndexChange: (index: number) => void; selectedIndex: number }) {
  const styles = useThemedStyles(createStyles);

  return <View style={styles.wheel}><View pointerEvents="none" style={styles.selection} /><FlatList contentContainerStyle={styles.wheelPadding} ref={listRef} data={data} getItemLayout={(_, index) => ({ index, length: itemHeight, offset: itemHeight * index })} initialScrollIndex={selectedIndex} keyExtractor={(_, index) => String(index)} onMomentumScrollEnd={(event) => onIndexChange(Math.round(event.nativeEvent.contentOffset.y / itemHeight))} renderItem={({ item, index }) => <View style={styles.row}><Text style={[styles.rowText, index === selectedIndex && styles.selectedText]}>{getLabel(item)}</Text></View>} showsVerticalScrollIndicator={false} snapToInterval={itemHeight} decelerationRate="fast" /></View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  backdrop: { backgroundColor: colors.backdrop, flex: 1, justifyContent: 'flex-end' }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: spacing.lg }, drag: { alignSelf: 'center', backgroundColor: colors.border, borderRadius: radii.pill, height: 4, marginTop: spacing.sm, width: 38 }, top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', padding: spacing.md }, action: { color: colors.secondaryText, fontSize: typography.size.body }, done: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, title: { color: colors.text, fontSize: typography.size.body, fontWeight: typography.weight.semibold }, wheels: { flexDirection: 'row', height: itemHeight * 5, paddingHorizontal: spacing.xl }, wheel: { flex: 1, overflow: 'hidden' }, selection: { backgroundColor: colors.surface, borderRadius: radii.md, height: itemHeight, left: 0, position: 'absolute', right: 0, top: itemHeight * 2, zIndex: -1 }, row: { alignItems: 'center', height: itemHeight, justifyContent: 'center' }, rowText: { color: colors.secondaryText, fontSize: typography.size.label }, selectedText: { color: colors.text, fontWeight: typography.weight.semibold }, preview: { color: colors.secondaryText, fontSize: typography.size.small, marginTop: spacing.md, textAlign: 'center' },
  wheelPadding: { paddingVertical: itemHeight * 2 },
});
