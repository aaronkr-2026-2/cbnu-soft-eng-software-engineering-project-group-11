import { FilmImage } from '../../films/components/FilmImage';
import { resolveRollFilm } from '../../films/utils/resolveRollFilm';
import { useTranslation } from '../../../i18n/useTranslation';
import { Text, View } from 'react-native';

import { Card } from '../../../components/ui/Card';
import { useThemedStyles } from '../../../constants/theme';
import { useFilmStore } from '../../films/store/filmStore';
import { isValidLocation, locationLabel } from '../../location/services/locationService';
import type { Roll } from '../types';
import { RollThumbnailStrip } from './RollThumbnailStrip';
import { formatRollMonth } from '../utils/rollMonth';
import { createRollCardStyles } from '../styles/roll-card.styles';

type RollCardProps = {
  onPress: () => void;
  roll: Roll;
};

export function RollCard({ onPress, roll }: RollCardProps) {
  const { t, language } = useTranslation();
  const styles = useThemedStyles(createRollCardStyles);
  const film = useFilmStore((state) => resolveRollFilm(state.films, roll));
  const format = roll.format === 'other' ? t('other') : roll.format;
  const when = [formatRollMonth(roll.date, language), isValidLocation(roll.location) ? locationLabel(roll.location) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card
      accessibilityLabel={t('openRoll', { name: roll.filmName })}
      onPress={onPress}
      pressedStyle={styles.pressed}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <View style={styles.filmImage}>
          <FilmImage film={film} style={styles.filmImageFill} placeholderStyle={styles.filmImageText} placeholder={format} />
        </View>
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.filmName}>{film ? `${film.brand} ${film.name}` : roll.filmName}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{roll.cameraName} · {format}</Text>
          <Text numberOfLines={1} style={styles.subtitle}>{when}</Text>
        </View>
        <Text style={styles.photoCount}>{roll.photos.length} {t('photoUnit')}</Text>
      </View>

      <RollThumbnailStrip photos={roll.photos} />
    </Card>
  );
}
