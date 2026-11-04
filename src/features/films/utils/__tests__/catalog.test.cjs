const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
function load(filename) {
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
 new Function('exports', 'require', code)(exports, name => load(path.resolve(path.dirname(filename), name + '.ts')));
 return exports;
}
const { builtInFilms, getFilmById } = load(path.resolve(__dirname, '../../data/films.ts'));
const { filterFilms } = load(path.resolve(__dirname, '../filterFilms.ts'));
test('Built-in catalog retains IDs, distinguishes specialty/history, and contains no external images', () => {
 assert.equal(builtInFilms.length, 269);
 assert.equal(new Set(builtInFilms.map(f => f.id)).size, 269);
 for (const f of builtInFilms) {
  assert.ok(f.iso > 0 && f.formats.length); assert.equal(f.source, 'builtin');
  assert.equal(f.imageUrl, undefined); assert.equal(f.isCustom, false);
 }
 for (const id of ['kodak-portra-400','kodak-gold-200','fujifilm-c200','ilford-hp5-plus']) assert.ok(getFilmById(id));
 assert.equal(getFilmById('kodak-professional-portra-160').id, 'kodak-portra-160');
 assert.equal(getFilmById('fujifilm-fujicolor-pro-400h-professional').status, 'discontinued');
 assert.equal(getFilmById('kodak-double-x-5222').iso, 250);
 assert.equal(getFilmById('kodak-kodachrome-64').process, 'K-14');
});
test('Local search supports aliases/process/multiple tokens and excludes non-roll artwork', () => {
 for (const q of ['Portra','Gold','5207','Superia','Provia','Velvia','400H','Kodachrome','e6']) assert.ok(filterFilms(builtInFilms,q).length, q);
 assert.equal(filterFilms(builtInFilms,'5207')[0].name, 'Vision3 250D');
 assert.ok(filterFilms(builtInFilms,'Kodak 400').every(f=>f.brand==='Kodak'));
 for (const q of ['Instax','QuickSnap','Classica','Silvi','Premium 200','80NC']) assert.equal(filterFilms(builtInFilms,q).length,0,q);
 const custom = { id:'custom-film-1',brand:'My',name:'Custom',iso:400,type:'color',format:'35mm',isCustom:true,source:'custom' };
 assert.equal(filterFilms([...builtInFilms,custom],'My Custom')[0],custom);
});

test('All built-in descriptions are localized and attach to the same Film records', () => {
 for (const film of builtInFilms) for (const language of ['en','vi','ko']) {
  assert.ok(film.shortDescription[language].includes(film.name));
  assert.ok(film.shortDescription[language].length > 50);
 }
 assert.match(getFilmById('kodak-portra-400').shortDescription.en, /skin tones/);
 assert.match(getFilmById('kodak-vision3-250d').shortDescription.en, /ECN-2/);
});


test('Film Selection whole row selects and clears the previous override in both create and edit flows', () => {
 const filename=path.resolve(__dirname,'../../components/FilmSelectionScreen.tsx');
 for (const edit of [undefined,'r1']) {
  const updates=[],navigation=[]; const jsx=(type,props)=>({type,props});
  const mocks={react:{useMemo:fn=>fn(),useState:value=>[value,()=>{}],useEffect:()=>{}},'react/jsx-runtime':{jsx,jsxs:jsx},
   'react-native':{Pressable:'Pressable',SectionList:'SectionList',Text:'Text',View:'View',KeyboardAvoidingView:'KeyboardAvoidingView',Platform:{OS:'ios'},Keyboard:{dismiss:()=>{}}},
   'expo-router':{useLocalSearchParams:()=>({edit,change:edit?'1':undefined}),useRouter:()=>({canGoBack:()=>true,back:()=>navigation.push('back'),push:r=>navigation.push(r)})},
   '../../../constants/theme':{useThemedStyles:()=>({})},'../../../i18n/useTranslation':{useTranslation:()=>({t:key=>key})},
   '../store/filmStore':{useFilmStore:fn=>fn({films:builtInFilms})},
   '../../rolls/store/newRollDraftStore':{useNewRollDraftStore:fn=>fn({update:x=>updates.push(['create',x]),updateEdit:x=>updates.push(['edit',x])})},
   '../utils/filterFilms':{filterFilms}};
  const exports={};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',code)(exports,name=>mocks[name]??{});
  const row=exports.FilmSelectionScreen().props.children[0].props.children[0].props.renderItem({item:getFilmById('fujifilm-c200')});
  // The cover opens film info; the text button beside it selects the film.
  const buttons=[].concat(row.props.children).filter(child=>child&&child.type==='Pressable');
  assert.equal(buttons.length,2);buttons[1].props.onPress();
  assert.deepEqual(updates,[[edit?'edit':'create',{filmId:'fujifilm-c200',filmOverride:undefined}]]);
  assert.deepEqual(navigation,[edit?'back':'/new-roll/details']);
 }
});

