import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type ThemeColors } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { SelectionChip } from '../../../components/ui/SelectionChip';
import type { Film } from '../../../types/models';
import { buildFilmCoverPrompt } from '../utils/filmCoverPrompt';
import { copyFilmPrompt } from '../services/FilmPromptClipboard';

type Props = { brand: string; name: string; iso: string; formats: Film['format'][]; type: Film['type']; process: string };

export function FilmCoverPrompt({ formats, ...fields }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [chosenFormat, setChosenFormat] = useState<Film['format']>();
  const [expanded, setExpanded] = useState(false);
  const [copying, setCopying] = useState(false);
  const format = chosenFormat && formats.includes(chosenFormat) ? chosenFormat : formats[0];
  let prompt: string | undefined;
  try { prompt = buildFilmCoverPrompt({ ...fields, format }); } catch { /* Required fields remain editable. */ }
  async function copy() {
    if (copying || !prompt) return;
    setCopying(true);
    try {
      const copied = await copyFilmPrompt(prompt);
      if (!copied) setExpanded(true);
      Alert.alert(t(copied ? 'filmPromptCopied' : 'filmPromptManualTitle'), t(copied ? 'filmPromptNext' : 'filmPromptManualBody'));
    } finally { setCopying(false); }
  }
  return <View style={styles.section}>
    <Text style={styles.heading}>{t('filmPromptTitle')}</Text>
    <Text style={styles.note}>{t('filmPromptHelp')}</Text>
    {formats.length > 1 && <>
      <Text style={styles.note}>{t('filmPromptFormat')}</Text>
      <View style={styles.choices}>{formats.map(value => <SelectionChip key={value} label={value === 'other' ? t('other') : value === '35mm' ? value : `${value}mm`} selected={format === value} onPress={() => setChosenFormat(value)} />)}</View>
    </>}
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !prompt || copying, busy: copying }} disabled={!prompt || copying} onPress={() => { void copy(); }} style={({ pressed }) => [styles.button, (pressed || !prompt || copying) && styles.dimmed]}>
      <Text style={styles.buttonText}>{t('filmPromptCopy')}</Text>
    </Pressable>
    {prompt && <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.previewButton}><Text style={styles.note}>{t(expanded ? 'filmPromptHide' : 'filmPromptPreview')}</Text></Pressable>
      {expanded && <Text selectable style={styles.prompt}>{prompt}</Text>}
    </>}
  </View>;
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  section: { marginTop: 16, gap: 10 },
  heading: { color: colors.text, fontSize: 14, fontWeight: '600' },
  note: { color: colors.secondaryText, fontSize: 13, lineHeight: 19 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  dimmed: { opacity: 0.5 },
  previewButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  prompt: { color: colors.text, backgroundColor: colors.surface, fontSize: 13, lineHeight: 20, padding: 12, borderRadius: 12 },
});
