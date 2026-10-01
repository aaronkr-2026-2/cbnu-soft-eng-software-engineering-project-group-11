import { useTranslation } from '../../i18n/useTranslation';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../constants/theme';
import { formatRollMonth, parseRollMonth, toRollMonth } from '../../features/rolls/utils/rollMonth';
import { createMonthYearPickerStyles, itemHeight } from './styles/month-year-picker.styles';

type MonthYearPickerProps = { onCancel: () => void; onConfirm: (value: string) => void; value: string; visible: boolean };

const years = Array.from({ length: 151 }, (_, index) => 1950 + index);

export function MonthYearPicker({ onCancel, onConfirm, value, visible }: MonthYearPickerProps) {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createMonthYearPickerStyles);

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

export function Wheel<T>({ data, getLabel, listRef, onIndexChange, selectedIndex }: { data: T[]; getLabel: (item: T) => string; listRef: React.RefObject<FlatList<T> | null>; onIndexChange: (index: number) => void; selectedIndex: number }) {
  const styles = useThemedStyles(createMonthYearPickerStyles);

  return <View style={styles.wheel}><View pointerEvents="none" style={styles.selection} /><FlatList contentContainerStyle={styles.wheelPadding} ref={listRef} data={data} getItemLayout={(_, index) => ({ index, length: itemHeight, offset: itemHeight * index })} initialScrollIndex={selectedIndex} keyExtractor={(_, index) => String(index)} onMomentumScrollEnd={(event) => onIndexChange(Math.round(event.nativeEvent.contentOffset.y / itemHeight))} renderItem={({ item, index }) => <View style={styles.row}><Text style={[styles.rowText, index === selectedIndex && styles.selectedText]}>{getLabel(item)}</Text></View>} showsVerticalScrollIndicator={false} snapToInterval={itemHeight} decelerationRate="fast" /></View>;
}
