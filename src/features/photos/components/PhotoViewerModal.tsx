import { useTranslation } from '../../../i18n/useTranslation';
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Keyboard, Linking, KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withDecay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BackButton } from '../../../components/ui/BackButton';
import { photoViewerModalStyles as styles } from '../styles/photo-viewer-modal.styles';
import type { PhotoDetailsPatch, PhotoReference } from '../types';
import { formatPhotoDate } from '../utils/photoDate';
import { useResolvedPhoto } from '../hooks/useResolvedPhoto';
import { PhotoResolutionStatus } from './PhotoResolutionStatus';
import { relinkPhoto } from '../services/PhotoRelinkService';
import { PhotoShareService } from '../services/PhotoShareService';
import { applePhotosProvider } from '../providers/ApplePhotosProvider';
import { invalidatePhotoRenders } from '../services/PhotoReferenceService';
import { PhotoInfoSheet } from './PhotoInfoSheet';

// Gap between photos while paging, as in the Photos app.
const pageGap = 20;
const maxScale = 5;
const doubleTapScale = 2.5;
// Downward swipe that closes the viewer.
const dismissDistance = 100;
const dismissVelocity = 800;
// Swipe that raises or lowers the info sheet.
const sheetDistance = 60;
const sheetVelocity = 500;
// Share of the screen width (or fling speed) that commits a page change.
const pageDistance = 0.3;
const pageVelocity = 500;

const pageSpring = { damping: 26, stiffness: 260, mass: 0.9 };
const settleSpring = { damping: 22, stiffness: 240 };

// Gesture modes, decided when a one-finger drag starts.
const NONE = 0;
const PAGE = 1;
const ZOOM_PAN = 2;
const DISMISS = 3;
const SHEET = 4;

type Size = { width: number; height: number };

type PhotoViewerModalProps = {
  visible: boolean;
  rollId: string;
  photos: PhotoReference[];
  initialIndex: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onPhotoChange: (photoId: string, patch: PhotoDetailsPatch) => void;
};

