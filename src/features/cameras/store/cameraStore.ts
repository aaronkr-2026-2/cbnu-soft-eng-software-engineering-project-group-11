import { create } from 'zustand';
import type { Camera } from '../../../types/models';
import { cameras as builtInCameras } from '../data/cameras';
import { createCatalogRepository, validCustomCamera, type CatalogLoad } from '../../catalog/data/CatalogRepository';
import { CameraCoverStorage } from '../services/CameraCoverStorage';
export type CreateCustomCameraInput = Omit<Camera, 'id' | 'isCustom' | 'format'> & { format: NonNullable<Camera['format']> };
type CameraState = { cameras: Camera[]; archive: CatalogLoad<Camera>; retryLoad: () => void; addCustomCamera: (input: CreateCustomCameraInput) => Promise<Camera> };
const repository = createCatalogRepository('filmer.cameras.v1', 'cameras', validCustomCamera, new Set(builtInCameras.map(c => c.id)));
let sequence = 0;
export const useCameraStore = create<CameraState>((set, get) => {
  const archive = repository.load();
  return {
    archive, cameras: [...builtInCameras, ...(archive.status === 'ready' ? archive.items : [])],
    retryLoad: () => { const archive = repository.load(); set(archive.status === 'ready' ? { archive, cameras: [...builtInCameras, ...archive.items] } : { archive }); },
    addCustomCamera: async input => {
      const brand = input.brand.trim(), model = input.model.trim();
      if (!brand || !model || !['35mm','120','110'].includes(input.format)) throw new Error('Invalid Camera');
      if (get().archive.status === 'recovery') throw new Error('Catalog requires recovery');
      let committed = false;
      let copied: Awaited<ReturnType<typeof CameraCoverStorage.copy>> | undefined;
      try {
        // Even if the source is a shared Documents file, create a separately owned cover before saving.
        if (input.imageUri) copied = await CameraCoverStorage.copy(input.imageUri);
        let id: string;
        do { id = `custom-camera-${Date.now()}-${++sequence}-${Math.random().toString(36).slice(2, 10)}`; } while (get().cameras.some(c => c.id === id));
        const camera: Camera = { ...input, ...copied, brand, model, id, isCustom: true };
        if (!validCustomCamera(camera)) throw new Error('Invalid Camera');
        const cameras = [...get().cameras, camera];
        repository.save(cameras.filter(c => c.isCustom)); committed = true; set({ cameras }); return camera;
      } catch (error) {
        if (copied && !committed) CameraCoverStorage.rollback(copied.imageDocumentPath);
        const archive = repository.getFailure(); if (archive) set({ archive });
        throw error;
      }
    },
  };
});
export function getCameraById(id: string) { return useCameraStore.getState().cameras.find(camera => camera.id === id); }
