import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useThemedStyles } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PhotoReference } from '../types';
import { useResolvedPhoto } from '../hooks/useResolvedPhoto';
import { PhotoResolutionStatus } from './PhotoResolutionStatus';
import { createReorderablePhotoGridStyles, gridGap } from '../styles/reorderable-photo-grid.styles';
import { usePhotoSelectionGesture } from '../hooks/usePhotoSelectionGesture';
import { PhotoSelectionOverlay } from './PhotoSelectionOverlay';

const columns = 3;
// How long a finger must rest on a photo before it lifts for reordering, and how far it may drift meanwhile.
const liftDelay = 250;
const liftSlop = 10;
const emptySelection: ReadonlySet<string> = new Set();
const ignoreRange = (_start: number, _end: number) => {};

type Positions = Record<string, number>;

type Props = {
  photos: PhotoReference[];
  onPhotoPress: (photo: PhotoReference, index: number) => void;
  /** Returns false when the new order could not be saved. */
  onReorder: (ids: string[]) => boolean;
  onDraggingChange: (dragging: boolean) => void;
  onAdd: () => void;
  adding?: boolean;
  selectionMode?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (id: string) => void;
  onSelectRange?: (start: number, end: number) => void;
  interactionDisabled?: boolean;
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

export function ReorderablePhotoGrid({ photos, onPhotoPress, onReorder, onDraggingChange, onAdd, adding = false,
  selectionMode = false, selectedIds = emptySelection, onToggleSelection, onSelectRange = ignoreRange, interactionDisabled = false }: Props) {
  const styles = useThemedStyles(createReorderablePhotoGridStyles);
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const size = Math.max(0, (width - gridGap * (columns - 1)) / columns);
  const positions = useSharedValue<Positions>(positionsOf(photos));
  const rows = Math.ceil((photos.length + (selectionMode ? 0 : 1)) / columns);
  const addOrigin = slotOrigin(photos.length, size);
  const selectionGesture = usePhotoSelectionGesture(selectionMode && !interactionDisabled, size, photos.length, onSelectRange, onDraggingChange);

  // Follow the store once a reorder is saved, or when photos are added.
  useEffect(() => { positions.value = positionsOf(photos); }, [photos, positions]);

  const commit = useCallback((next: Positions) => {
    const ids = Object.keys(next).sort((left, right) => next[left] - next[right]);
    if (ids.some((id, index) => photos[index]?.id !== id) && !onReorder(ids)) positions.value = positionsOf(photos);
  }, [photos, onReorder, positions]);

  const moveBy = useCallback((index: number, offset: number) => {
    const to = Math.max(0, Math.min(photos.length - 1, index + offset));
    if (to === index) return;
    const ids = photos.map((photo) => photo.id);
    const [id] = ids.splice(index, 1);
    ids.splice(to, 0, id);
    onReorder(ids);
  }, [photos, onReorder]);

  return <>
    <Text style={styles.hint}>{t(selectionMode ? 'selectionDragHint' : photos.length ? 'reorderHint' : 'attachPhotos')}</Text>
    <GestureDetector gesture={selectionGesture}>
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.grid, { height: size > 0 && rows > 0 ? rows * size + (rows - 1) * gridGap : 0 }]}>
      {size > 0 ? photos.map((photo, index) => <PhotoTile
        key={photo.id}
        photo={photo}
        initialIndex={index}
        size={size}
        count={photos.length}
        positions={positions}
        onPhotoPress={onPhotoPress}
        selecting={selectionMode}
        selected={selectedIds.has(photo.id)}
        onToggleSelection={onToggleSelection}
        selectionGesture={selectionGesture}
        interactionDisabled={interactionDisabled}
        onDraggingChange={onDraggingChange}
        onDrop={commit}
        onAccessibleMove={moveBy}
      />) : null}
      {size > 0 && !selectionMode ? <Pressable accessibilityRole="button" accessibilityLabel={t('addPhotos')} disabled={adding} onPress={onAdd}
        style={({ pressed }) => [styles.addTile, { width: size, height: size, left: addOrigin.x, top: addOrigin.y }, pressed && styles.addTilePressed]}>
        {adding ? <ActivityIndicator color={styles.addIcon.color} /> : <Text style={styles.addIcon}>+</Text>}
      </Pressable> : null}
    </View>
    </GestureDetector>
  </>;
}