export function PhotoViewerModal({ visible, ...props }: PhotoViewerModalProps) {
  // Unmount paging state on close so every opening starts at the tapped thumbnail.
  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" presentationStyle="overFullScreen" onRequestClose={props.onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <Viewer {...props} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}

/** Size of a photo fitted inside the stage, as displayed (a quarter turn swaps its sides). */
function fitSize(natural: Size | undefined, stage: Size, rotation: number): Size {
  if (!natural || !natural.width || !natural.height || !stage.width || !stage.height) return stage;
  const sideways = rotation % 180 !== 0;
  const aspect = sideways ? natural.height / natural.width : natural.width / natural.height;
  return stage.width / stage.height > aspect
    ? { width: stage.height * aspect, height: stage.height }
    : { width: stage.width, height: stage.width / aspect };
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

/** Lets a value travel past its limits with growing resistance, like an iOS scroll view edge. */
function rubberBand(value: number, min: number, max: number) {
  'worklet';
  if (value < min) return min - (min - value) / 3;
  if (value > max) return max + (value - max) / 3;
  return value;
}

function Viewer({ rollId, photos, initialIndex, title, subtitle, onClose, onPhotoChange }: Omit<PhotoViewerModalProps, 'visible'>) {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState<Size>({ width: 0, height: 0 });
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, photos.length - 1)));
  const [rotations, setRotations] = useState<Record<string, number>>({});
  const [naturalSizes, setNaturalSizes] = useState<Record<string, Size>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [chromeHidden, setChromeHidden] = useState(false);

  const current = photos[index];
  const currentResolution = useResolvedPhoto(current, 'full');
  const currentUri = currentResolution.uri;
  const rotation = current ? rotations[current.id] ?? 0 : 0;
  const fitted = fitSize(current ? naturalSizes[current.id] : undefined, stage, rotation);

  // Everything the gestures touch lives on the UI thread so dragging never waits on JavaScript.
  const stageW = useSharedValue(0);
  const stageH = useSharedValue(0);
  const fitW = useSharedValue(0);
  const fitH = useSharedValue(0);
  const indexSV = useSharedValue(index);
  const count = useSharedValue(photos.length);
  const stripX = useSharedValue(0);
  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const dismissX = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const sheet = useSharedValue(0);
  const sheetH = useSharedValue(420);
  const sheetOpenSV = useSharedValue(false);
  const chrome = useSharedValue(1);
  const exit = useSharedValue(1);
  const closing = useSharedValue(false);
  const mode = useSharedValue(NONE);
  const pinching = useSharedValue(false);
  const rebase = useSharedValue(false);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);
  const startSheet = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  useEffect(() => { count.value = photos.length; }, [photos.length, count]);
  useEffect(() => { fitW.value = fitted.width; fitH.value = fitted.height; }, [fitted.width, fitted.height, fitW, fitH]);
  useEffect(() => {
    // Keep the strip on the current photo whenever the stage is (re)measured.
    stageW.value = stage.width; stageH.value = stage.height;
    stripX.value = -indexSV.value * (stage.width + pageGap);
  }, [stage.width, stage.height, stageW, stageH, stripX, indexSV]);

  function rotate() {
    if (!current) return;
    scale.value = withTiming(1, { duration: 140 }); tx.value = withTiming(0, { duration: 140 }); ty.value = withTiming(0, { duration: 140 });
    setRotations((state) => ({ ...state, [current.id]: ((state[current.id] ?? 0) + 90) % 360 }));
  }

  function openSheet(open: boolean) {
    setSheetOpen(open);
    if (!open) Keyboard.dismiss();
  }

  function toggleChrome() {
    setChromeHidden((hidden) => {
      chrome.value = withTiming(hidden ? 1 : 0, { duration: 180 });
      return !hidden;
    });
  }

  // ─── Gestures (the callbacks below run on the UI thread) ───

  function boundX(s: number) {
    'worklet';
    return Math.max(0, (fitW.value * s - stageW.value) / 2);
  }
  function boundY(s: number) {
    'worklet';
    return Math.max(0, (fitH.value * s - stageH.value) / 2);
  }
  function pageOffset(i: number) {
    'worklet';
    return -i * (stageW.value + pageGap);
  }
  function settlePage(velocityX: number) {
    'worklet';
    const offset = stripX.value - pageOffset(indexSV.value);
    let target = indexSV.value;
    if (offset < -stageW.value * pageDistance || (velocityX < -pageVelocity && offset < 0)) target += 1;
    else if (offset > stageW.value * pageDistance || (velocityX > pageVelocity && offset > 0)) target -= 1;
    target = clamp(target, 0, count.value - 1);
    stripX.value = withSpring(pageOffset(target), { ...pageSpring, velocity: velocityX });
    if (target !== indexSV.value) {
      indexSV.value = target;
      scale.value = 1; tx.value = 0; ty.value = 0;
      scheduleOnRN(setIndex, target);
    }
  }
  function settleSheet(open: boolean, velocityY: number) {
    'worklet';
    sheetOpenSV.value = open;
    sheet.value = withTiming(open ? 1 : 0, {
      duration: 180,
    });
    scheduleOnRN(openSheet, open);
  }

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart((event) => {
      startX.value = tx.value; startY.value = ty.value; startSheet.value = sheet.value;
      rebase.value = false;
      if (closing.value) mode.value = NONE;
      else if (pinching.value || scale.value > 1.01) mode.value = ZOOM_PAN;
      else if (Math.abs(event.translationX) > Math.abs(event.translationY)) mode.value = PAGE;
      else if (sheetOpenSV.value || event.translationY < 0) mode.value = SHEET;
      else mode.value = DISMISS;
    })
    .onUpdate((event) => {
      if (pinching.value) return;
      const base = pageOffset(indexSV.value);
      const lastPage = pageOffset(count.value - 1);
      if (mode.value === PAGE) {
        stripX.value = rubberBand(base + event.translationX, lastPage, 0);
      } else if (mode.value === ZOOM_PAN) {
        if (rebase.value) { startX.value = tx.value - event.translationX; startY.value = ty.value - event.translationY; rebase.value = false; }
        const bx = boundX(scale.value);
        const by = boundY(scale.value);
        const rawX = startX.value + event.translationX;
        const clampedX = clamp(rawX, -bx, bx);
        tx.value = clampedX;
        // Dragging past the photo's edge carries on into the neighbouring photo.
        stripX.value = rubberBand(base + (rawX - clampedX), lastPage, 0);
        ty.value = rubberBand(startY.value + event.translationY, -by, by);
      } else if (mode.value === DISMISS) {
        dismissX.value = event.translationX;
        dismissY.value = event.translationY;
      } else if (mode.value === SHEET) {
        sheet.value = clamp(startSheet.value - event.translationY / sheetH.value, 0, 1);
      }
    })
    .onEnd((event) => {
      if (mode.value === PAGE) {
        settlePage(event.velocityX);
      } else if (mode.value === ZOOM_PAN) {
        if (Math.abs(stripX.value - pageOffset(indexSV.value)) > 1) settlePage(event.velocityX);
        else {
          const bx = boundX(scale.value);
          const by = boundY(scale.value);
          tx.value = withDecay({ velocity: event.velocityX, clamp: [-bx, bx] });
          ty.value = ty.value < -by || ty.value > by
            ? withSpring(clamp(ty.value, -by, by), settleSpring)
            : withDecay({ velocity: event.velocityY, clamp: [-by, by] });
        }
      } else if (mode.value === DISMISS) {
        if (event.translationY > dismissDistance || event.velocityY > dismissVelocity) {
          closing.value = true;
          dismissY.value = withTiming(stageH.value, { duration: 220 });
          exit.value = withTiming(0, { duration: 220 }, (finished) => { if (finished) scheduleOnRN(onClose); });
        } else {
          dismissX.value = withSpring(0, settleSpring);
          dismissY.value = withSpring(0, settleSpring);
        }
      } else if (mode.value === SHEET) {
        settleSheet(startSheet.value > 0.5
          ? !(event.translationY > sheetDistance || event.velocityY > sheetVelocity)
          : -event.translationY > sheetDistance || event.velocityY < -sheetVelocity, event.velocityY);
      }
      mode.value = NONE;
    });

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      if (closing.value || sheetOpenSV.value || (mode.value !== NONE && mode.value !== ZOOM_PAN)) return;
      pinching.value = true;
      startScale.value = scale.value; startX.value = tx.value; startY.value = ty.value;
      originX.value = event.focalX - stageW.value / 2;
      originY.value = event.focalY - stageH.value / 2;
    })
    .onUpdate((event) => {
      if (!pinching.value) return;
      const next = clamp(startScale.value * event.scale, 1, maxScale);
      const ratio = next / startScale.value;
      // Keep the point between the fingers under the fingers, and follow them as they move.
      tx.value = event.focalX - stageW.value / 2 - (originX.value - startX.value) * ratio;
      ty.value = event.focalY - stageH.value / 2 - (originY.value - startY.value) * ratio;
      scale.value = next;
    })
    .onEnd(() => {
      if (!pinching.value) return;
      pinching.value = false;
      rebase.value = true;
      const target = clamp(scale.value, 1, maxScale);
      const ratio = target / scale.value;
      const bx = boundX(target);
      const by = boundY(target);
      scale.value = withTiming(target, { duration: 140 });
      tx.value = withTiming(clamp(tx.value * ratio, -bx, bx), { duration: 140 });
      ty.value = withTiming(clamp(ty.value * ratio, -by, by), { duration: 140 });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(20)
    .onEnd((event) => {
      if (closing.value || sheetOpenSV.value) return;
      if (scale.value > 1.01) {
        scale.value = withTiming(1, { duration: 140 }); tx.value = withTiming(0, { duration: 140 }); ty.value = withTiming(0, { duration: 140 });
        return;
      }
      // Zoom in on the tapped spot.
      const bx = boundX(doubleTapScale);
      const by = boundY(doubleTapScale);
      scale.value = withTiming(doubleTapScale, { duration: 140 });
      tx.value = withTiming(clamp(-(event.x - stageW.value / 2) * (doubleTapScale - 1), -bx, bx), { duration: 140 });
      ty.value = withTiming(clamp(-(event.y - stageH.value / 2) * (doubleTapScale - 1), -by, by), { duration: 140 });
    });

  const singleTap = Gesture.Tap()
    .maxDistance(10)
    .onEnd(() => {
      if (closing.value) return;
      // With the sheet up a tap lowers it; otherwise it shows or hides the bars.
      if (sheetOpenSV.value) settleSheet(false, 0);
      else scheduleOnRN(toggleChrome);
    });

  const stageGesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));

  // Dragging the sheet's grab handle down lowers it.
  const handleGesture = Gesture.Pan()
    .onStart(() => { startSheet.value = sheet.value; })
    .onUpdate((event) => { sheet.value = clamp(startSheet.value - event.translationY / sheetH.value, 0, 1); })
    .onEnd((event) => { settleSheet(!(event.translationY > sheetDistance || event.velocityY > sheetVelocity), event.velocityY); });

  // ─── Animated styles ───

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: exit.value * interpolate(Math.abs(dismissY.value), [0, 320], [1, 0], Extrapolation.CLAMP),
  }));
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.value * exit.value * interpolate(Math.abs(dismissY.value), [0, 80], [1, 0], Extrapolation.CLAMP),
  }));
  const footerStyle = useAnimatedStyle(() => ({
    opacity: chrome.value * exit.value
      * interpolate(Math.abs(dismissY.value), [0, 80], [1, 0], Extrapolation.CLAMP)
      * interpolate(sheet.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));
  const stripStyle = useAnimatedStyle(() => ({ transform: [{ translateX: stripX.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: sheet.value * 0.35 }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - sheet.value) * (sheetH.value + 40) }] }));

  async function share() {
    if (!currentUri) return;
    if (!current) return;
    try { await PhotoShareService.sharePhotos([current]); } catch { Alert.alert(t('sharePhoto'), t('photoTemporaryError')); }
  }

  const position = photos.length ? `${index + 1} / ${photos.length}` : '0 / 0';
  const dateLabel = current?.takenAt ? formatPhotoDate(current.takenAt, language) : subtitle;
  // Only the current photo and its neighbours are mounted.
  const mounted = photos.map((photo, photoIndex) => ({ photo, photoIndex })).filter(({ photoIndex }) => Math.abs(photoIndex - index) <= 1);
  const slotShared = { indexSV, scale, tx, ty, dismissX, dismissY, sheet, sheetH };

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      <GestureDetector gesture={stageGesture}>
        <View style={styles.stage} onLayout={(event) => setStage({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
          {stage.width > 0 ? <Animated.View style={[styles.strip, stripStyle]}>
            {mounted.map(({ photo, photoIndex }) => <PhotoSlot
              key={photo.id}
              photo={photo}
              full={photoIndex === index}
              onRelink={async () => {
                try { await relinkPhoto(rollId, photo.id); } catch { Alert.alert(t('relinkPhoto'), t('photoRelinkError')); }
              }}
              photoIndex={photoIndex}
              stage={stage}
              rotation={rotations[photo.id] ?? 0}
              natural={naturalSizes[photo.id]}
              onNaturalSize={(size) => setNaturalSizes((state) => ({ ...state, [photo.id]: size }))}
              shared={slotShared}
            />)}
            {photos.length === 0 ? <View style={[styles.slot, { width: stage.width, height: stage.height, left: 0 }]}><Text style={styles.unavailable}>{t('photoUnavailable')}</Text></View> : null}
          </Animated.View> : null}
        </View>
      </GestureDetector>

      <Animated.View pointerEvents={chromeHidden ? 'none' : 'box-none'} style={[styles.toolbar, { paddingTop: insets.top + 8 }, chromeStyle]}>
        <BackButton tone="dark" accessibilityLabel={t('closeViewer')} onPress={onClose} />
        <View style={styles.titlePill}>
          <Text numberOfLines={1} style={styles.title}>{title}</Text>
          <Text accessibilityLabel={t('photoPosition', { current: photos.length ? index + 1 : 0, total: photos.length })} numberOfLines={1} style={styles.subtitle}>
            {dateLabel ? `${dateLabel} · ${position}` : position}
          </Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sharePhoto')} disabled={!currentUri} onPress={share} style={styles.circleButton}>
          <ShareIcon />
        </Pressable>
      </Animated.View>

      <Animated.View pointerEvents={chromeHidden || sheetOpen ? 'none' : 'box-none'} style={[styles.footer, { paddingBottom: insets.bottom + 12 }, footerStyle]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('rotate')} disabled={!current} onPress={rotate} style={({ pressed }) => [styles.rotateButton, pressed && styles.pressed]}>
          <RotateIcon />
          <Text style={styles.rotateText}>{t('rotate')}</Text>
        </Pressable>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      {current ? <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetLayer}>
        <Animated.View
          pointerEvents={sheetOpen ? 'auto' : 'none'}
          onLayout={(event) => { sheetH.value = event.nativeEvent.layout.height; }}
          style={[{ paddingBottom: insets.bottom + 8 }, sheetStyle]}
        >
          <PhotoInfoSheet photo={current} onChange={(patch) => onPhotoChange(current.id, patch)} handleGesture={handleGesture} />
        </Animated.View>
      </KeyboardAvoidingView> : null}
    </View>
  );
}