test('Shared FilmForm saves an isolated override with a persistent cover and cancel saves nothing', async () => {
 const filename=path.resolve(__dirname,'../../components/FilmForm.tsx');
 const initial=getFilmById('fujifilm-c200'), before=JSON.stringify(initial), state=[];
 const submitted=[],alerts=[],copies=[];let cursor=0,closed=0;
 const jsx=(type,props)=>({type,props});
 const mocks={
  react:{useRef:value=>({current:value}),useState:value=>{const i=cursor++;if(!(i in state))state[i]=value;return[state[i],next=>{state[i]=typeof next==='function'?next(state[i]):next}];}},
  'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Alert:{alert:(...args)=>alerts.push(args)}},
  '../../../i18n/useTranslation':{useTranslation:()=>({t:key=>key})},
  '../../../components/ui/SelectionChip':{SelectionChip:'Chip'},
  '../../catalog/components/CatalogItemModal':{CatalogItemModal:'Form',CatalogChoices:'Choices',CatalogField:'Field',CatalogImageField:'ImagePicker'},
  '../data/filmAssets':{FILM_ASSETS:{'fujifilm-c200':123}},
  '../../catalog/utils/normalizeDisplayName':load(path.resolve(__dirname,'../../../catalog/utils/normalizeDisplayName.ts')),
  '../services/FilmCoverStorage':{filmImageUri:film=>film?.imageUri,FilmCoverStorage:{copy:async uri=>{copies.push(uri);return{imageUri:'file:///Documents/film-covers/cover-test.jpg',imageDocumentPath:'film-covers/cover-test.jpg'};},removeUnreferenced:()=>{}}},
 };
 const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,name=>mocks[name]??{});
 const render=()=>{cursor=0;return exports.FilmForm({mode:'edit',initialValues:initial,visible:true,onClose:()=>closed++,onSubmit:value=>submitted.push(value)});};
 let form=render();const fields=form.props.children;
 fields[1].props.onChangeText('C200 @ 400');fields[2].props.onChangeText('400');
 fields[5].props.onChangeText('C-41');fields[6].props.onChange('file:///picker/new.jpg');
 form=render();form.props.onClose();assert.equal(copies.length,0);assert.equal(submitted.length,0);
 assert.equal(alerts.length,1);alerts[0][2][0].onPress?.();assert.equal(closed,0);
 form.props.onSubmit();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(submitted[0].name,'C200 @ 400');assert.equal(submitted[0].iso,400);
 assert.equal(submitted[0].imageDocumentPath,'film-covers/cover-test.jpg');
 assert.equal(submitted[0].imageKey,null);assert.equal(closed,1);
 assert.equal(JSON.stringify(initial),before);
});

test('New catalog uses reviewed metadata instead of erroneous artwork labels', () => {
 for (const [id, iso, type, process] of [
  ['ilford-fp4-plus',125,'black-and-white','B&W'],
  ['ilford-ortho-plus',80,'black-and-white','B&W'],
  ['ilford-xp2-super',400,'black-and-white','C-41'],
  ['adox-cms-20-ii',20,'black-and-white','ADOTECH IV'],
  ['rollei-retro-80s',80,'black-and-white','B&W'],
  ['rollei-cr-200',200,'slide','E-6'],
  ['orwo-un54',100,'black-and-white','B&W'],
  ['reflx-lab-diablo-100',100,'color','C-41'],
  ['ferrania-p30',80,'black-and-white','B&W'],
  ['ferrania-p33',160,'black-and-white','B&W'],
  ['cinestill-bwxx',250,'black-and-white','B&W'],
  ['kodak-vision3-200t',200,'cinema','ECN-2'],
  ['reflx-lab-500t',500,'cinema','ECN-2'],
  ['reflx-lab-640t-ahu',640,'color','C-41 / ECN-2'],
 ]) {
  const film=getFilmById(id); assert.ok(film,id);
  assert.deepEqual([film.iso,film.type,film.process],[iso,type,process],id);
 }
 for (const id of ['lomography-orca-100','lomography-tiger-200','lomography-lobster-redscale-200']) assert.deepEqual(getFilmById(id).formats,['110']);
 for (const id of ['kodak-vision3-200t','kodak-exr-500t-5298','fujifilm-eterna-500t']) assert.match(getFilmById(id).shortDescription.en,/Tungsten-balanced/);
 assert.match(getFilmById('fujifilm-eterna-250d').shortDescription.en,/Daylight-balanced/);
});

