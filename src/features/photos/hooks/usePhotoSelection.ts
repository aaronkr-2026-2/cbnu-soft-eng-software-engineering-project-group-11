import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PhotoReference } from '../types';

/** Temporary selection belongs to this screen, never to the persisted archive. */
export function usePhotoSelection(photos: PhotoReference[]) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const active = useRef(false);
  const isSelecting = useCallback(() => active.current, []);
  const selectedPhotos = useMemo(() => photos.filter(photo => selectedIds.has(photo.id)), [photos, selectedIds]);
  const enter = useCallback(() => { active.current = true; setSelectedIds(new Set()); setSelectionMode(true); }, []);
  const exit = useCallback(() => { active.current = false; setSelectionMode(false); setSelectedIds(new Set()); }, []);
  const toggle = useCallback((id: string) => {
    if (!active.current) return;
    setSelectedIds(previous => { const next = new Set(previous); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  const addRange = useCallback((start: number, end: number) => {
    if (!active.current) return;
    setSelectedIds(previous => {
      const next = new Set(previous);
      for (let i = Math.max(0, start); i <= Math.min(end, photos.length - 1); i++) next.add(photos[i].id);
      return next.size === previous.size ? previous : next;
    });
  }, [photos]);
  const allSelected = photos.length > 0 && selectedPhotos.length === photos.length;
  const toggleAll = useCallback(() => {
    if (active.current) setSelectedIds(allSelected ? new Set() : new Set(photos.map(photo => photo.id)));
  }, [allSelected, photos]);
  useEffect(() => {
    const available = new Set(photos.map(photo => photo.id));
    setSelectedIds(previous => {
      const next = new Set([...previous].filter(id => available.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [photos]);
  return { selectionMode, selectedIds, selectedPhotos, allSelected, enter, exit, toggle, addRange, toggleAll, isSelecting };
}