type SlotShared = {
  indexSV: SharedValue<number>; scale: SharedValue<number>; tx: SharedValue<number>; ty: SharedValue<number>;
  dismissX: SharedValue<number>; dismissY: SharedValue<number>; sheet: SharedValue<number>; sheetH: SharedValue<number>;
};

function PhotoSlot({ photo, full, onRelink, photoIndex, stage, rotation, natural, onNaturalSize, shared }: {
  photo: PhotoReference; full: boolean; onRelink: () => Promise<void>; photoIndex: number; stage: Size; rotation: number; natural?: Size;
  onNaturalSize: (size: Size) => void; shared: SlotShared;
}) {
  const { t } = useTranslation();
  const relinking = useRef(false);
  const resolution = useResolvedPhoto(photo, full ? 'full' : 'thumbnail');
  const { uri } = resolution;
  const fitted = fitSize(natural, stage, rotation);
  const sideways = rotation % 180 !== 0;
  const { indexSV, scale, tx, ty, dismissX, dismissY, sheet, sheetH } = shared;
  const stageHeight = stage.height;

  // Only the current photo follows the zoom, dismiss and sheet gestures; its neighbours stay at rest.
  const outerStyle = useAnimatedStyle(() => {
    if (indexSV.value !== photoIndex) return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    return {
      transform: [
        { translateX: dismissX.value },
        // The photo rises with the info sheet so its upper part stays in view.
        { translateY: dismissY.value - sheet.value * Math.min(sheetH.value, stageHeight) * 0.35 },
        { scale: 1 },
      ],
    };
  });
  const zoomStyle = useAnimatedStyle(() => {
    if (indexSV.value !== photoIndex) return { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    return { transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] };
  });

  return (
    <View style={[styles.slot, { width: stage.width, height: stage.height, left: photoIndex * (stage.width + pageGap) }]}>
      <Animated.View style={[styles.fill, { width: stage.width, height: stage.height }, outerStyle]}>
        <Animated.View style={[styles.fill, { width: stage.width, height: stage.height }, zoomStyle]}>
          {!uri ? <PhotoResolutionStatus status={resolution.status} retry={() => {
            if (resolution.status === 'limited') {
              void applePhotosProvider.manageAccess().catch(() => Alert.alert(t('photoAccessLimited'), t('photoAccessHelp'))).finally(invalidatePhotoRenders);
            } else if (resolution.status === 'permission-denied') {
              void Linking.openSettings().catch(() => Alert.alert(t('photosAccessRequired'), t('photoAccessHelp')));
            } else resolution.retry();
          }} relink={photo.provider === 'apple-photos' ? () => {
            if (relinking.current) return;
            relinking.current = true;
            void onRelink().finally(() => { relinking.current = false; });
          } : undefined} /> : (
            <Image
              source={{ uri }}
              resizeMode="contain"
              accessibilityLabel={t('rollPhoto')}
              onError={resolution.failed}
              onLoad={(event) => {
                const { width, height } = event.nativeEvent.source;
                if (width && height && (natural?.width !== width || natural?.height !== height)) onNaturalSize({ width, height });
              }}
              style={{
                width: sideways ? fitted.height : fitted.width,
                height: sideways ? fitted.width : fitted.height,
                transform: [{ rotate: `${rotation}deg` }],
              }}
            />
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function ShareIcon() {
  return <View style={styles.shareIcon}>
    <Text style={styles.shareArrow}>↑</Text>
    <View style={styles.shareBox} />
  </View>;
}

function RotateIcon() {
  return <View style={styles.rotateIcon}>
    <View style={styles.rotateFrame} />
    <Text style={styles.rotateArrow}>↻</Text>
  </View>;
}
