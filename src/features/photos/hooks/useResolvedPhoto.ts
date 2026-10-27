import { useAppStore } from '../../../store/app-store';
import { useEffect, useState } from 'react';
import { Dimensions, PixelRatio } from 'react-native';
import type { PhotoReference } from '../types';
import { invalidatePhotoRenders, observePhotoLibrary, resolvePhoto, type PhotoResolution } from '../services/PhotoReferenceService';

/** Bucket physical pixels so small layout changes share renders. */
export function renderPixels(points: number) {
  return Math.min(4096, Math.max(128, Math.ceil(points * PixelRatio.get() / 128) * 128));
}

export function useResolvedPhoto(photo: PhotoReference | undefined, size: 'thumbnail' | 'full' = 'thumbnail', pixels = 512, allowHigh = true) {
  const quality = useAppStore(state => size === 'full' && allowHigh ? state.photoQuality : 'optimized');
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ identity: string; result: PhotoResolution }>();
  // Details and ordering changes do not invalidate image work.
  const identity = JSON.stringify([photo?.id, photo?.provider, photo && ('localIdentifier' in photo ? photo.localIdentifier : undefined), photo && ('assetId' in photo ? photo.assetId : undefined), photo && ('cloudIdentifier' in photo ? photo.cloudIdentifier : undefined), photo && ('documentPath' in photo ? [photo.documentPath, photo.localUri] : undefined), revision]);
  useEffect(() => observePhotoLibrary(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    const controller = new AbortController();
    const publish = (result: PhotoResolution, preview = false) => {
      if (!controller.signal.aborted) setState(previous => preview && result.status === 'ready' && previous?.identity === identity && previous.result.uri
        ? previous : { identity, result });
    };
    if (photo) void (async () => {
      if (size === 'thumbnail') {
        publish(await resolvePhoto(photo, 'thumbnail', pixels, controller.signal));
        return;
      }
      const preview = await resolvePhoto(photo, 'thumbnail', pixels, controller.signal);
      if (controller.signal.aborted) return;
      publish(preview, true);
      if (preview.status !== 'ready') return;
      const screen = Dimensions.get('window');
      const screenPixels = renderPixels(Math.max(screen.width, screen.height));
      const result = await resolvePhoto(photo, 'thumbnail', screenPixels, controller.signal);
      if (controller.signal.aborted) return;
      // Transient upgrade errors retain the verified preview; access failures remove it.
      if (result.status === 'temporary-error' || result.status === 'loading') {
        setState(previous => controller.signal.aborted ? previous : { identity, result: { status: 'temporary-error', uri: previous?.identity === identity ? previous.result.uri : undefined } });
      } else publish(result);
      if (result.status !== 'ready' || quality !== 'high') return;
      const high = await resolvePhoto(photo, 'thumbnail', Math.min(4096, screenPixels * 2), controller.signal);
      if (high.status === 'temporary-error' || high.status === 'loading') {
        setState(previous => controller.signal.aborted ? previous : { identity, result: { status: 'temporary-error', uri: previous?.identity === identity ? previous.result.uri : undefined } });
      } else publish(high);
    })();
    return () => controller.abort();
    // Image identity deliberately excludes mutable captions, dates and order.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, size, quality, pixels]);
  return {
    ...(state?.identity === identity ? state.result : { status: 'loading' as const }),
    renderKey: identity,
    retry: invalidatePhotoRenders,
    failed: () => setState(previous => previous?.identity === identity ? { identity, result: { status: 'temporary-error' } } : previous),
  };
}
