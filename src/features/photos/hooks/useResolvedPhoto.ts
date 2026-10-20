import { useEffect, useState } from 'react';
import type { PhotoReference } from '../types';
import { invalidatePhotoRenders, observePhotoLibrary, resolvePhoto, type PhotoResolution } from '../services/PhotoReferenceService';

export function useResolvedPhoto(photo: PhotoReference | undefined, size: 'thumbnail' | 'full' = 'thumbnail') {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; result: PhotoResolution }>();
  const key = JSON.stringify([photo, size, revision]);
  useEffect(() => observePhotoLibrary(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    let active = true;
    if (photo) void resolvePhoto(photo, size).then(result => { if (active) setState({ key, result }); });
    return () => { active = false; };
  }, [key, photo, size]);
  return {
    ...(state?.key === key ? state.result : { status: 'loading' as const }),
    retry: invalidatePhotoRenders,
    failed: () => setState({ key, result: { status: 'temporary-error' } }),
  };
}