test('Every catalog image resolves to a local per-brand PNG and preserved source sheets are byte-identical', () => {
 const crypto=require('node:crypto'); const root=path.resolve(__dirname,'../../../../..');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/film-cover-manifest.json'),'utf8'));
 const { additionalFilms }=load(path.resolve(__dirname,'../../data/additionalCatalog.ts'));
 assert.equal(additionalFilms.length,214); assert.equal(manifest.sheets.length,26);
 const assets={};
 for (const name of ['filmAssets.ts','additionalFilmAssets.ts']) {
  const source=fs.readFileSync(path.resolve(__dirname,'../../data',name),'utf8');
  for (const [,id,file] of source.matchAll(/'([^']+)': require\('([^']+)'\)/g)) {
   assert.ok(!assets[id],id); assert.doesNotMatch(file,/\/source\//);
   const target=path.resolve(__dirname,'../../data',file);
   assert.ok(fs.existsSync(target),target); assert.ok(fs.statSync(target).size>100,id);
   assets[id]=target;
  }
 }
 for (const film of builtInFilms) {
  assert.ok(assets[film.imageKey],film.id);
  const png=fs.readFileSync(assets[film.imageKey]);
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[492,400],film.id);
 }
 for (const sheet of manifest.sheets) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,sheet.path))).digest('hex'),sheet.sha256,sheet.path);
 for (const film of manifest.films) {
  const png=fs.readFileSync(assets[film.id]);
  assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],[492,400],film.id);
  assert.ok(assets[film.id].includes('/'+film.brand.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'/'),film.id);
 }
});

test('Film artwork fills the whole frame without cropping or empty margins', () => {
 const filename=path.resolve(__dirname,'../../components/FilmImage.tsx');
 const jsx=(type,props)=>({type,props});
 const mocks={react:{useState:()=>[undefined,()=>{}]},'react/jsx-runtime':{jsx,jsxs:jsx},
  'react-native':{Image:'Image',Text:'Text',View:'View'},
  '../services/FilmCoverStorage':{filmImageUri:film=>film?.imageUri},
  '../../../i18n/useTranslation':{useTranslation:()=>({t:key=>key})},
  '../data/filmAssets':{FILM_ASSETS:{'kodak-exr-100t-5248':1,'fujifilm-provia-400x':2,'lomography-color-negative-100':3}}};
 const exports={};
 new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,name=>mocks[name]??{});
 const frame={width:64,aspectRatio:1.23};
 for (const frame of [{width:64,aspectRatio:1.23},{width:136,height:112},{width:60,aspectRatio:1.23}])
 for (const imageKey of Object.keys(mocks['../data/filmAssets'].FILM_ASSETS)) {
  const image=exports.FilmImage({film:{imageKey},style:frame});
  assert.equal(image.type,'Image');assert.equal(image.props.resizeMode,'stretch');assert.equal(image.props.style,frame);
 }
 const custom={imageUri:'file:///Documents/film-covers/owned.jpg'};
 assert.equal(exports.FilmImage({film:custom,style:frame}).props.resizeMode,'cover');
 assert.equal(exports.FilmImage({film:custom,style:frame,resizeMode:'contain'}).props.resizeMode,'contain');
 assert.equal(exports.FilmImage({film:{imageKey:'fujifilm-provia-400x'},style:frame,resizeMode:'cover'}).props.resizeMode,'cover');
});

 test('Yes!Star sheet adds searchable 200/400 stocks without inventing Quickfun metadata', () => {
  for (const iso of [200,400]) {
   const film=getFilmById(`yes-star-${iso}`);
   assert.equal(film.brand,'Yes!Star'); assert.equal(film.iso,iso);
   assert.equal(film.type,'color'); assert.equal(film.process,'C-41');
   assert.deepEqual(film.formats,['35mm']); assert.equal(film.imageKey,film.id);
   for (const q of [`yesstar ${iso}`,`yes star ${iso}`,`Yes!Star ${iso}`]) assert.ok(filterFilms(builtInFilms,q).some(f=>f.id===film.id),q);
  }
  assert.equal(filterFilms(builtInFilms,'Quickfun').length,0);
 });

