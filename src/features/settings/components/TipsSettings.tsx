import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useThemedStyles, useTheme } from '../../../constants/theme';
import type { TranslationKey } from '../../../i18n/translations';
import { useTranslation } from '../../../i18n/useTranslation';
import { TipService, tipKinds, type TipKind } from '../services/TipService';
import { createTipsStyles } from '../styles/tips.styles';
import { SettingsPage } from './SettingsPage';

const tips: Record<TipKind, { symbol: SFSymbol; glyph: string; color: string; name: TranslationKey; detail: TranslationKey }> = {
  coffee: { symbol: 'cup.and.saucer.fill', glyph: '☕', color: '#C7782A', name: 'tipCoffee', detail: 'tipCoffeeBody' },
  lunch: { symbol: 'takeoutbag.and.cup.and.straw.fill', glyph: '🍱', color: '#E2401F', name: 'tipLunch', detail: 'tipLunchBody' },
  dinner: { symbol: 'fork.knife', glyph: '🍽', color: '#C4318F', name: 'tipDinner', detail: 'tipDinnerBody' },
  sponsor: { symbol: 'crown.fill', glyph: '♛', color: '#D99A00', name: 'tipSponsor', detail: 'tipSponsorBody' },
};

/** Optional tips. Prices come from the App Store; a missing price means that tip cannot be bought right now. */
export function TipsSettings() {
  const styles = useThemedStyles(createTipsStyles);
  const colors = useTheme();
  const { t } = useTranslation();
  const [prices, setPrices] = useState<Partial<Record<TipKind, string>> | null>(null);
  const [buying, setBuying] = useState<TipKind | null>(null);

  const load = useCallback(() => {
    let current = true;
    TipService.prices()
      .then(result => { if (current) setPrices(result); })
      .catch(() => { if (current) setPrices({}); });
    return () => { current = false; };
  }, []);
  useEffect(() => load(), [load]);

  async function buy(kind: TipKind) {
    if (buying) return;
    setBuying(kind);
    try {
      const result = await TipService.purchase(kind);
      if (result === 'success') Alert.alert(t('tipThanksTitle'), t('tipThanksBody'));
      else if (result === 'pending') Alert.alert(t('tipHeading'), t('tipPending'));
      else if (result !== 'cancelled') Alert.alert(t('tipHeading'), t(result === 'unavailable' ? 'tipUnavailable' : 'tipFailed'));
    } catch {
      Alert.alert(t('tipHeading'), t('tipFailed'));
    } finally { setBuying(null); }
  }

  const unavailable = prices !== null && Object.keys(prices).length === 0;
  return <SettingsPage title={t('tipTitle')}>
    <View style={styles.intro}>
      <SymbolView name="heart.fill" size={44} tintColor="#E5484D" style={styles.heart} fallback={<Text style={[styles.heart, { fontSize: 40, color: '#E5484D' }]}>♥</Text>} />
      <Text accessibilityRole="header" style={styles.heading}>{t('tipHeading')}</Text>
      <Text style={styles.body}>{t('tipIntro')}</Text>
    </View>

    {tipKinds.map(kind => {
      const tip = tips[kind];
      const price = prices?.[kind];
      const disabled = !price || buying !== null;
      return <Pressable key={kind} accessibilityRole="button" accessibilityLabel={`${t(tip.name)}, ${price ?? ''}`}
        accessibilityHint={t(tip.detail)} accessibilityState={{ disabled, busy: buying === kind }} disabled={disabled}
        onPress={() => { void buy(kind); }} style={({ pressed }) => [styles.tip, (pressed || (buying !== null && buying !== kind)) && styles.pressed]}>
        <View style={styles.icon}>
          <SymbolView name={tip.symbol} size={26} tintColor={tip.color} fallback={<Text style={{ fontSize: 24, color: tip.color }}>{tip.glyph}</Text>} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{t(tip.name)}</Text>
          <Text style={styles.detail}>{t(tip.detail)}</Text>
        </View>
        {buying === kind || prices === null ? <ActivityIndicator color={colors.secondaryText} />
          : <Text style={[styles.price, { color: price ? tip.color : colors.secondaryText }]}>{price ?? '—'}</Text>}
      </Pressable>;
    })}

    {unavailable && <>
      <Text style={styles.status}>{t('tipUnavailable')}</Text>
      <Pressable accessibilityRole="button" onPress={() => { setPrices(null); load(); }} style={styles.retry}><Text style={styles.retryText}>{t('tipRetry')}</Text></Pressable>
    </>}

    <View style={styles.divider} />
    <Text style={styles.footer}>{t('tipFooter')}</Text>
    <Text style={styles.appreciation}>{t('tipAppreciation')}</Text>
  </SettingsPage>;
}
