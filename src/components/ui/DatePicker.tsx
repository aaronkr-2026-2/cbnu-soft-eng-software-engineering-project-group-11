import { useTranslation } from '../../i18n/useTranslation';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../constants/theme';
import { daysInMonth, formatPhotoDate, parsePhotoDate, toPhotoDate } from '../../features/photos/utils/photoDate';
import { Wheel } from './MonthYearPicker';
import { createMonthYearPickerStyles, itemHeight } from './styles/month-year-picker.styles';

type DatePickerProps = { onCancel: () => void; onConfirm: (value: string) => void; value: string; visible: boolean };

const firstYear = 1950;
const years = Array.from({ length: 151 }, (_, index) => firstYear + index);

export function DatePicker({ onCancel, onConfirm, value, visible }: DatePickerProps) {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createMonthYearPickerStyles);
  const months = Array.from({ length: 12 }, (_, index) => new Date(2026, index, 1).toLocaleDateString(language, { month: 'short' }));
  const parsed = parsePhotoDate(value);
  const [day, setDay] = useState(parsed.day);
  const [month, setMonth] = useState(parsed.month);
  const [year, setYear] = useState(parsed.year);
  const dayRef = useRef<FlatList<number>>(null);
  const monthRef = useRef<FlatList<string>>(null);
  const yearRef = useRef<FlatList<number>>(null);
  const dayCount = daysInMonth(year, month);
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const safeDay = Math.min(day, dayCount);

  useEffect(() => {
    if (!visible) return;
    const next = parsePhotoDate(value);
    setDay(next.day); setMonth(next.month); setYear(next.year);
    requestAnimationFrame(() => {
      dayRef.current?.scrollToOffset({ offset: (next.day - 1) * itemHeight, animated: false });
      monthRef.current?.scrollToOffset({ offset: (next.month - 1) * itemHeight, animated: false });
      yearRef.current?.scrollToOffset({ offset: (next.year - firstYear) * itemHeight, animated: false });
    });
  }, [value, visible]);

  return <Modal animationType="slide" onRequestClose={onCancel} transparent visible={visible}><View style={styles.backdrop}><View style={styles.sheet}>
    <View style={styles.drag} />
    <View style={styles.top}>
      <Pressable onPress={onCancel}><Text style={styles.action}>{t('cancel')}</Text></Pressable>
      <Text style={styles.title}>{t('selectDate')}</Text>
      <Pressable onPress={() => onConfirm(toPhotoDate(year, month, safeDay))}><Text style={styles.done}>{t('done')}</Text></Pressable>
    </View>
    <View style={styles.wheels}>
      <Wheel data={days} getLabel={String} listRef={dayRef} onIndexChange={(index) => setDay(days[Math.min(index, days.length - 1)])} selectedIndex={safeDay - 1} />
      <Wheel data={months} getLabel={(item) => item} listRef={monthRef} onIndexChange={(index) => setMonth(index + 1)} selectedIndex={month - 1} />
      <Wheel data={years} getLabel={String} listRef={yearRef} onIndexChange={(index) => setYear(years[index])} selectedIndex={year - firstYear} />
    </View>
    <Text style={styles.preview}>{formatPhotoDate(toPhotoDate(year, month, safeDay), language)}</Text>
  </View></View></Modal>;
}
