import type { Camera } from '../../../types/models';

/**
 * No built-in cameras: people add their own (with a ChatGPT-made cover). Rolls that used the former
 * built-ins (contax-t2, nikon-fm2, olympus-mju-ii, canon-ae-1) keep their saved cameraName.
 */
export const cameras: Camera[] = [];
