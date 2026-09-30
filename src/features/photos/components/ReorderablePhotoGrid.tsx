import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import { useThemedStyles, type ThemeColors, spacing } from '../../../constants/theme';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PhotoReference } from '../types';

type Props = {
  photos: PhotoReference[];
  onPhotoPress: (photo: PhotoReference, index: number) => void;
  onReorder: (ids: string[]) => void;
  onDraggingChange: (dragging: boolean) => void;
  onAdd: () => void;
  adding?: boolean;
};
export function ReorderablePhotoGrid({ photos, onPhotoPress, onReorder, onDraggingChange, onAdd, adding = false }: Props) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState<{ index: number; target: number; dx: number; dy: number } | null>(null);
  const dragRef = useRef(drag);
  function updateDrag(next: typeof drag) { dragRef.current = next; setDrag(next); }
  const size = Math.max(0, (width - spacing.sm * 2) / 3);
  function move(from: number, to: number) {
    if (from === to) return;
    const ids = photos.map((photo) => photo.id);
    const [id] = ids.splice(from, 1);
    ids.splice(to, 0, id);
    onReorder(ids);
  }
  const addTile = <Pressable accessibilityRole="button" accessibilityLabel={t('addPhotos')} disabled={adding} onPress={onAdd}
    style={({ pressed }) => [styles.tile, styles.addTile, { width: size, height: size }, pressed && styles.addTilePressed]}>
    {adding ? <ActivityIndicator color={styles.addIcon.color} /> : <Text style={styles.addIcon}>+</Text>}
  </Pressable>;
  return <><Text style={styles.hint}>{t(photos.length ? 'reorderHint' : 'attachPhotos')}</Text><View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.grid}>
    {photos.map((photo, index) => <DragTile key={photo.id} photo={photo} size={size} active={drag?.index === index} target={drag?.target === index} dx={drag?.index === index ? drag.dx : 0} dy={drag?.index === index ? drag.dy : 0}
      onTap={() => onPhotoPress(photo, index)}
      onStart={() => { updateDrag({ index, target: index, dx: 0, dy: 0 }); onDraggingChange(true); }}
      onMove={(dx, dy) => {
        const column = Math.max(0, Math.min(2, index % 3 + Math.round(dx / (size + spacing.sm))));
        const row = Math.max(0, Math.floor(index / 3) + Math.round(dy / (size + spacing.sm)));
        updateDrag({ index, target: Math.min(photos.length - 1, row * 3 + column), dx, dy });
      }}
      onEnd={(cancelled) => { if (!cancelled && dragRef.current) move(index, dragRef.current.target); updateDrag(null); onDraggingChange(false); }}
      onAccessibleMove={(offset) => move(index, Math.max(0, Math.min(photos.length - 1, index + offset)))}
    />)}
    {size > 0 && !drag ? addTile : null}
  </View></>;
}
function DragTile({ photo, size, active, target, dx, dy, onTap, onStart, onMove, onEnd, onAccessibleMove }: {
  photo: PhotoReference; size: number; active: boolean; target: boolean; dx: number; dy: number;
  onTap: () => void; onStart: () => void; onMove: (dx: number, dy: number) => void; onEnd: (cancelled: boolean) => void; onAccessibleMove: (offset: number) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const { t } = useTranslation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef({ x: 0, y: 0, dragging: false, moved: false });
  const [failed, setFailed] = useState(false);
  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function start(event: GestureResponderEvent) {
    clearTimer();
    gesture.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY, dragging: false, moved: false };
    timer.current = setTimeout(() => { gesture.current.dragging = true; onStart(); }, 400);
  }
  return <View accessible accessibilityRole="button" accessibilityLabel={t('openPhoto')} accessibilityHint={t('reorderHint')}
    accessibilityActions={[{ name: 'activate' }, { name: 'increment', label: t('moveLater') }, { name: 'decrement', label: t('moveEarlier') }]}
    onAccessibilityAction={(event) => { const action = event.nativeEvent.actionName; if (action === 'activate') onTap(); else onAccessibleMove(action === 'increment' ? 1 : -1); }}
    onStartShouldSetResponder={() => true} onResponderGrant={start}
    onResponderTerminationRequest={() => !gesture.current.dragging}
    onResponderMove={(event) => {
      const x = event.nativeEvent.pageX - gesture.current.x;
      const y = event.nativeEvent.pageY - gesture.current.y;
      if (gesture.current.dragging) onMove(x, y);
      else if (Math.abs(x) + Math.abs(y) > 8) { gesture.current.moved = true; clearTimer(); }
    }}
    onResponderRelease={() => { clearTimer(); if (gesture.current.dragging) onEnd(false); else if (!gesture.current.moved) onTap(); gesture.current.dragging = false; }}
    onResponderTerminate={() => { clearTimer(); if (gesture.current.dragging) onEnd(true); gesture.current.dragging = false; }}
    style={[styles.tile, { width: size, height: size }, target && styles.target, active && { zIndex: 10, elevation: 8, opacity: 0.85, transform: [{ translateX: dx }, { translateY: dy }, { scale: 1.05 }] }]}
  >{photo.thumbnailUri && !failed ? <Image source={{ uri: photo.thumbnailUri }} onError={() => setFailed(true)} style={styles.image} /> : <Text style={styles.hint}>{t('unavailable')}</Text>}</View>;
}
const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 12 },
  tile: { backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  target: { borderColor: colors.text }, image: { width: '100%', height: '100%', borderRadius: 6 },
  hint: { color: colors.secondaryText, fontSize: 12, marginTop: 8 },
  addTile: { borderColor: colors.border, borderStyle: 'dashed', borderWidth: 1.5 },
  addTilePressed: { backgroundColor: colors.border },
  addIcon: { color: colors.secondaryText, fontSize: 34, fontWeight: '300' },
});
