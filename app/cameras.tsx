import { useState } from 'react';
import { useTranslation } from '../src/i18n/useTranslation';
import { useNewRollDraftStore } from '../src/features/rolls/store/newRollDraftStore';
import { CustomCameraModal } from '../src/features/cameras/components/CustomCameraModal';
import { PrimaryButton } from '../src/components/ui/PrimaryButton';
import { createCamerasStyles } from '../src/features/cameras/styles/cameras.styles';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../src/components/ui/Screen';
import { useThemedStyles } from '../src/constants/theme';
import { CameraCard } from '../src/features/cameras/components/CameraCard';
import { useCameraStore } from '../src/features/cameras/store/cameraStore';

export default function Cameras() {
  const styles = useThemedStyles(createCamerasStyles);

  const router = useRouter();
  const { t } = useTranslation();
  const [custom, setCustom] = useState(false);
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const draftState = useNewRollDraftStore();
  const draft = (edit ? draftState.editDraft : draftState.draft) ?? draftState.draft;
  const update = edit ? draftState.updateEdit : draftState.update;
  function select(cameraId: string) { update({ cameraId }); if (router.canGoBack()) router.back(); else router.replace('/new-roll'); }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }
  const cameras = useCameraStore((state) => state.cameras);
  return <Screen><ScrollView contentContainerStyle={styles.content}><Pressable accessibilityRole="button" onPress={handleBack}><Text style={styles.back}>‹ {t('back')}</Text></Pressable><Text style={styles.title}>{t('cameras')}</Text><View style={styles.grid}>{cameras.map((camera) => <CameraCard camera={camera} key={camera.id} onPress={() => select(camera.id)} selected={camera.id === (draft.cameraId ?? cameras[0]?.id)} />)}</View><PrimaryButton label={t('addCustomCamera')} onPress={() => setCustom(true)} /></ScrollView>{custom ? <CustomCameraModal visible onClose={() => setCustom(false)} onAdded={select} /> : null}</Screen>;
}
