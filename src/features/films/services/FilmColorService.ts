import { requireOptionalNativeModule } from 'expo-modules-core';
import { Image } from 'react-native';
import type { Film } from '../../../types/models';
import { FILM_ASSETS } from '../data/filmAssets';
import { fallbackFilmPageColor, readablePageColor } from '../utils/filmPageColor';
import { filmImageUri } from './FilmCoverStorage';

type NativeColor = { averageColor?: (uri: string, band: number) => Promise<string> };
const native = (() => {
  try { return requireOptionalNativeModule<NativeColor>('FiLogPhotos'); } catch { return null; }
})();
const cache = new Map<string, string>();

/** Page tint for a film's info sheet: the bottom band of its cover, darkened for white text. */
export async function filmPageColor(film: Film): Promise<string> {
  const asset = film.imageKey ? FILM_ASSETS[film.imageKey] : undefined;
  const uri = filmImageUri(film) ?? (asset ? Image.resolveAssetSource(asset)?.uri : undefined);
  // Development builds serve bundled assets over HTTP; the native reader only takes files.
  if (!uri?.startsWith('file:') || !native?.averageColor) return fallbackFilmPageColor;
  const cached = cache.get(uri);
  if (cached) return cached;
  try {
    const color = readablePageColor(await native.averageColor(uri, 0.3));
    cache.set(uri, color);
    return color;
  } catch { return fallbackFilmPageColor; }
}
