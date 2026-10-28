import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import { createFilmSelectionStyles } from '../../rolls/styles/film-selection.styles';
import { indexLetters, letterAt, sectionForLetter } from '../utils/alphabetIndex';

/** Contacts-style A–Z strip: tap or drag to jump to the first brand under a letter. */
export function AlphabetIndex({ sections, onSelect }: { sections: ReadonlyMap<string, number>; onSelect: (sectionIndex: number) => void }) {
  const styles = useThemedStyles(createFilmSelectionStyles);
  const { t } = useTranslation();
  const height = useRef(1);
  const last = useRef<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<string>(indexLetters[0]);
  function jump(letter: string) {
    if (letter === last.current) return;
    last.current = letter;
    setActive(letter); setSpoken(letter);
    const section = sectionForLetter(letter, sections);
    if (section !== undefined) onSelect(section);
    void Haptics.selectionAsync().catch(() => {});
  }
  function release() { last.current = null; setActive(null); }
  function step(delta: number) {
    // VoiceOver swipes move between letters that actually have brands.
    const available = indexLetters.filter(letter => sections.has(letter));
    const next = available[Math.max(0, Math.min(available.length - 1, available.indexOf(spoken as typeof indexLetters[number]) + delta))];
    if (!next) return;
    setSpoken(next);
    onSelect(sections.get(next)!);
  }
  return <>
    <View pointerEvents="box-none" style={styles.indexRail}>
      <View pointerEvents="box-only" style={styles.index} onLayout={event => { height.current = event.nativeEvent.layout.height; }}
        accessible accessibilityRole="adjustable" accessibilityLabel={t('filmIndex')} accessibilityValue={{ text: spoken }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={event => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
        onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false}
        onResponderGrant={event => { Keyboard.dismiss(); jump(letterAt(event.nativeEvent.locationY, height.current)); }}
        onResponderMove={event => jump(letterAt(event.nativeEvent.locationY, height.current))}
        onResponderRelease={release} onResponderTerminate={release}>
        {indexLetters.map(letter => <View key={letter} style={styles.indexSlot}>
          <Text allowFontScaling={false} style={[styles.indexLetter, !sections.has(letter) && styles.indexLetterEmpty]}>{letter}</Text>
        </View>)}
      </View>
    </View>
    {active ? <View pointerEvents="none" style={styles.indexBubble}><Text allowFontScaling={false} style={styles.indexBubbleText}>{active}</Text></View> : null}
  </>;
}
