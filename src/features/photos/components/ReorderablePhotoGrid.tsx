import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PhotoReference } from '../types';
import { createReorderablePhotoGridStyles, gridGap } from '../styles/reorderable-photo-grid.styles';

const columns = 3;
// How long a finger must rest on a photo before it lifts for reordering, and how far it may drift meanwhile.
const liftDelay = 250;
const liftSlop = 10;
const slotSpring = { damping: 20, stiffness: 220 };

type Positions = Record<string, number>;

type Props = {
  photos: PhotoReference[];
  onPhotoPress: (photo: PhotoReference, index: number) => void;
  onReorder: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onAdd: () => void;
  adding?: boolean;
};

function positionsOf(photos: PhotoReference[]): Positions {
  return Object.fromEntries(photos.map((photo, index) => [photo.id, index]));
}

function slotOrigin(position: number, size: number) {
  'worklet';
  return { x: (position % columns) * (size + gridGap), y: Math.floor(position / columns) * (size + gridGap) };
}

/** Moves one photo to a new slot and shifts the photos between the two slots by one, as the Photos app does. */
function movePosition(positions: Positions, from: number, to: number): Positions {
  'worklet';
  const next: Positions = {};
  for (const id in positions) {
    const position = positions[id];
    if (position === from) next[id] = to;
    else if (from < to && position > from && position <= to) next[id] = position - 1;
    else if (from > to && position < from && position >= to) next[id] = position + 1;
    else next[id] = position;
  }
  return next;
}

export function ReorderablePhotoGrid({ photos, onPhotoPress, onReorder, onDraggingChange, onAdd, adding = false }: Props) {
  const styles = useThemedStyles(createReorderablePhotoGridStyles);
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const size = Math.max(0, (width - gridGap * (columns - 1)) / columns);
  const positions = useSharedValue<Positions>(positionsOf(photos));
  const rows = Math.ceil((photos.length + 1) / columns);
  const addOrigin = slotOrigin(photos.length, size);

  // Follow the store once a reorder is saved, or when photos are added.
  useEffect(() => { positions.value = positionsOf(photos); }, [photos, positions]);

  function commit(next: Positions) {
    const ids = Object.keys(next).sort((left, right) => next[left] - next[right]);
    if (ids.some((id, index) => photos[index]?.id !== id)) onReorder(ids);
  }

  function moveBy(index: number, offset: number) {
    const to = Math.max(0, Math.min(photos.length - 1, index + offset));
    if (to === index) return;
    const ids = photos.map((photo) => photo.id);
    const [id] = ids.splice(index, 1);
    ids.splice(to, 0, id);
    onReorder(ids);
  }

  return <>
    <Text style={styles.hint}>{t(photos.length ? 'reorderHint' : 'attachPhotos')}</Text>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.grid, { height: size > 0 ? rows * size + (rows - 1) * gridGap : 0 }]}>
      {size > 0 ? photos.map((photo, index) => <PhotoTile
        key={photo.id}
        photo={photo}
        size={size}
        count={photos.length}
        positions={positions}
        onPress={() => onPhotoPress(photo, index)}
        onDraggingChange={onDraggingChange}
        onDrop={commit}
        onAccessibleMove={(offset) => moveBy(index, offset)}
      />) : null}
      {size > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={t('addPhotos')} disabled={adding} onPress={onAdd}
        style={({ pressed }) => [styles.addTile, { width: size, height: size, left: addOrigin.x, top: addOrigin.y }, pressed && styles.addTilePressed]}>
        {adding ? <ActivityIndicator color={styles.addIcon.color} /> : <Text style={styles.addIcon}>+</Text>}
      </Pressable> : null}
    </View>
  </>;
}

