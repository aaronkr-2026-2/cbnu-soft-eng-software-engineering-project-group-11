import type { Roll, RollFormat } from '../../rolls/types';

export const contactSheetWidth = 2400;

/** Format-specific geometry; non-35mm formats use a simple archival grid for now. */
export function getContactSheetLayout(format: RollFormat, photoCount: number) {
  const columns = 6;
  const padding = 96;
  const headerHeight = 104;
  const bottomPadding = 80;
  const stripGap = 36;
  const frameGap = 16;
  const stripPadding = 18;
  const frameWidth = Math.floor((contactSheetWidth - padding * 2 - stripPadding * 2 - frameGap * (columns - 1)) / columns);
  const frameHeight = Math.round(frameWidth * 2 / 3);
  const perforated = format === '35mm';
  const photoTop = perforated ? 70 : 42;
  const stripHeight = photoTop + frameHeight + (perforated ? 46 : 18);
  const rows = Math.ceil(Math.max(0, photoCount) / columns);
  const height = padding + headerHeight + rows * stripHeight + Math.max(0, rows - 1) * stripGap + bottomPadding;
  return { width: contactSheetWidth, height, columns, padding, headerHeight, bottomPadding,
    stripGap, frameGap, stripPadding, frameWidth, frameHeight, stripHeight, photoTop, perforated, rows };
}

export type ContactSheetLayout = ReturnType<typeof getContactSheetLayout>;

/** view-shot 5 uses UIKit point dimensions on iOS, physical bitmap dimensions on Android. */
export function contactSheetCaptureSize(layout: ContactSheetLayout, pixelRatio: number, platform: string) {
  const divisor = platform === 'ios' ? pixelRatio : 1;
  return { width: layout.width / divisor, height: layout.height / divisor };
}

export function orderedContactPhotos(roll: Roll) {
  return [...roll.photos].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function contactSheetRows<T>(photos: T[], columns: number): T[][] {
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Invalid contact sheet column count');
  const rows: T[][] = [];
  for (let index = 0; index < photos.length; index += columns) rows.push(photos.slice(index, index + columns));
  return rows;
}
