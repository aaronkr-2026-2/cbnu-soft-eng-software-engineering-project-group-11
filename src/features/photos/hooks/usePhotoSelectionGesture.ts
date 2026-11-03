import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { gridGap } from '../styles/reorderable-photo-grid.styles';
import { photoIndexAtPoint, selectionDragIntent } from '../utils/photoSelection';

export function usePhotoSelectionGesture(enabled: boolean, size: number, count: number,
  onSelectRange: (start: number, end: number) => void, onDraggingChange: (dragging: boolean) => void) {
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const anchor = useSharedValue(-1);
  const last = useSharedValue(-1);
  const active = useSharedValue(false);
  return useMemo(() => Gesture.Pan().enabled(enabled).manualActivation(true)
    .onTouchesDown((event, state) => {
      active.value = false;
      const touch = event.allTouches[0];
      if (!touch || event.allTouches.length !== 1) { state.fail(); return; }
      startX.value = touch.x; startY.value = touch.y;
      anchor.value = photoIndexAtPoint(touch.x, touch.y, size, gridGap, count);
      last.value = anchor.value;
      if (anchor.value < 0) state.fail();
    })
    .onTouchesMove((event, state) => {
      if (active.value) return;
      const touch = event.allTouches[0];
      if (!touch || event.allTouches.length !== 1 || anchor.value < 0) { state.fail(); return; }
      const intent = selectionDragIntent(touch.x - startX.value, touch.y - startY.value);
      if (intent === 'scroll') state.fail();
      else if (intent === 'select') state.activate();
    })
    .onTouchesUp((_event, state) => {
      // A quick tap must not wait for this manual Pan to finish recognizing.
      if (!active.value) state.fail();
    })
    .onStart(() => {
      active.value = true;
      scheduleOnRN(onDraggingChange, true);
      scheduleOnRN(onSelectRange, anchor.value, anchor.value);
    })
    .onUpdate(event => {
      const index = photoIndexAtPoint(event.x, event.y, size, gridGap, count);
      if (index < 0 || index === last.value) return;
      // Add a bounded index range once per crossed slot, never toggle per gesture frame.
      scheduleOnRN(onSelectRange, Math.min(last.value, index), Math.max(last.value, index));
      last.value = index;
    })
    .onFinalize(() => {
      if (active.value) { active.value = false; scheduleOnRN(onDraggingChange, false); }
    }), [enabled, size, count, onSelectRange, onDraggingChange, startX, startY, anchor, last, active]);
}
