import type { PhotoReference } from '../../photos/types';
import type { Roll } from '../../rolls/types';
import { checkPhotoReference, invalidatePhotoRenders } from '../../photos/services/PhotoReferenceService';
import { referenceIdentifier } from '../../photos/utils/referenceIdentifier';
import { useRollStore } from '../../rolls/store/rollStore';

export type RepairIssue = { rollId: string; photoId: string; reason: 'unavailable' | 'permission-denied' | 'limited' | 'temporary-error' };
export type RepairReport = { issues: RepairIssue[]; total: number; checked: number; available: number; recovered: number; inaccessible: number; restricted: number; errors: number; skipped: number };
let running = false;
export const ReferenceRepairService = {
  async run(onProgress: (report: RepairReport) => void = () => {}, signal?: AbortSignal, only?: ReadonlySet<string>, options: { refreshRenders?: boolean } = {}): Promise<RepairReport> {
    if (running) throw new Error('Reference check already running');
    if (useRollStore.getState().archive.status !== 'ready') throw new Error('Archive requires recovery');
    running = true;
    const records = useRollStore.getState().rolls.flatMap(roll => roll.photos.flatMap(photo => photo.provider === 'apple-photos' ? [{ rollId: roll.id, photo }] : [])).filter(record => !only || only.has(JSON.stringify([record.rollId, record.photo.id])));
    const report: RepairReport = { issues: [], total: records.length, checked: 0, available: 0, recovered: 0, inaccessible: 0, restricted: 0, errors: 0, skipped: 0 };
    // Reuse indexes while metadata is unchanged; avoid scanning a large Roll for every frame.
    let previousRolls: Roll[] | undefined;
    let rollIndex = new Map<string, Roll>();
    const photoIndexes = new WeakMap<Roll, Map<string, PhotoReference>>();
    function findPhoto(rollId: string, photoId: string) {
      const rolls = useRollStore.getState().rolls;
      if (rolls !== previousRolls) { previousRolls = rolls; rollIndex = new Map(rolls.map(roll => [roll.id, roll])); }
      const roll = rollIndex.get(rollId);
      if (!roll) return undefined;
      let index = photoIndexes.get(roll);
      if (!index) { index = new Map(roll.photos.map(photo => [photo.id, photo])); photoIndexes.set(roll, index); }
      return index.get(photoId);
    }
    try {
      if (options.refreshRenders !== false) invalidatePhotoRenders();
      onProgress({ ...report, issues: [] });
      for (const record of records) {
        if (signal?.aborted) break;
        const photo = findPhoto(record.rollId, record.photo.id);
        if (photo?.provider !== 'apple-photos') report.skipped++;
        else {
          const status = await checkPhotoReference(photo);
          const saved = findPhoto(record.rollId, photo.id);
          if (status === 'ready') {
            if (saved?.provider === 'apple-photos' && referenceIdentifier(saved) !== referenceIdentifier(record.photo)) report.recovered++;
            else report.available++;
          } else if (status === 'permission-denied' || status === 'limited') report.restricted++;
          else if (status === 'unavailable') report.inaccessible++;
          else report.errors++;
          if (status !== 'ready') report.issues.push({ rollId: record.rollId, photoId: photo.id, reason: status === 'permission-denied' || status === 'limited' || status === 'unavailable' ? status : 'temporary-error' });
        }
        report.checked++;
        if (report.checked === 1 || report.checked % 10 === 0 || report.checked === report.total) onProgress({ ...report, issues: [...report.issues] });
        // Let scrolling and cancellation continue between bounded metadata operations.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      return report;
    } finally {
      running = false;
      if (options.refreshRenders !== false) invalidatePhotoRenders();
    }
  },
};
