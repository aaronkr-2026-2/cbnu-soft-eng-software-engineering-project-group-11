import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme, useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { RollLocation } from '../../rolls/types';
import { locationService, locationLabel } from '../services/locationService';
import { createLocationPickerStyles } from '../styles/location-picker.styles';
export function LocationSearch({ onSelect }: { onSelect: (location: RollLocation) => void }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useThemedStyles(createLocationPickerStyles);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RollLocation[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  async function search() {
    if (!query.trim()) return;
    Keyboard.dismiss();
    const id = ++request.current;
    setStatus('loading'); setResults([]);
    try {
      const found = await locationService.search(query);
      if (id !== request.current) return;
      setResults(found); setStatus(found.length ? 'idle' : 'empty');
    } catch { if (id === request.current) setStatus('error'); }
  }
  return <View><View style={styles.searchRow}>
    <TextInput accessibilityLabel={t('searchLocation')} placeholder={t('searchLocation')} placeholderTextColor={colors.secondaryText} value={query} onChangeText={(value) => { request.current++; setQuery(value); setResults([]); setStatus('idle'); }} onSubmitEditing={search} returnKeyType="search" style={styles.input} />
    <Pressable accessibilityRole="button" disabled={status === 'loading' || !query.trim()} style={styles.searchButton} onPress={search}><Text style={styles.text}>{t('searchAction')}</Text></Pressable>
  </View>
    {status !== 'idle' ? <Text accessibilityLiveRegion="polite" style={styles.secondary}>{t(status === 'loading' ? 'locationSearching' : status === 'empty' ? 'noLocations' : 'locationSearchUnavailable')}</Text> : null}
    <ScrollView keyboardShouldPersistTaps="handled" style={styles.results}>{results.map((result) => <Pressable accessibilityRole="button" key={`${result.latitude},${result.longitude}`} style={styles.result} onPress={() => { request.current++; setResults([]); onSelect(result); }}><Text style={styles.text}>{locationLabel(result)}</Text><Text style={styles.secondary}>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</Text></Pressable>)}</ScrollView>
  </View>;
}