test('Film form rollback cannot delete a cover after catalog commit or a completed submit', async () => {
 const filename=path.resolve(__dirname,'../../components/FilmForm.tsx');
 for(const failure of ['save','navigation','close']) {
  const values=[],saved=[];let cursor=0,deleted=false;
  const jsx=(type,props)=>({type,props});
  const cover={imageUri:'file:///Documents/film-covers/cover-new.jpg',imageDocumentPath:'film-covers/cover-new.jpg'};
  const mocks={react:{useRef:value=>({current:value}),useState:value=>{const i=cursor++;if(!(i in values))values[i]=value;return[values[i],v=>values[i]=v];}},
   'react/jsx-runtime':{jsx,jsxs:jsx},'react-native':{Alert:{alert(){}}},
   '../../../i18n/useTranslation':{useTranslation:()=>({t:key=>key})},
   '../../../components/ui/SelectionChip':{},'../../catalog/components/CatalogItemModal':{CatalogItemModal:'Form'},'../data/filmAssets':{FILM_ASSETS:{}},
   '../store/filmStore':{useFilmStore:{getState:()=>({films:saved})}},
   '../../catalog/utils/normalizeDisplayName':load(path.resolve(__dirname,'../../../catalog/utils/normalizeDisplayName.ts')),
   '../services/FilmCoverStorage':{filmImageUri:()=>undefined,FilmCoverStorage:{copy:async()=>cover,removeUnreferenced:(_paths,retained)=>{if(!retained.has(cover.imageDocumentPath))deleted=true;}}},
  };
  const exports={};new Function('exports','require',ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(exports,name=>mocks[name]??{});
  const props={mode:'create',visible:true,initialValues:{brand:'B',name:'N',iso:100,type:'color',format:'35mm'},onClose:()=>{if(failure==='close')throw new Error('close');},onSubmit:value=>{if(failure==='save')throw new Error('Disk full');if(failure==='navigation'){saved.push(value);throw new Error('navigation');}}};
  let form=exports.FilmForm(props);form.props.children[6].props.onChange('file:///picker/new.jpg');cursor=0;form=exports.FilmForm(props);
  form.props.onSubmit();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(deleted,failure==='save',failure);
 }
});


test('New Kodak editions append distinct IDs while legacy records retain their identity, formats and artwork keys', () => {
 const { currentKodakFilms } = load(path.resolve(__dirname, '../../data/currentKodakCatalog.ts'));
 assert.equal(currentKodakFilms.length, 8);
 assert.equal(builtInFilms.length, 261 + currentKodakFilms.length);
 for (const film of currentKodakFilms) {
  assert.ok(film.id.endsWith('-current')); assert.ok(!film.name.includes('(New)'));
  assert.equal(film.imageKey, film.id); assert.equal(film.status, 'current');
  assert.equal(getFilmById(film.id).id, film.id);
  assert.equal(filterFilms(builtInFilms, film.aliases.find(a => /^\d{7}$/.test(a)))[0].id, film.id);
  for (const language of ['en', 'vi', 'ko']) assert.ok(getFilmById(film.id).shortDescription[language].length > 70);
 }
 for (const suffix of ['kodacolor-100', 'kodacolor-200', 'ektacolor-pro-160', 'ektacolor-pro-400', 'ektacolor-pro-800']) {
  const id = 'kodak-' + suffix, legacy = getFilmById(id), current = getFilmById(id + '-current');
  assert.ok(legacy && current); assert.equal(legacy.id, id); assert.equal(legacy.imageKey, id);
  assert.equal(legacy.status, 'discontinued'); assert.deepEqual(legacy.formats, ['35mm']);
  assert.equal(current.status, 'current'); assert.notEqual(current.imageKey, legacy.imageKey);
 }
 for (const iso of [160, 400, 800]) assert.deepEqual(getFilmById('kodak-ektacolor-pro-' + iso + '-current').formats, ['35mm', '120']);
 for (const iso of [100, 400]) assert.deepEqual(getFilmById('kodak-ektapan-' + iso + '-current').formats, ['35mm', '120']);
 assert.deepEqual(getFilmById('kodak-ektapan-p3200-current').formats, ['35mm']);
 assert.equal(getFilmById('kodak-ektapan-p3200-current').iso, 3200);
 assert.match(getFilmById('kodak-ektapan-p3200-current').shortDescription.en, /EI 3200/);
});
