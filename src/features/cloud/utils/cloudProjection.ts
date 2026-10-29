import type { Camera, Film } from '../../../types/models';
import type { Roll } from '../../rolls/types';
import type { PhotoReference } from '../../photos/types';
import { validCustomCamera, validCustomFilm } from '../../catalog/data/CatalogRepository';
import { validateRollArchive } from '../../rolls/data/validateRollArchive';
import { referenceIdentifier, usableAssetId, usableCloudIdentifier } from '../../photos/utils/referenceIdentifier';
import { cloudKey, materialize, type CloudDocument, type WireItem } from './cloudModel';

export type CloudProjection = { rolls: Roll[]; films: Film[]; cameras: Camera[] };
const remaining = (value: object, keys: string[]) => Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
const pick = (value: object, keys: string[]) => Object.fromEntries(Object.entries(value).filter(([key, value]) => keys.includes(key) && value !== undefined));
const rollFields = ['createdAt', 'filmId', 'filmName', 'cameraId', 'cameraName', 'date', 'filmExpiry', 'format', 'frameCount', 'notes', 'lab', 'location', 'filmOverride'];
const photoFields = ['provider', 'sortOrder', 'takenAt', 'location', 'note', 'cloudIdentifier'];
const filmFields = ['brand', 'name', 'iso', 'format', 'type', 'formats', 'process', 'status', 'imageKey', 'shortDescription', 'aliases', 'legacyIds', 'source', 'isCustom'];
const cameraFields = ['brand', 'model', 'format', 'isCustom'];
const cleanOverride = (value: unknown) => value && typeof value === 'object' ? pick(value, ['brand', 'name', 'iso', 'type', 'format', 'formats', 'process', 'imageKey']) : value;
export function wireItems(projection: CloudProjection): WireItem[] {
  return [
    ...projection.rolls.flatMap(roll => {
      const data: Record<string, unknown> = { ...pick(roll, rollFields), frameIDs: roll.photos.map(photo => photo.id).sort() };
      if (data.filmOverride) data.filmOverride = cleanOverride(data.filmOverride);
      return [{ kind: 'roll' as const, id: roll.id, data }, ...roll.photos.map(photo => {
        const data = pick(photo, photoFields);
        if (!usableCloudIdentifier(data.cloudIdentifier)) delete data.cloudIdentifier;
        if (photo.provider === 'apple-photos') data.referenceIdentity = usableCloudIdentifier(photo.cloudIdentifier) ? `cloud:${photo.cloudIdentifier}` : usableAssetId(referenceIdentifier(photo)) ? `local:${referenceIdentifier(photo)}` : 'unmapped';
        return { kind: 'photo' as const, id: photo.id, rollId: roll.id, data };
      })];
    }),
    ...projection.films.filter(f => f.isCustom).map(f => ({ kind: 'film' as const, id: f.id, data: pick(f, filmFields) })),
    ...projection.cameras.filter(c => c.isCustom).map(c => ({ kind: 'camera' as const, id: c.id, data: pick(c, cameraFields) })),
  ];
}
export function projectCloud(documents: Record<string, CloudDocument>, local: CloudProjection): CloudProjection {
  const rolls = new Map<string, Roll>();
  const localRolls = new Map(local.rolls.map(roll => [roll.id, roll]));
  const films: Film[] = [], cameras: Camera[] = [];
  const localFilms = new Map(local.films.map(film => [film.id, film]));
  const localCameras = new Map(local.cameras.map(camera => [camera.id, camera]));
  for (const [key, document] of Object.entries(documents)) {
    if (key !== cloudKey(document)) throw new Error('Cloud record key mismatch');
    if (document.deleted) continue;
    const data = materialize(document);
    if (document.kind === 'roll') {
      // A Roll can arrive before its independently saved frames. Do not publish a truncated restore.
      if (data.frameIDs !== undefined) {
        if (!Array.isArray(data.frameIDs) || data.frameIDs.some(id => typeof id !== 'string' || !id.trim()) || new Set(data.frameIDs).size !== data.frameIDs.length) throw new Error('Invalid cloud frame membership');
        for (const id of data.frameIDs as string[]) {
          if (!documents[cloudKey({ kind: 'photo', rollId: document.id, id })]) throw Object.assign(new Error('Cloud frames are still pending; restore incomplete'), { kind: 'incomplete' });
        }
      }
      const old = localRolls.get(document.id);
      const roll = { ...remaining(old ?? {}, rollFields), ...pick(data, rollFields), id: document.id, photos: [] } as unknown as Roll;
      // An older cloud record without creation metadata must not erase a known local time.
      if (roll.createdAt === undefined && old?.createdAt !== undefined) roll.createdAt = old.createdAt;
      if (roll.filmOverride) roll.filmOverride = { ...roll.filmOverride, ...pick(old?.filmOverride ?? {}, ['imageUri', 'imageDocumentPath']) };
      rolls.set(document.id, roll);
    } else if (document.kind === 'film') {
      const film = { ...remaining(localFilms.get(document.id) ?? {}, filmFields), ...pick(data, filmFields), ...pick(localFilms.get(document.id) ?? {}, ['imageUri', 'imageDocumentPath', 'imageUrl']), id: document.id };
      if (!validCustomFilm(film)) throw new Error('Invalid cloud Film');
      films.push(film);
    } else if (document.kind === 'camera') {
      const camera = { ...remaining(localCameras.get(document.id) ?? {}, cameraFields), ...pick(data, cameraFields), ...pick(localCameras.get(document.id) ?? {}, ['imageUri', 'imageDocumentPath', 'imageUrl']), id: document.id };
      if (!validCustomCamera(camera)) throw new Error('Invalid cloud Camera');
      cameras.push(camera);
    }
  }
  for (const document of Object.values(documents)) {
    if (document.deleted || document.kind !== 'photo') continue;
    const roll = rolls.get(document.rollId!);
    if (!roll) {
      const parent = documents[cloudKey({ kind: 'roll', id: document.rollId! })];
      if (parent?.deleted) continue;
      throw new Error('Cloud frame has no parent Roll; restore incomplete');
    }
    const source = materialize(document);
    const data = pick(source, photoFields);
    const old = localRolls.get(roll.id)?.photos.find(photo => photo.id === document.id);
    const oldIdentity = old?.provider === 'apple-photos' ? usableCloudIdentifier(old.cloudIdentifier) ? `cloud:${old.cloudIdentifier}` : usableAssetId(referenceIdentifier(old)) ? `local:${referenceIdentifier(old)}` : 'unmapped' : undefined;
    const referenceChanged = old?.provider === 'apple-photos' && (source.referenceIdentity !== undefined && source.referenceIdentity !== oldIdentity || data.cloudIdentifier !== (usableCloudIdentifier(old.cloudIdentifier) ? old.cloudIdentifier : undefined));
    const localFields = old?.provider === data.provider && !referenceChanged ? pick(old ?? {}, ['assetId', 'localIdentifier', 'localUri', 'documentPath']) : {};
    const placeholder = data.provider === 'filmer-copy'
      ? { localUri: '', documentPath: 'photos/cloud-unavailable/photo-missing.jpg', storageMode: 'copy' }
      : { assetId: 'pending-reference-' + document.id.slice(0, 128), storageMode: 'reference' };
    const retained = remaining(old ?? {}, [...photoFields, 'id', 'assetId', 'localIdentifier', 'localUri', 'documentPath', 'thumbnailUri', 'storageMode']);
    roll.photos.push({ ...retained, ...data, ...placeholder, ...localFields, id: document.id } as PhotoReference);
  }
  for (const roll of rolls.values()) {
    roll.photos.sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    if (new Set(roll.photos.map(photo => photo.sortOrder)).size !== roll.photos.length) roll.photos = roll.photos.map((photo, sortOrder) => ({ ...photo, sortOrder }));
  }
  const result = { rolls: [...rolls.values()].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), films, cameras };
  validateRollArchive(result.rolls);
  return result;
}
