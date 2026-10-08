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
 assert.equal(builtInFilms.length, 47);
 assert.equal(new Set(builtInFilms.map(f => f.id)).size, 47);
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
   'react-native':{Pressable:'Pressable',SectionList:'SectionList',Text:'Text',View:'View'},
   'expo-router':{useLocalSearchParams:()=>({edit,change:edit?'1':undefined}),useRouter:()=>({canGoBack:()=>true,back:()=>navigation.push('back'),push:r=>navigation.push(r)})},
   '../../../constants/theme':{useThemedStyles:()=>({})},'../../../i18n/useTranslation':{useTranslation:()=>({t:key=>key})},
   '../store/filmStore':{useFilmStore:fn=>fn({films:builtInFilms})},
   '../../rolls/store/newRollDraftStore':{useNewRollDraftStore:fn=>fn({update:x=>updates.push(['create',x]),updateEdit:x=>updates.push(['edit',x])})},
   '../utils/filterFilms':{filterFilms}};
  const exports={};const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  new Function('exports','require',code)(exports,name=>mocks[name]??{});
  const row=exports.FilmSelectionScreen().props.children[0].props.renderItem({item:getFilmById('fujifilm-c200')});
  assert.equal(row.type,'Pressable');row.props.onPress();
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
