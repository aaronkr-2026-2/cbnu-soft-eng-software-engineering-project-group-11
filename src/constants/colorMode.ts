import type { AppearanceMode } from '../store/app-store';

export type ColorMode = 'light' | 'dark';
/** The Light/Dark mode in effect: the user's choice, or the system's when set to follow it. */
export function resolveColorMode(appearance: AppearanceMode, system: string | null | undefined): ColorMode {
  return appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
}
