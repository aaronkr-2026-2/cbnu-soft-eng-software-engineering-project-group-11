import { useEffect, useState, type RefObject } from 'react';
import { Modal, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import type { TranslationKey } from '../../../i18n/translations';
import { useTranslation } from '../../../i18n/useTranslation';
import type { HomeTourStep } from '../../../store/app-store';
import { createHomeTourStyles } from '../styles/home-tour.styles';

export type TourTarget = { id: HomeTourStep; target: RefObject<View | null>; title: TranslationKey; body: TranslationKey };
type Rect = { id: HomeTourStep; x: number; y: number; width: number; height: number };
const padding = 6;

/** Spotlights each mounted target in turn. Steps whose target is off screen are skipped, not marked seen. */
export function HomeTour({ steps, onSeen, onSkip }: { steps: TourTarget[]; onSeen: (step: HomeTourStep) => void; onSkip: () => void }) {
  const styles = useThemedStyles(createHomeTourStyles);
  const { t } = useTranslation();
  const window = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [measured, setMeasured] = useState<Rect | null>(null);
  const step = steps[index];
  const rect = measured && measured.id === step?.id ? measured : null;

  useEffect(() => {
    if (!step) return;
    let current = true;
    const node = step.target.current;
    // A target that unmounted mid-tour is skipped rather than leaving an empty overlay.
    if (!node) {
      const timer = setTimeout(() => setIndex(value => value + 1), 0);
      return () => clearTimeout(timer);
    }
    node.measureInWindow((x, y, width, height) => {
      if (!current) return;
      if (!width || !height || y + height <= 0 || y >= window.height) setIndex(value => value + 1);
      else setMeasured({ id: step.id, x: x - padding, y: y - padding, width: width + padding * 2, height: height + padding * 2 });
    });
    return () => { current = false; };
  }, [step, window.height]);

  if (!step) return null;
  const last = index === steps.length - 1;
  function next() {
    onSeen(step.id);
    setIndex(value => value + 1);
  }
  // Place the card on whichever side of the target has more room.
  const below = rect ? rect.y + rect.height / 2 < window.height / 2 : true;
  return <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onSkip}>
    {rect ? <>
      <View style={[styles.dim, { left: 0, right: 0, top: 0, height: Math.max(0, rect.y) }]} />
      <View style={[styles.dim, { left: 0, right: 0, top: rect.y + rect.height, bottom: 0 }]} />
      <View style={[styles.dim, { left: 0, width: Math.max(0, rect.x), top: rect.y, height: rect.height }]} />
      <View style={[styles.dim, { left: rect.x + rect.width, right: 0, top: rect.y, height: rect.height }]} />
      <View pointerEvents="none" style={[styles.ring, { left: rect.x, top: rect.y, width: rect.width, height: rect.height }]} />
      <View accessibilityViewIsModal style={[styles.card, below ? { top: rect.y + rect.height + 14 } : { bottom: window.height - rect.y + 14 }]}>
        {steps.length > 1 ? <Text style={styles.step}>{t('tourStep', { current: index + 1, total: steps.length })}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{t(step.title)}</Text>
        <Text style={styles.body}>{t(step.body)}</Text>
        <View style={styles.actions}>
          {last ? <View /> : <Pressable accessibilityRole="button" onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>{t('tourSkip')}</Text>
          </Pressable>}
          <Pressable accessibilityRole="button" onPress={next} style={styles.next}>
            <Text style={styles.nextText}>{t(last ? 'tourDone' : 'tourNext')}</Text>
          </Pressable>
        </View>
      </View>
    </> : <View style={[styles.dim, { left: 0, right: 0, top: 0, bottom: 0 }]} />}
  </Modal>;
}
