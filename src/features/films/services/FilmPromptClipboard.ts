import { requireOptionalNativeModule } from 'expo-modules-core';

type ClipboardBridge = { copyText?: (text: string) => Promise<void> };

/** Write-only clipboard access, invoked by a user tap. Older builds use selectable prompt text. */
export async function copyFilmPrompt(text: string): Promise<boolean> {
  try {
    const native = requireOptionalNativeModule<ClipboardBridge>('FiLogPhotos');
    if (!native?.copyText) return false;
    await native.copyText(text);
    return true;
  } catch { return false; }
}
