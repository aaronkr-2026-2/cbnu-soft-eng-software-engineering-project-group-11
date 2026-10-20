import { filmImageUri } from '../services/FilmCoverStorage';
import { useState } from 'react';
import { Image, Text, View, type ImageProps, type StyleProp, type TextStyle } from 'react-native';
import type { Film } from '../../../types/models';
import { useTranslation } from '../../../i18n/useTranslation';
import { FILM_ASSETS } from '../data/filmAssets';

/** Scale the entire bundled card to its frame, retaining every printed detail. */
export function FilmImage({ film, style, placeholderStyle, placeholder, resizeMode }: {
  film?: Film; style: ImageProps['style']; placeholderStyle?: StyleProp<TextStyle>;
  placeholder?: string; resizeMode?: ImageProps['resizeMode'];
}) {
  const { t } = useTranslation();
  const uri = filmImageUri(film);
  const key = uri ?? film?.imageKey;
  const source = uri ? { uri } : key ? FILM_ASSETS[key] : undefined;
  const [failedKey, setFailedKey] = useState<string>();
  return source && key !== failedKey
    ? <Image source={source} style={style} resizeMode={resizeMode ?? (uri ? 'cover' : 'stretch')} onError={() => setFailedKey(key)} />
    : <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}><Text style={placeholderStyle}>{placeholder ?? t('film')}</Text></View>;
}
