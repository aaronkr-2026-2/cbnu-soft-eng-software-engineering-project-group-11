import { contactSheetRatioValues, contactSheetStripStyles, type ContactSheetExportRatio, type ContactSheetFrameStyle } from './contactSheetAppearance';
import type { Roll, RollFormat } from '../../rolls/types';

export const contactSheetWidth = 2400;

/** Format-specific geometry; non-35mm formats use a simple archival grid for now. */
export function getContactSheetLayout(format: RollFormat, photoCount: number, frameStyle: ContactSheetFrameStyle = 'film-strip', columns = 6) {
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Invalid contact sheet column count');
  // Frame card: one rounded dark panel over a full-bleed photo, labelled edges above and below each photo.
  const card = frameStyle === 'frame-card';
  const padding = card ? 40 : 96;
  const headerHeight = 104;
  const bottomPadding = card ? 140 : 80;
  const stripGap = card ? 0 : 36;
  const classicSprocket = frameStyle === 'classic-sprocket';
  const vertical = frameStyle === 'film-strip-dark' || classicSprocket;
  // Borders stay inside half the frame gap; instant prints keep a visible gap and use the space below for their chin.
  const borderWidth = frameStyle === 'instant' ? 4 : ['white-border', 'black-border', 'warm-print'].includes(frameStyle) ? 6 : 0;
  const chin = frameStyle === 'instant' ? 30 : 0;
  const strip = contactSheetStripStyles.includes(frameStyle);
  const frameGap = classicSprocket ? 88 : card ? 36 : 16;
  const stripPadding = classicSprocket ? 44 : card ? 52 : 18;
  // Classic sprocket widens the sheet around the standard aperture; other styles fit inside it.
  const frameWidth = card ? Math.floor((contactSheetWidth - padding * 2 - stripPadding * 2 - frameGap * (columns - 1)) / columns)
    : Math.floor((contactSheetWidth - padding * 2 - 18 * 2 - 16 * (columns - 1)) / columns);
  const frameHeight = Math.round(frameWidth * 2 / 3);
  // 120 rebates have no sprocket holes.
  const perforated = vertical || (strip && frameStyle !== 'medium-format' && format === '35mm');
  const photoTop = card ? 116 : format === '35mm' ? 70 : 42;
  const stripHeight = photoTop + frameHeight + (card ? 130 : format === '35mm' ? 46 : 18);
  const rows = Math.ceil(Math.max(0, photoCount) / columns);
  const height = padding + headerHeight + rows * stripHeight + Math.max(0, rows - 1) * stripGap + bottomPadding;
  const width = contactSheetWidth + (classicSprocket ? (44 - 18) * 2 + (88 - 16) * (columns - 1) : 0);
  return { width, height, columns, padding, headerHeight, bottomPadding,
    stripGap, frameGap, stripPadding, frameWidth, frameHeight, stripHeight, photoTop, perforated, rows, frameStyle, borderWidth, chin, strip, vertical, card };
}

export type ContactSheetLayout = ReturnType<typeof getContactSheetLayout>;

export type ContactSheetCanvasFrame = { width: number; height: number; x: number; y: number };

/** Grows the canvas to the chosen ratio around the unchanged sheet (no crop, no scaling), keeping it centred. */
export function getContactSheetCanvasFrame(layout: Pick<ContactSheetLayout, 'width' | 'height'>, ratio: ContactSheetExportRatio = 'original'): ContactSheetCanvasFrame {
  const target = ratio === 'original' ? undefined : contactSheetRatioValues[ratio];
  if (!target) return { width: layout.width, height: layout.height, x: 0, y: 0 };
  const width = layout.width / layout.height >= target ? layout.width : Math.ceil(layout.height * target);
  const height = layout.width / layout.height >= target ? Math.ceil(layout.width / target) : layout.height;
  return { width, height, x: Math.floor((width - layout.width) / 2), y: Math.floor((height - layout.height) / 2) };
}

/** view-shot 5 uses UIKit point dimensions on iOS, physical bitmap dimensions on Android. */
export function contactSheetCaptureSize(layout: { width: number; height: number }, pixelRatio: number, platform: string) {
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
