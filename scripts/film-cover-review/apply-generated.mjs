import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeFilmCover } from '../normalize-film-covers.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const review = resolve(root, 'assets/films/generated-review');
const data = resolve(root, 'src/features/films/data');
const overrideFile = resolve(review, 'active-overrides.json');
const overrides = existsSync(overrideFile) ? JSON.parse(readFileSync(overrideFile, 'utf8')) : {};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const targets = new Map();
for (const name of ['filmAssets.ts', 'additionalFilmAssets.ts']) {
  for (const [, id, relative] of readFileSync(resolve(data, name), 'utf8').matchAll(/'([^']+)': require\('([^']+\.png)'\)/g)) {
    const target = resolve(data, relative);
    if (targets.has(id) || !target.startsWith(resolve(root, 'assets/films') + '/') || relative.includes('/source/')) throw Error('Unsafe/duplicate asset: ' + id);
    targets.set(id, target);
  }
}
const jobs = [];
const seen = new Set();
for (const batch of readdirSync(review).filter(name => /^batch-\d+$/.test(name)).sort()) {
  for (const item of JSON.parse(readFileSync(resolve(review, batch, 'manifest.json'), 'utf8'))) {
    if (!/^[a-z0-9-]+$/.test(item.id) || seen.has(item.id) || !targets.has(item.id)) throw Error('Unknown/duplicate film: ' + item.id);
    seen.add(item.id);
    const override = overrides[item.id];
    const source = override ? resolve(root, override.source) : resolve(review, batch, item.id + '.png');
    if (!source.startsWith(review + '/')) throw Error('Unsafe source: ' + item.id);
    const sourceSha256 = override?.sourceSha256 ?? item.sha256;
    const bytes = readFileSync(source);
    if (digest(bytes) !== sourceSha256 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Source validation failed: ' + item.id);
    const target = targets.get(item.id);
    if (!existsSync(target)) throw Error('Missing original target: ' + item.id);
    jobs.push({ id: item.id, source, target, sourceSha256 });
  }
}
const additionsFile = resolve(review, 'catalog-additions.json');
const additions = existsSync(additionsFile) ? JSON.parse(readFileSync(additionsFile, 'utf8')) : [];
const additionIds = new Set();
for (const item of additions) {
  if (!/^[a-z0-9-]+$/.test(item.id) || seen.has(item.id) || !targets.has(item.id)) throw Error('Unknown/duplicate addition: ' + item.id);
  const source = resolve(root, item.source), bytes = readFileSync(source);
  if (!source.startsWith(review + '/') || digest(bytes) !== item.sourceSha256 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw Error('Addition validation failed: ' + item.id);
  seen.add(item.id); additionIds.add(item.id);
  jobs.push({ id: item.id, source, target: targets.get(item.id), sourceSha256: item.sourceSha256 });
}
if (Object.keys(overrides).some(id => !seen.has(id))) throw Error('Unknown override ID');
if (jobs.length !== targets.size || seen.size !== targets.size) throw Error('Incomplete catalog coverage');
// Validate everything first, then normalize via the established cover pipeline. Keep full artwork.
const applied = [];
const selected = process.argv.includes('--only-new-editions') ? jobs.filter(job => additionIds.has(job.id))
  : process.argv.includes('--only-active-overrides') ? jobs.filter(job => overrides[job.id]) : jobs;
for (const job of selected) {
  const staging = resolve(dirname(job.target), '.' + job.id + '.generated-staging.png');
  mkdirSync(dirname(job.target), { recursive: true });
  copyFileSync(job.source, staging);
  normalizeFilmCover(staging);
  const bytes = readFileSync(staging);
  if (bytes.readUInt32BE(16) !== 492 || bytes.readUInt32BE(20) !== 400) throw Error('Unexpected cover size: ' + job.id);
  renameSync(staging, job.target);
  applied.push({ id: job.id, source: job.source.slice(root.length), target: job.target.slice(root.length),
    sourceSha256: job.sourceSha256, assetSha256: digest(bytes), bytes: bytes.length, width: 492, height: 400 });
}
const appliedFile = resolve(root, 'scripts/film-cover-review/applied-assets.json');
const previous = existsSync(appliedFile) ? JSON.parse(readFileSync(appliedFile, 'utf8')) : [];
const records = new Map(previous.map(item => [item.id, item]));
for (const item of applied) records.set(item.id, item);
const complete = jobs.map(job => records.get(job.id));
if (complete.some(item => !item)) throw Error('Incomplete applied manifest');
writeFileSync(appliedFile, JSON.stringify(complete, null, 2) + '\n');
console.log(JSON.stringify({ applied: applied.length, runtimeBytes: complete.reduce((total, item) => total + item.bytes, 0) }));
