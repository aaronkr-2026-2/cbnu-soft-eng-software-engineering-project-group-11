export const contactSheetBackgrounds = ['black', 'white', 'cream', 'gray', 'kraft', 'slate', 'darkroom', 'custom'] as const;
export const contactSheetFrameStyles = ['none', 'white-border', 'black-border', 'warm-print', 'instant', 'film-strip', 'film-strip-dark', 'color-negative', 'bw-negative', 'medium-format'] as const;
export type ContactSheetBackground = typeof contactSheetBackgrounds[number];
export type ContactSheetFrameStyle = typeof contactSheetFrameStyles[number];
export type ContactSheetAppearance = { background: ContactSheetBackground; customColor: string; frameStyle: ContactSheetFrameStyle };
export const defaultContactSheetAppearance: ContactSheetAppearance = { background: 'black', customColor: '#242424', frameStyle: 'film-strip' };
export const contactSheetPresetColors = { black: '#000000', white: '#FFFFFF', cream: '#F4EBDD', gray: '#242424', kraft: '#C4A27A', slate: '#2F3B45', darkroom: '#2A0D0D' };
/** Styles printed as a horizontal film rebate behind each row. */
export const contactSheetStripStyles: readonly ContactSheetFrameStyle[] = ['film-strip', 'color-negative', 'bw-negative', 'medium-format'];
// Generic rebate colors only; no manufacturer edge printing is reproduced.
const rebates: Partial<Record<ContactSheetFrameStyle, { strip: string; number: string }>> = {
  'film-strip': { strip: '#EFECE5', number: '#171717' },
  'film-strip-dark': { strip: '#141414', number: '#D58B45' },
  'color-negative': { strip: '#B4632F', number: '#F6C453' },
  'bw-negative': { strip: '#1E1D1B', number: '#E7E2D6' },
  'medium-format': { strip: '#151515', number: '#E9D9A6' },
};
export function normalizeContactSheetHex(value: string): string | undefined {
  const hex = value.trim().replace(/^#/, '');
  return /^[\da-f]{6}$/i.test(hex) ? '#' + hex.toUpperCase() : undefined;
}
export function validateContactSheetAppearance(value: unknown): ContactSheetAppearance {
  const item = value && typeof value === 'object' ? value as Partial<ContactSheetAppearance> : {};
  return {
    background: contactSheetBackgrounds.includes(item.background as ContactSheetBackground) ? item.background! : defaultContactSheetAppearance.background,
    customColor: typeof item.customColor === 'string' ? normalizeContactSheetHex(item.customColor) ?? defaultContactSheetAppearance.customColor : defaultContactSheetAppearance.customColor,
    frameStyle: contactSheetFrameStyles.includes(item.frameStyle as ContactSheetFrameStyle) ? item.frameStyle! : defaultContactSheetAppearance.frameStyle,
  };
}
export function contactSheetBackgroundColor(appearance: ContactSheetAppearance) {
  return appearance.background === 'custom' ? appearance.customColor : contactSheetPresetColors[appearance.background];
}
export function contactSheetPalette(appearance: ContactSheetAppearance = defaultContactSheetAppearance) {
  const settings = validateContactSheetAppearance(appearance);
  const background = contactSheetBackgroundColor(settings);
  // Relative luminance chooses a readable header/number color on user-selected backgrounds.
  const channels = [1, 3, 5].map(i => parseInt(background.slice(i, i + 2), 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const ink = luminance > 0.179 ? '#171717' : '#EFECE5';
  const rebate = rebates[settings.frameStyle];
  return { background, header: ink, strip: rebate?.strip ?? '#EFECE5',
    border: settings.frameStyle === 'black-border' ? '#000000' : settings.frameStyle === 'warm-print' ? '#E8D9BC' : settings.frameStyle === 'instant' ? '#F7F5EF' : '#FFFFFF',
    number: rebate?.number ?? ink,
    hole: background, edge: '#36302A', marking: '#D58B45' };
}
