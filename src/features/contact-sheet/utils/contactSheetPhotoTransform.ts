/** Dimensions must come from the native decoder (display orientation, including EXIF). */
export function getContactSheetPhotoTransform(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number) {
  if (![imageWidth, imageHeight, frameWidth, frameHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Invalid contact sheet image dimensions');
  }
  const rotation = imageHeight > imageWidth ? 90 : 0;
  const rotatedWidth = rotation === 90 ? imageHeight : imageWidth;
  const rotatedHeight = rotation === 90 ? imageWidth : imageHeight;
  const scale = Math.max(frameWidth / rotatedWidth, frameHeight / rotatedHeight);
  // RN rotates around the image center. Center its unrotated box in the opening first.
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return { rotation, scale, width, height,
    offsetX: (frameWidth - width) / 2, offsetY: (frameHeight - height) / 2 };
}
