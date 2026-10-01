import { useTranslation } from '../../../i18n/useTranslation';
import { Image, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../../constants/theme';
import type { Camera } from '../../../types/models';
import { createCameraCardStyles } from '../styles/camera-card.styles';

type CameraCardProps = { camera: Camera; onPress: () => void; selected: boolean };

export function CameraCard({ camera, onPress, selected }: CameraCardProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createCameraCardStyles);

  const imageUri = camera.imageUri ?? camera.imageUrl;
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.card, selected && styles.selected]}>
    <View style={styles.imageArea}>{imageUri ? <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.image} /> : <Text style={styles.placeholder}>{t('camera')}</Text>}</View>
    <Text style={styles.brand}>{camera.brand}</Text><Text numberOfLines={1} style={styles.name}>{camera.model}</Text><Text style={styles.meta}>{camera.format ?? '35mm'}</Text>
  </Pressable>;
}
