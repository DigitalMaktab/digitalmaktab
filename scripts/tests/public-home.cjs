const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),Module=require('module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','localStorage','Event'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
let systemDark=false,mediaListeners=new Set();window.matchMedia=()=>({get matches(){return systemDark},addEventListener:(_,fn)=>mediaListeners.add(fn),removeEventListener:(_,fn)=>mediaListeners.delete(fn)});
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let coreExports;const original=Module._load;Module._load=function(request,parent,isMain){
 if((request==='@digitalmaktab/spa-core'||request==='../../')&&coreExports)return coreExports;
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik','styled-components'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default;
coreExports={AppImg:load('components/AppImg.tsx'),AppDropdownItem:load('components/dropdown/AppDropdownItem.tsx'),useDropdowns:require(core+'/src/hooks/useDropdown.ts').useDropdowns,AppLocalizer:()=>h('span',null,'Language')};
for(const [name,file] of [['AppPublicLayout','AppPublicLayout'],['AppPublicHeader','AppPublicHeader'],['HomeSection','HomeSection'],['FeaturesSection','FeaturesSection'],['SupportSection','SupportSection'],['AppPublicFooter','AppPublicFooter']])coreExports[name]=load('components/public/'+file+'.tsx');
const Screen=require(projects+'/digitalmaktab-spa/src/screens/public/PublicScreen.tsx').default;
(async()=>{
 const resources={};for(const lang of ['en-US','fa-AF','ps-AF'])resources[lang]={translation:JSON.parse(fs.readFileSync((lang==='en-US'?core:projects+'/digitalmaktab-spa-country-afghanistan')+'/src/locales/'+lang+'/translation.json'))};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);localStorage.setItem('theme','dark');
  const ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(Screen))));
  await waitFor(()=>assert.equal(document.documentElement.dataset.theme,'dark'));
  assert.equal(document.documentElement.dataset.bsTheme,'dark');
  assert.equal(ui.getByRole('heading',{level:1}).tagName,'H1');
  assert(ui.container.querySelector('.landing-page'));
  for(const href of ['/login','/signup','/privacy-policy','/support'])assert(ui.container.querySelector(`a[href="${href}"]`));
  assert.equal(ui.queryAllByRole('combobox').length,0);
  assert(ui.container.querySelector('.public-controls .custom-dropdown'));
  assert(!ui.container.querySelector('#public-navigation .custom-dropdown'));
  const appearance=ui.getByRole('button',{name:i18n.t('appearance.label')});
  assert.equal(appearance.getAttribute('aria-pressed'),'true');
  fireEvent.click(appearance);await waitFor(()=>assert.equal(document.documentElement.dataset.bsTheme,'light'));assert.equal(localStorage.getItem('theme'),'light');
  fireEvent.click(appearance);await waitFor(()=>assert.equal(document.documentElement.dataset.bsTheme,'dark'));assert.equal(localStorage.getItem('theme'),'dark');
  localStorage.setItem('theme','system');await act(async()=>{window.dispatchEvent(new Event('storage'));systemDark=false;for(const listener of mediaListeners)listener()});await waitFor(()=>assert.equal(document.documentElement.dataset.theme,'light'));
  await act(async()=>{systemDark=true;for(const listener of mediaListeners)listener()});await waitFor(()=>assert.equal(document.documentElement.dataset.theme,'dark'));
  const toggle=ui.getByRole('button',{name:i18n.t('public.header.menu')});fireEvent.click(toggle);assert.equal(toggle.getAttribute('aria-expanded'),'true');fireEvent.keyDown(ui.container.querySelector('#public-navigation'),{key:'Escape'});assert.equal(toggle.getAttribute('aria-expanded'),'false');
  cleanup();assert.equal(mediaListeners.size,0);systemDark=false;
 }
 console.log('PASS: public home renders in all 3 languages; saved/light/dark/system appearance stays synchronized; mobile navigation, primary actions and legal/support links work.');
})().catch(error=>{console.error(error);process.exitCode=1});
