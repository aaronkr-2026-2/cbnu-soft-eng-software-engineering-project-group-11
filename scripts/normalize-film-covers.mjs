import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Match the catalog thumbnail opening. Resize the entire card: no crop or padding.
export const COVER_SIZE = [492, 400];
export function normalizeFilmCover(target) {
  execFileSync('sips', ['-z', String(COVER_SIZE[1]), String(COVER_SIZE[0]), target, '--out', target], { stdio: 'ignore' });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = fileURLToPath(new URL('../src/features/films/data/', import.meta.url));
  let count = 0;
  for (const name of ['filmAssets.ts', 'additionalFilmAssets.ts']) {
    const source = readFileSync(resolve(data, name), 'utf8');
    for (const [, relative] of source.matchAll(/require\('([^']+\.png)'\)/g)) {
      if (relative.includes('/source/')) throw new Error('Source sheets must remain unchanged');
      normalizeFilmCover(resolve(data, relative));
      count++;
    }
  }
  console.log(`Normalized ${count} bundled covers to ${COVER_SIZE.join('x')}.`);
}
