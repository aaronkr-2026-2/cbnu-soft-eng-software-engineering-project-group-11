import { useEffect, useRef, useState } from 'react';
import type { PhotoReference } from '../types';
import { observePhotoLibrary, resolvePhoto, type PhotoResolution } from '../services/PhotoReferenceService';
import { referenceAffected } from '../utils/referenceIdentifier';

/** Image identity only; captions, dates and order changes keep resolved frames. */
function photoIdentity(photo: PhotoReference) {
  return JSON.stringify([photo.id, photo.provider, 'localIdentifier' in photo ? photo.localIdentifier : undefined, 'assetId' in photo ? photo.assetId : undefined,
    'cloudIdentifier' in photo ? photo.cloudIdentifier : undefined, 'documentPath' in photo ? [photo.documentPath, photo.localUri] : undefined]);
}

export function useResolvedPhotos(photos: PhotoReference[]) {
  const [revision, setRevision] = useState(0);
  const [resolved, setResolved] = useState<ReadonlyMap<string, PhotoResolution>>(new Map());
  const identities = photos.map(photoIdentity);
  const key = JSON.stringify(identities);
  const current = useRef(photos);
  useEffect(() => { current.current = photos; });
  useEffect(() => observePhotoLibrary((change, assets) => {
    const affected = current.current.filter(photo => referenceAffected(photo, assets));
    if (!affected.length) return;
    // Refresh revalidates in place; an invalidation hides only the affected frames' stale pixels.
    if (change !== 'refresh') {
      const dropped = new Set(affected.map(photoIdentity));
      setResolved(previous => new Map([...previous].filter(([identity]) => !dropped.has(identity))));
    }
    setRevision(value => value + 1);
  }), []);
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
    void Promise.all(Array.from({ length: Math.min(4, photos.length) }, worker)).then(() => {
      if (active) setResolved(previous => new Map(identities.map((identity, index) => {
        const item = items[index], before = previous.get(identity);
        // A transient refresh failure keeps the frame that is already on screen.
        const keep = (item.status === 'temporary-error' || item.status === 'loading') && before?.status === 'ready';
        return [identity, keep ? before : item];
      })));
    });
    return () => { active = false; };
    // The key covers every identity; mutable photo details deliberately do not restart resolution.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, revision]);
  return { items: identities.map(identity => resolved.get(identity) ?? { status: 'loading' as const, uri: undefined }),
    retry: () => setRevision(value => value + 1) };
}
