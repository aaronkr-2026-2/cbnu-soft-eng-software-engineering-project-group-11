import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useTranslation } from '../../../i18n/useTranslation';
import type { PhotoStatus } from '../services/PhotoReferenceService';

export function PhotoResolutionStatus({ status, retry, relink }: { status: PhotoStatus; retry?: () => void; relink?: () => void }) {
  const { t } = useTranslation();
  const label = status === 'loading' ? 'photoLoading' : status === 'permission-denied' ? 'photosAccessRequired'
    : status === 'limited' ? 'photoAccessLimited' : status === 'temporary-error' ? 'photoTemporaryError' : 'photoUnavailable';
  const content = <View style={{ alignItems: 'center', justifyContent: 'center', padding: 4 }}>
    {status === 'loading' ? <ActivityIndicator color="#888" /> : null}
    <Text style={{ color: '#999', fontSize: 12, textAlign: 'center' }}>{t(label)}</Text>
    {retry && status !== 'loading' ? <Pressable accessibilityRole="button" onPress={retry} style={{ padding: 8 }}><Text style={{ color: '#999' }}>{t('photoRetry')}</Text></Pressable> : null}
    {relink && status !== 'loading' && status !== 'ready' ? <Pressable accessibilityRole="button" onPress={relink} style={{ padding: 8 }}><Text style={{ color: '#999' }}>{t('relinkPhoto')}</Text></Pressable> : null}
  </View>;
  // Keep Viewer controls responsive inside its paging/tap detector. Grid placeholders retain their parent selection gesture.
  return retry || relink ? <GestureDetector gesture={Gesture.Native().disallowInterruption(true)}>{content}</GestureDetector> : content;
}
