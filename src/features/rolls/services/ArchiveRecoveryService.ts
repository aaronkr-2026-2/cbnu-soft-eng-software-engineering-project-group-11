import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
let sequence = 0;
/** Troubleshooting export only: never parse, normalize, import or write to the archive key. */
export async function exportRawArchive(raw: string) {
  if (!await Sharing.isAvailableAsync()) throw new Error('Sharing unavailable');
  const file = new File(Paths.cache, `filog-recovery-${Date.now()}-${++sequence}.txt`);
  file.write(raw);
  await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
}
