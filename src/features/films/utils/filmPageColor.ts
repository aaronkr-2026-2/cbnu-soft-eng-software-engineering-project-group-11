export const fallbackFilmPageColor = '#2C2C2E';

const toLinear = (value: number) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
const toSrgb = (value: number) => value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;

/** Darkens a cover color until white text on it stays readable; dark colors are kept as they are. */
export function readablePageColor(hex: string, maxLuminance = 0.1): string {
  if (!/^#[\da-f]{6}$/i.test(hex)) return fallbackFilmPageColor;
  const linear = [1, 3, 5].map(i => toLinear(parseInt(hex.slice(i, i + 2), 16) / 255));
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const scale = luminance > maxLuminance ? maxLuminance / luminance : 1;
  return '#' + linear.map(value => Math.round(toSrgb(value * scale) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}