const PhotoTile = memo(function PhotoTile({ photo, initialIndex, size, count, positions, onPhotoPress, onDraggingChange, onDrop, onAccessibleMove,
  selecting, selected, onToggleSelection, selectionGesture, interactionDisabled }: {
  photo: PhotoReference; initialIndex: number; size: number; count: number; positions: SharedValue<Positions>;
  onPhotoPress: (photo: PhotoReference, index: number) => void; onDraggingChange: (dragging: boolean) => void; onDrop: (positions: Positions) => void;
  onAccessibleMove: (index: number, offset: number) => void;
  selecting: boolean; selected: boolean; onToggleSelection?: (id: string) => void;
  selectionGesture: ReturnType<typeof Gesture.Pan>; interactionDisabled: boolean;
}) {
  const styles = useThemedStyles(createReorderablePhotoGridStyles);
  const { t } = useTranslation();
  const id = photo.id;
  const resolution = useResolvedPhoto(photo);
  const { uri } = resolution;
  const onPress = useCallback(() => {
    if (interactionDisabled) return;
    if (selecting) onToggleSelection?.(id);
    else onPhotoPress(photo, initialIndex);
  }, [interactionDisabled, selecting, onToggleSelection, id, onPhotoPress, photo, initialIndex]);
  const lifted = useSharedValue(false);
  const dragging = useSharedValue(false);
  // Imported tiles start in their final slots instead of springing out of slot zero.
  const initialOrigin = slotOrigin(initialIndex, size);
  const x = useSharedValue(initialOrigin.x);
  const y = useSharedValue(initialOrigin.y);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const touchStartX = useSharedValue(0);
  const touchStartY = useSharedValue(0);

  useAnimatedReaction(
    () => slotOrigin(positions.value[id] ?? initialIndex, size),
    (origin, previous) => {
      if (lifted.value || (previous && origin.x === previous.x && origin.y === previous.y)) return;
      x.value = previous ? withTiming(origin.x, { duration: 120 }) : origin.x;
      y.value = previous ? withTiming(origin.y, { duration: 120 }) : origin.y;
    },
  );

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
    x.value = withTiming(origin.x, { duration: 120 });
    y.value = withTiming(origin.y, { duration: 120 });
    scheduleOnRN(drop, positions.value);
  }

  // Hold to lift the photo; only then does dragging reorder. Moving earlier leaves the drag to the page scroll.
  const hold = Gesture.LongPress()
    .enabled(!selecting && !interactionDisabled)
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
    .enabled(!selecting && !interactionDisabled)
    .manualActivation(true)
    .onTouchesDown((event) => {
      const touch = event.allTouches[0];
      if (!touch) return;
      touchStartX.value = touch.absoluteX;
      touchStartY.value = touch.absoluteY;
    })
    .onTouchesMove((event, state) => {
      if (lifted.value) {
        state.activate();
        return;
      }
      const touch = event.allTouches[0];
      if (!touch) return;
      // The hold fails at this same distance. Fail its simultaneous pan too,
      // so it cannot remain pending and delay the parent ScrollView.
      if (Math.hypot(touch.absoluteX - touchStartX.value, touch.absoluteY - touchStartY.value) > liftSlop) {
        state.fail();
      }
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

  const tap = Gesture.Tap().enabled(!interactionDisabled).maxDistance(selecting ? 6 : liftSlop)
    .onEnd((_event, success) => { if (success) scheduleOnRN(onPress); });

  const gesture = selecting ? tap.requireExternalGestureToFail(selectionGesture)
    : Gesture.Exclusive(Gesture.Simultaneous(hold, drag), tap);

  const style = useAnimatedStyle(() => {
    const active = lifted.value;
    return {
      zIndex: active ? 10 : 0,
      transform: [
        // At rest a photo glides to its slot; while held it sits exactly under the finger.
        { translateX: x.value },
        { translateY: y.value },
      ],
      opacity: 1,
      shadowOpacity: active ? 0.12 : 0,
      elevation: active ? 3 : 0,
    };
  });

  return <GestureDetector gesture={gesture}>
    <Animated.View
      accessible
      accessibilityRole={selecting ? 'checkbox' : 'button'}
      accessibilityState={selecting ? { checked: selected, disabled: interactionDisabled } : undefined}
      accessibilityLabel={t(selecting ? selected ? 'deselectPhoto' : 'selectPhoto' : 'openPhoto')}
      accessibilityHint={t(selecting ? 'selectionDragHint' : 'reorderHint')}
      accessibilityActions={selecting ? [{ name: 'activate' }] : [{ name: 'activate' }, { name: 'increment', label: t('moveLater') }, { name: 'decrement', label: t('moveEarlier') }]}
      onAccessibilityAction={(event) => {
        const action = event.nativeEvent.actionName;
        if (action === 'activate') onPress();
        else if (!selecting && !interactionDisabled) onAccessibleMove(initialIndex, action === 'increment' ? 1 : -1);
      }}
      style={[styles.tile, styles.lifted, { width: size, height: size }, style]}
    >
      {uri ? <Image source={{ uri }} onError={resolution.failed} style={styles.image} /> : <PhotoResolutionStatus status={resolution.status} />}
      {selecting ? <PhotoSelectionOverlay selected={selected} /> : null}
    </Animated.View>
  </GestureDetector>;
});
