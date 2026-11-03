import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemedStyles, type ThemeColors } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { Camera } from '../../../types/models';
import { copyFilmPrompt as copyCoverPrompt } from '../../films/services/FilmPromptClipboard';
import { buildCameraCoverPrompt } from '../utils/cameraCoverPrompt';

type Props = { brand: string; model: string; format: NonNullable<Camera['format']> };

export function CameraCoverPrompt(props: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [expanded, setExpanded] = useState(false);
  const [copying, setCopying] = useState(false);
  let prompt: string | undefined;
  try { prompt = buildCameraCoverPrompt(props); } catch { /* Enable after required fields are entered. */ }
  async function copy() {
    if (!prompt || copying) return;
    setCopying(true);
    try {
      const copied = await copyCoverPrompt(prompt);
      if (!copied) setExpanded(true);
      Alert.alert(t(copied ? 'filmPromptCopied' : 'filmPromptManualTitle'), t(copied ? 'cameraPromptNext' : 'filmPromptManualBody'));
    } finally { setCopying(false); }
  }
  return <View style={styles.section}>
    <Text style={styles.heading}>{t('cameraPromptTitle')}</Text>
    <Text style={styles.note}>{t('cameraPromptHelp')}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !prompt || copying, busy: copying }} disabled={!prompt || copying} onPress={() => { void copy(); }} style={({ pressed }) => [styles.button, (pressed || !prompt || copying) && styles.dimmed]}>
      <Text style={styles.buttonText}>{t('filmPromptCopy')}</Text>
    </Pressable>
    {!prompt && <Text style={styles.note}>{t('cameraPromptRequired')}</Text>}
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
  button: { minHeight: 46, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 12 },
  buttonText: { color: colors.text, fontSize: 14, fontWeight: '600' }, dimmed: { opacity: 0.5 },
  previewButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  prompt: { color: colors.text, backgroundColor: colors.surface, fontSize: 13, lineHeight: 20, padding: 12, borderRadius: 12 },
});
