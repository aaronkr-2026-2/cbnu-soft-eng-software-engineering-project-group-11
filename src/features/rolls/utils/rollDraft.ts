import type { NewRollDraft } from '../store/newRollDraftStore';
import type { Roll } from '../types';
import { isRollDate } from './rollMonth';
export function isRollDraftDirty(draft: NewRollDraft, roll: Roll): boolean {
  return draft.filmId !== roll.filmId || draft.cameraId !== roll.cameraId || draft.format !== roll.format ||
    JSON.stringify(draft.filmOverride ?? null) !== JSON.stringify(roll.filmOverride ?? null) ||
    draft.date !== roll.date || draft.filmExpiry !== roll.filmExpiry || draft.frameCount !== roll.frameCount || draft.lab.trim() !== (roll.lab ?? '') ||
    draft.notes.trim() !== (roll.notes ?? '') ||
    ['latitude', 'longitude', 'name', 'address'].some(key =>
      draft.location?.[key as keyof NonNullable<NewRollDraft['location']>] !== roll.location?.[key as keyof NonNullable<Roll['location']>]);
}
export function isValidRollDraft(draft: NewRollDraft): boolean {
  return !!draft.filmId && isRollDate(draft.date) && (draft.filmExpiry === undefined || /^\d{4}-(0[1-9]|1[0-2])$/.test(draft.filmExpiry)) &&
    (draft.frameCount === undefined || (Number.isSafeInteger(draft.frameCount) && draft.frameCount > 0)) &&
    (!draft.location || (Number.isFinite(draft.location.latitude) && Math.abs(draft.location.latitude) <= 90 &&
      Number.isFinite(draft.location.longitude) && Math.abs(draft.location.longitude) <= 180));
}
