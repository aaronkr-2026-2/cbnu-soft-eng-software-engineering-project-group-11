import { useEffect, useState } from 'react';
import type { PhotoReference } from '../types';
import { observePhotoLibrary, resolvePhoto, type PhotoResolution } from '../services/PhotoReferenceService';
export function useResolvedPhotos(photos: PhotoReference[]) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; items: PhotoResolution[] }>();
  const key = JSON.stringify([photos, revision]);
  useEffect(() => observePhotoLibrary(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let active = true;
    // Bounded concurrency avoids simultaneous iCloud downloads for a large contact sheet.
    const items: PhotoResolution[] = photos.map(() => ({ status: 'loading' }));
    let next = 0;
    async function worker() {
      while (active && next < photos.length) {
        const index = next++;
        items[index] = await resolvePhoto(photos[index], 'thumbnail', 1200);
      }
    }
    void Promise.all(Array.from({ length: Math.min(4, photos.length) }, worker)).then(() => { if (active) setState({ key, items }); });
    return () => { active = false; };
  }, [key, photos]);
  return { items: state?.key === key ? state.items : photos.map(() => ({ status: 'loading' as const, uri: undefined })),
    retry: () => setRevision(value => value + 1) };
}
