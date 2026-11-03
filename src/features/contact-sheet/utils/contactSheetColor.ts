/** Clamp touch positions and channels before converting to an opaque RGB color. */
export function colorChannelAt(x: number, width: number) {
  return Math.round(Math.max(0, Math.min(1, x / Math.max(1, width))) * 255);
}
export function replaceColorChannel(color: string, channel: number, value: number) {
  const offset = 1 + channel * 2;
  const hex = Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0').toUpperCase();
  return color.slice(0, offset) + hex + color.slice(offset + 2);
}
