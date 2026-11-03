import { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../../../i18n/useTranslation';
import { coverAspectRatio, cropFromFraming, cropImage } from '../services/ImageCropService';

type Props = { uri: string; width: number; height: number; onCancel: () => void; onDone: (uri: string) => void };
const maxZoom = 5;

/** Fixed-ratio cover framing: drag to move and pinch to zoom; the image always fills the frame. */
export function ImageCropModal({ uri, width, height, onCancel, onDone }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const frameWidth = window.width - 32;
  const frameHeight = frameWidth / coverAspectRatio;
  const baseScale = Math.max(frameWidth / width, frameHeight / height);
  const zoom = useSharedValue(1), x = useSharedValue(0), y = useSharedValue(0);
  const start = useSharedValue({ zoom: 1, x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  // Keep the frame covered: the image may only move as far as it overhangs the frame.
  function clampTo(value: number, scale: number, image: number, frame: number) {
    'worklet';
    const limit = Math.max(0, (image * baseScale * scale - frame) / 2);
    return Math.min(limit, Math.max(-limit, value));
  }
  const pan = Gesture.Pan()
    .onStart(() => { start.value = { zoom: zoom.value, x: x.value, y: y.value }; })
    .onUpdate(event => {
      x.value = clampTo(start.value.x + event.translationX, zoom.value, width, frameWidth);
      y.value = clampTo(start.value.y + event.translationY, zoom.value, height, frameHeight);
    });
  const pinch = Gesture.Pinch()
    .onStart(() => { start.value = { zoom: zoom.value, x: x.value, y: y.value }; })
    .onUpdate(event => {
      zoom.value = Math.min(maxZoom, Math.max(1, start.value.zoom * event.scale));
      x.value = clampTo(x.value, zoom.value, width, frameWidth);
      y.value = clampTo(y.value, zoom.value, height, frameHeight);
    });
  const reset = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    zoom.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0);
  });
  const imageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: zoom.value }] }));

  async function choose() {
    if (saving) return;
    setSaving(true);
    try {
      const rect = cropFromFraming({ imageWidth: width, imageHeight: height, frameWidth, frameHeight, zoom: zoom.value, offsetX: x.value, offsetY: y.value });
      onDone(await cropImage(uri, rect));
    } catch {
      // Keep the picked image rather than losing the user's choice.
      onDone(uri);
    }
  }

  const frameTop = (window.height - frameHeight) / 2 - 24;
  const frameLeft = (window.width - frameWidth) / 2;
  return <Modal animationType="fade" presentationStyle="overFullScreen" transparent onRequestClose={onCancel}>
    <GestureHandlerRootView style={styles.root}>
      <GestureDetector gesture={Gesture.Simultaneous(pan, pinch, reset)}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: frameLeft + (frameWidth - width * baseScale) / 2,
            top: frameTop + (frameHeight - height * baseScale) / 2, width: width * baseScale, height: height * baseScale }, imageStyle]}>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: frameTop }]} />
          <View pointerEvents="none" style={[styles.dim, { top: frameTop + frameHeight, left: 0, right: 0, bottom: 0 }]} />
          <View pointerEvents="none" style={[styles.dim, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />
          <View pointerEvents="none" style={[styles.dim, { top: frameTop, right: 0, width: frameLeft, height: frameHeight }]} />
          <View pointerEvents="none" style={[styles.frame, { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight }]}>
            <View style={[styles.grid, { left: '33.33%' }]} /><View style={[styles.grid, { left: '66.66%' }]} />
            <View style={[styles.gridRow, { top: '33.33%' }]} /><View style={[styles.gridRow, { top: '66.66%' }]} />
          </View>
        </View>
      </GestureDetector>
      <View pointerEvents="none" style={[styles.header, { top: insets.top + 16 }]}>
        <Text style={styles.title}>{t('cropTitle')}</Text>
        <Text style={styles.hint}>{t('cropHint')}</Text>
      </View>
      <View style={[styles.actions, { bottom: insets.bottom + 20 }]}>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.secondary}><Text style={styles.secondaryText}>{t('cancel')}</Text></Pressable>
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => { void choose(); }} style={styles.primary}>
          {saving ? <ActivityIndicator color="#111111" /> : <Text style={styles.primaryText}>{t('cropChoose')}</Text>}
        </Pressable>
      </View>
    </GestureHandlerRootView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 12 },
  grid: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.45)' },
  gridRow: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.45)' },
  header: { position: 'absolute', left: 24, right: 24, alignItems: 'center' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6, textAlign: 'center' },
  actions: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', gap: 12 },
  secondary: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  secondaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  primary: { flex: 1, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  primaryText: { color: '#111111', fontSize: 16, fontWeight: '700' },
});