function PhotoTile({ photo, size, count, positions, onPress, onDraggingChange, onDrop, onAccessibleMove }: {
  photo: PhotoReference; size: number; count: number; positions: SharedValue<Positions>;
  onPress: () => void; onDraggingChange: (dragging: boolean) => void; onDrop: (positions: Positions) => void; onAccessibleMove: (offset: number) => void;
}) {
  const styles = useThemedStyles(createReorderablePhotoGridStyles);
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const id = photo.id;
  const lifted = useSharedValue(false);
  const dragging = useSharedValue(false);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  function lift() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDraggingChange(true);
  }
  function settle() {
    Haptics.selectionAsync().catch(() => {});
  }
  function drop(next: Positions) {
    onDraggingChange(false);
    onDrop(next);
  }

  function release() {
    'worklet';
    if (!lifted.value) return;
    lifted.value = false;
    const origin = slotOrigin(positions.value[id] ?? 0, size);
    x.value = withSpring(origin.x, slotSpring);
    y.value = withSpring(origin.y, slotSpring);
    scheduleOnRN(drop, positions.value);
  }

  // Hold to lift the photo; only then does dragging reorder. Moving earlier leaves the drag to the page scroll.
  const hold = Gesture.LongPress()
    .minDuration(liftDelay)
    .maxDistance(liftSlop)
    .onStart(() => {
      const origin = slotOrigin(positions.value[id] ?? 0, size);
      x.value = origin.x; y.value = origin.y;
      startX.value = origin.x; startY.value = origin.y;
      lifted.value = true;
      scheduleOnRN(lift);
    })
    // If the finger lifts without dragging, drop the photo back; a drag drops it when the drag ends.
    .onFinalize(() => { if (!dragging.value) release(); });

  const drag = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_event, state) => {
      if (lifted.value) state.activate();
    })
    .onStart(() => { dragging.value = true; })
    .onUpdate((event) => {
      if (!lifted.value) return;
      x.value = startX.value + event.translationX;
      y.value = startY.value + event.translationY;
      // The slot under the photo's centre becomes its new place; the others make room.
      const column = Math.max(0, Math.min(columns - 1, Math.round(x.value / (size + gridGap))));
      const row = Math.max(0, Math.round(y.value / (size + gridGap)));
      const target = Math.min(count - 1, row * columns + column);
      const from = positions.value[id];
      if (from !== undefined && target !== from) {
        positions.value = movePosition(positions.value, from, target);
        scheduleOnRN(settle);
      }
    })
    .onFinalize(() => { dragging.value = false; release(); });

  const tap = Gesture.Tap().maxDistance(liftSlop).onEnd(() => { scheduleOnRN(onPress); });

  const gesture = Gesture.Exclusive(Gesture.Simultaneous(hold, drag), tap);

  const style = useAnimatedStyle(() => {
    const origin = slotOrigin(positions.value[id] ?? 0, size);
    const active = lifted.value;
    return {
      zIndex: active ? 10 : 0,
      transform: [
        // At rest a photo glides to its slot; while held it sits exactly under the finger.
        { translateX: active ? x.value : withSpring(origin.x, slotSpring) },
        { translateY: active ? y.value : withSpring(origin.y, slotSpring) },
        { scale: withTiming(active ? 1.08 : 1, { duration: 150 }) },
      ],
      opacity: withTiming(active ? 0.92 : 1, { duration: 150 }),
      shadowOpacity: withTiming(active ? 0.3 : 0, { duration: 150 }),
      elevation: active ? 10 : 0,
    };
  });

  return <GestureDetector gesture={gesture}>
    <Animated.View
      accessible
      accessibilityRole="button"
      accessibilityLabel={t('openPhoto')}
      accessibilityHint={t('reorderHint')}
      accessibilityActions={[{ name: 'activate' }, { name: 'increment', label: t('moveLater') }, { name: 'decrement', label: t('moveEarlier') }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'activate') onPress();
        else onAccessibleMove(action === 'increment' ? 1 : -1);
      }}
      style={[styles.tile, styles.lifted, { width: size, height: size }, style]}
    >
      {photo.thumbnailUri && !failed ? <Image source={{ uri: photo.thumbnailUri }} onError={() => setFailed(true)} style={styles.image} /> : <Text style={styles.hint}>{t('unavailable')}</Text>}
    </Animated.View>
  </GestureDetector>;
}
