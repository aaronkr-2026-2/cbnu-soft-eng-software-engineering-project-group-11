import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = resolve(root, process.argv[2] ?? 'assets/films/source/kodak.png');
if (!existsSync(source)) throw new Error('Missing source sheet: ' + source);
const rows = [
 ['portra-160','portra-400','portra-800','gold-200','ultramax-400','colorplus-200'],
 ['ektar-100','e100','e100g','e100vs','t-max-100','t-max-400'],
 ['tri-x-400','plus-x-125','double-x-5222','vision3-50d','vision3-250d','vision3-500t'],
 ['aerocolor-iv-125',null,null,'kodachrome-64','kodachrome-25','kodachrome-200'],
 ['vericolor-iii-160',null,'max-400','portra-160nc','portra-400nc',null],
];
// Crop inside the printed card edges, excluding the sheet/shadow and white padding.
const xs = [32,282,533,784,1035,1290], ys = [24,218,410,610,794], heights = [174,172,172,160,184];
const target = resolve(root, 'assets/films/kodak'); mkdirSync(target,{recursive:true});
const entries = [];
for (let row=0; row<rows.length; row++) for (let column=0; column<6; column++) {
 const name=rows[row][column]; if (!name) continue;
 execFileSync('sips',['-c',String(heights[row]),'214','--cropOffset',String(ys[row]),String(xs[column]),source,
  '--out',resolve(target,name+'.png')],{stdio:'ignore'});
 entries.push(`  'kodak-${name}': require('../../../../assets/films/kodak/${name}.png'),`);
}
const fujiSource = resolve(root, 'assets/films/source/fuji.png');
if (existsSync(fujiSource)) {
 const fujiRows = [
  ['c200','200','superia-xtra-400','superia-100','superia-premium-400',null],
  ['pro-400h','provia-100f','velvia-50','astia-100f',null,null],
  ['natura-1600',null,'neopan-acros-100-ii','neopan-100','neopan-400','neopan-1600'],
  ['super-hr-100','super-hr-400','industrial-100','industrial-400',null,null],
  [null,null,null,'sensia-100','sensia-200',null],
 ];
 const fujiTarget = resolve(root, 'assets/films/fujifilm'); mkdirSync(fujiTarget, { recursive: true });
 const fujiXs = [38,288,537,788,1038,1290], fujiYs = [26,226,425,620,812];
 for (let row=0; row<5; row++) for (let column=0; column<6; column++) {
  const name=fujiRows[row][column]; if (!name) continue;
  execFileSync('sips', ['-c','170','208','--cropOffset',String(fujiYs[row]),String(fujiXs[column]),fujiSource,
   '--out',resolve(fujiTarget,name+'.png')], { stdio: 'ignore' });
  entries.push(`  'fujifilm-${name}': require('../../../../assets/films/fujifilm/${name}.png'),`);
 }
}
writeFileSync(resolve(root,'src/features/films/data/filmAssets.ts'),
 `import type { ImageSourcePropType } from 'react-native';\n\n// Static references let Metro bundle only individual covers.\nexport const FILM_ASSETS: Readonly<Record<string, ImageSourcePropType>> = {\n${entries.join('\n')}\n};\n`);
console.log('Cropped '+entries.length+' film covers');
