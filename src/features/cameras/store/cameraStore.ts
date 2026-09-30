import { create } from 'zustand';
import type { Camera } from '../../../types/models';
import { cameras as builtInCameras } from '../data/cameras';

export type CreateCustomCameraInput = Omit<Camera, 'id' | 'isCustom' | 'format'> & {
  format: NonNullable<Camera['format']>;
};

type CameraState = {
  cameras: Camera[];
  addCustomCamera: (input: CreateCustomCameraInput) => Camera;
};

let cameraSequence = 0;

export const useCameraStore = create<CameraState>((set) => ({
  cameras: builtInCameras,
  addCustomCamera: (input) => {
    const brand = input.brand.trim();
    const model = input.model.trim();
    if (!brand || !model || !['35mm', '120', '110'].includes(input.format)) {
      throw new Error('Enter a brand, model, and valid format.');
    }
    const camera: Camera = {
      ...input, brand, model,
      id: `custom-camera-${Date.now()}-${++cameraSequence}`,
      isCustom: true,
    };
    set((state) => ({ cameras: [...state.cameras, camera] }));
    return camera;
  },
}));

export function getCameraById(id: string): Camera | undefined {
  return useCameraStore.getState().cameras.find((camera) => camera.id === id);
}
