import type { PhotoReference } from '../types';

export function orderedSelectedPhotos(photos: PhotoReference[], ids: ReadonlySet<string>) {
  return photos.filter(photo => ids.has(photo.id)).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function photoIndexAtPoint(x: number, y: number, size: number, gap: number, count: number): number {
  'worklet';
  if (size <= 0 || x < 0 || y < 0) return -1;
  const step = size + gap;
  const column = Math.floor(x / step);
  const row = Math.floor(y / step);
  if (column >= 3 || x - column * step > size || y - row * step > size) return -1;
  const index = row * 3 + column;
  return index < count ? index : -1;
}

export function selectionDragIntent(dx: number, dy: number): 'wait' | 'scroll' | 'select' {
  'worklet';
  const slop = 6;
  if (Math.abs(dy) > slop && Math.abs(dy) >= Math.abs(dx)) return 'scroll';
  if (Math.abs(dx) > slop && Math.abs(dx) > Math.abs(dy)) return 'select';
  return 'wait';
}
