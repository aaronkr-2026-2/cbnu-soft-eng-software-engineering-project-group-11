// Run from anywhere on macOS: node scripts/generate-neutral-film-covers.mjs
// Rewrites every bundled catalog cover as a plain card (name, ISO and process, colored by film type).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const scripts = dirname(fileURLToPath(import.meta.url));
const data = resolve(scripts, '../src/features/films/data');

function load(file) {
  const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', compiled)(module, module.exports, id => load(resolve(dirname(file), id + '.ts')));
  return module.exports;
}

const assets = new Map();
for (const name of ['filmAssets.ts', 'additionalFilmAssets.ts']) {
  for (const [, key, relative] of readFileSync(resolve(data, name), 'utf8').matchAll(/'([^']+)': require\('([^']+\.png)'\)/g)) {
    if (relative.includes('/source/')) throw new Error('Source sheets must remain unchanged');
    assets.set(key, resolve(data, relative));
  }
}
const { builtInCatalog } = load(resolve(data, 'builtInCatalog.ts'));
const covers = builtInCatalog.map(film => {
  const target = assets.get(film.imageKey);
  if (!target) throw new Error(`No bundled cover path for ${film.id}`);
  return { brand: film.brand, name: film.name, iso: film.iso, type: film.type, process: film.process, target };
});
const unused = new Set(assets.values());
for (const cover of covers) unused.delete(cover.target);
if (unused.size) throw new Error(`Bundled covers without a catalog film: ${[...unused].join(', ')}`);

const work = mkdtempSync(join(tmpdir(), 'filog-neutral-covers-'));
try {
  writeFileSync(join(work, 'covers.json'), JSON.stringify(covers));
  execFileSync('swift', ['-module-cache-path', join(work, 'cache'), resolve(scripts, 'render-neutral-film-covers.swift'), join(work, 'covers.json')], { stdio: 'inherit' });
} finally { rmSync(work, { recursive: true, force: true }); }
