import { requireOptionalNativeModule } from 'expo-modules-core';

/** Film and camera covers are always shown in this frame (138 × 112 cards, 1.23 detail thumbnails). */
export const coverAspectRatio = 1.23;

export type CropRect = { x: number; y: number; width: number; height: number };
type NativeCrop = { cropImage?: (uri: string, x: number, y: number, width: number, height: number, maxWidth: number) => Promise<string> };

const native = (() => {
  try { return requireOptionalNativeModule<NativeCrop>('FiLogPhotos'); } catch { return null; }
})();

/** Whether this build can crop; older native builds keep the picked image as it is. */
export const cropAvailable = typeof native?.cropImage === 'function';

export async function cropImage(uri: string, rect: CropRect, maxWidth = 1200): Promise<string> {
  if (!native?.cropImage) return uri;
  return native.cropImage(uri, rect.x, rect.y, rect.width, rect.height, maxWidth);
}

/**
 * Converts the on-screen framing into a 0...1 crop of the image. The image is laid out to cover the
 * frame at `zoom` 1, centered, then zoomed and moved by (`offsetX`, `offsetY`) points.
 */
export function cropFromFraming({ imageWidth, imageHeight, frameWidth, frameHeight, zoom, offsetX, offsetY }: {
  imageWidth: number; imageHeight: number; frameWidth: number; frameHeight: number; zoom: number; offsetX: number; offsetY: number;
}): CropRect {
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom;
  const shownWidth = imageWidth * scale, shownHeight = imageHeight * scale;
  const left = (frameWidth - shownWidth) / 2 + offsetX;
  const top = (frameHeight - shownHeight) / 2 + offsetY;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const width = clamp(frameWidth / shownWidth), height = clamp(frameHeight / shownHeight);
  return { x: Math.min(clamp(-left / shownWidth), 1 - width), y: Math.min(clamp(-top / shownHeight), 1 - height), width, height };
}
