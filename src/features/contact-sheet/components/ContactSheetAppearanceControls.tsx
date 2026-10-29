import { ContactSheetColorSliders } from './ContactSheetColorSliders';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import { useThemedStyles, useTheme } from '../../../constants/theme';
import { createContactSheetStyles } from '../styles/contact-sheet.styles';
import { contactSheetBackgroundColor, contactSheetBackgrounds, contactSheetFrameStyles, normalizeContactSheetHex, type ContactSheetAppearance, type ContactSheetBackground, type ContactSheetFrameStyle } from '../utils/contactSheetAppearance';

const backgroundLabels: Record<ContactSheetBackground, TranslationKey> = {
  black: 'csBlack', white: 'csWhite', cream: 'csCream', gray: 'csGray', kraft: 'csKraft', slate: 'csSlate', darkroom: 'csDarkroom', custom: 'csCustom',
};
const frameLabels: Record<ContactSheetFrameStyle, TranslationKey> = {
  none: 'csNone', 'white-border': 'csWhiteBorder', 'black-border': 'csBlackBorder', 'film-strip': 'csFilmStrip', 'film-strip-dark': 'csFilmStripDark', instant: 'csInstant', 'warm-print': 'csWarmPrint',
  'color-negative': 'csColorNegative', 'bw-negative': 'csBwNegative', 'medium-format': 'csMediumFormat', 'classic-sprocket': 'csClassicSprocket',
};
export function ContactSheetAppearanceControls({ appearance, disabled, hexValue, onHexChange, onChange }: {
  appearance: ContactSheetAppearance; disabled: boolean; hexValue: string;
  onHexChange: (value: string) => void; onChange: (patch: Partial<ContactSheetAppearance>) => void;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createContactSheetStyles);
  const colors = useTheme();
  return <View style={styles.appearance}>
    <Text accessibilityRole="header" style={styles.appearanceLabel}>{t('csBackground')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
      {contactSheetBackgrounds.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(backgroundLabels[value])}
        accessibilityState={{ checked: appearance.background === value, disabled }} disabled={disabled}
        onPress={() => onChange({ background: value })} style={[styles.option, styles.swatchOption, appearance.background === value && styles.optionSelected, disabled && styles.disabled]}>
        <View style={[styles.swatch, { backgroundColor: contactSheetBackgroundColor({ ...appearance, background: value }) }]} />
        <Text style={styles.optionText}>{t(backgroundLabels[value])}</Text>
      </Pressable>)}
    </ScrollView>
    <Text accessibilityRole="header" style={styles.appearanceLabel}>{t('csFrame')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
      {contactSheetFrameStyles.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(frameLabels[value])}
        accessibilityState={{ checked: appearance.frameStyle === value, disabled }} disabled={disabled}
        onPress={() => onChange({ frameStyle: value })} style={[styles.option, appearance.frameStyle === value && styles.optionSelected, disabled && styles.disabled]}>
        <Text style={styles.optionText}>{t(frameLabels[value])}</Text>
      </Pressable>)}
    </ScrollView>
    {appearance.background === 'custom' && <>
      <ContactSheetColorSliders key={appearance.customColor} color={appearance.customColor} disabled={disabled} onCommit={onHexChange} />
      <TextInput accessibilityLabel={t('csHex')} editable={!disabled} value={hexValue} onChangeText={onHexChange}
        autoCapitalize="characters" autoCorrect={false} maxLength={7} placeholder="#242424" placeholderTextColor={colors.secondaryText} style={styles.hexInput} />
      {!normalizeContactSheetHex(hexValue) && <Text accessibilityRole="alert" style={styles.hexError}>{t('csHexInvalid')}</Text>}
    </>}
  </View>;
}
