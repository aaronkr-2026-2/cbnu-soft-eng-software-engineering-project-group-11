import { ContactSheetColorSliders } from './ContactSheetColorSliders';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from '../../../i18n/useTranslation';
import type { TranslationKey } from '../../../i18n/translations';
import { useThemedStyles, useTheme } from '../../../constants/theme';
import { createContactSheetStyles } from '../styles/contact-sheet.styles';
import { contactSheetBackgroundColor, contactSheetBackgrounds, contactSheetExportRatios, contactSheetFrameStyles, contactSheetPhotoSizes, normalizeContactSheetHex, type ContactSheetAppearance, type ContactSheetBackground, type ContactSheetExportRatio, type ContactSheetFrameStyle, type ContactSheetPhotoSize } from '../utils/contactSheetAppearance';

const backgroundLabels: Record<ContactSheetBackground, TranslationKey> = {
  black: 'csBlack', white: 'csWhite', cream: 'csCream', gray: 'csGray', kraft: 'csKraft', slate: 'csSlate', darkroom: 'csDarkroom', custom: 'csCustom',
};
const frameLabels: Record<ContactSheetFrameStyle, TranslationKey> = {
  none: 'csNone', 'white-border': 'csWhiteBorder', 'black-border': 'csBlackBorder', 'film-strip': 'csFilmStrip', 'film-strip-dark': 'csFilmStripDark', instant: 'csInstant', 'warm-print': 'csWarmPrint',
  'color-negative': 'csColorNegative', 'bw-negative': 'csBwNegative', 'medium-format': 'csMediumFormat', 'classic-sprocket': 'csClassicSprocket', 'frame-card': 'csFrameCard',
};
const sizeLabels: Record<ContactSheetPhotoSize, TranslationKey> = { small: 'csSizeSmall', medium: 'csSizeMedium', large: 'csSizeLarge' };
const ratioLabels: Record<ContactSheetExportRatio, TranslationKey> = {
  original: 'csRatioOriginal', story: 'csRatioStory', post: 'csRatioPost', square: 'csRatioSquare', landscape: 'csRatioLandscape', wide: 'csRatioWide',
};
export type BackdropChoice = { photos: { id: string; uri?: string }[]; selected: string | null; onSelect: (id: string | null) => void };
export function ContactSheetAppearanceControls({ appearance, disabled, hexValue, onHexChange, onChange, backdrop }: {
  appearance: ContactSheetAppearance; disabled: boolean; hexValue: string;
  onHexChange: (value: string) => void; onChange: (patch: Partial<ContactSheetAppearance>) => void;
  backdrop?: BackdropChoice;
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
    {appearance.frameStyle === 'frame-card' && backdrop ? <>
      <Text accessibilityRole="header" style={styles.appearanceLabel}>{t('csBackdrop')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
        <Pressable accessibilityRole="radio" accessibilityLabel={t('csBackdropNone')} accessibilityState={{ checked: backdrop.selected === null, disabled }} disabled={disabled}
          onPress={() => backdrop.onSelect(null)} style={[styles.option, backdrop.selected === null && styles.optionSelected, disabled && styles.disabled]}>
          <Text style={styles.optionText}>{t('csBackdropNone')}</Text>
        </Pressable>
        {backdrop.photos.map((photo, index) => <Pressable key={photo.id} accessibilityRole="radio" accessibilityLabel={`${t('csBackdrop')} ${index + 1}`}
          accessibilityState={{ checked: backdrop.selected === photo.id, disabled }} disabled={disabled} onPress={() => backdrop.onSelect(photo.id)}
          style={[styles.thumbOption, backdrop.selected === photo.id && styles.optionSelected, disabled && styles.disabled]}>
          {photo.uri ? <Image source={{ uri: photo.uri }} resizeMode="cover" style={styles.thumb} /> : <Text style={styles.optionText}>{index + 1}</Text>}
        </Pressable>)}
      </ScrollView>
    </> : null}
    <Text accessibilityRole="header" style={styles.appearanceLabel}>{t('csPhotoSize')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
      {contactSheetPhotoSizes.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(sizeLabels[value])}
        accessibilityState={{ checked: appearance.photoSize === value, disabled }} disabled={disabled}
        onPress={() => onChange({ photoSize: value })} style={[styles.option, appearance.photoSize === value && styles.optionSelected, disabled && styles.disabled]}>
        <Text style={styles.optionText}>{t(sizeLabels[value])}</Text>
      </Pressable>)}
    </ScrollView>
    <Text accessibilityRole="header" style={styles.appearanceLabel}>{t('csExportRatio')}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
      {contactSheetExportRatios.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(ratioLabels[value])}
        accessibilityState={{ checked: appearance.exportRatio === value, disabled }} disabled={disabled}
        onPress={() => onChange({ exportRatio: value })} style={[styles.option, appearance.exportRatio === value && styles.optionSelected, disabled && styles.disabled]}>
        <Text style={styles.optionText}>{t(ratioLabels[value])}</Text>
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
