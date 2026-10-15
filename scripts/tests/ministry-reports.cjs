const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let mocks;const cache={reads:0,writes:0};const original=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core'&&mocks)return mocks;
 if(parent?.filename===core+'/src/api/client.ts'&&request==='../cache/cache')return {getFromCache:async()=>{cache.reads++;return {old:'cached report'};},saveToCache:async()=>{cache.writes++;},invalidateCacheByPrefix:async()=>{}};
 if(parent?.filename===core+'/src/api/client.ts'&&request==='../helper/helper')return {getCurrentLanguage:()=> 'fa-AF',getUser:()=>({token:'report-test'})};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default;
let calls=[],postCalls=[],fail=false,pending,clicked=[],revoked=[];
URL.createObjectURL=()=> 'blob:report';URL.revokeObjectURL=url=>revoked.push(url);dom.window.HTMLAnchorElement.prototype.click=function(){clicked.push({href:this.href,filename:this.download});};
mocks={AppAlert:load('components/AppAlert.tsx'),AppCard:load('components/card/AppCard.tsx'),AppButton:load('components/AppButton.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,
 apiClient:{get:async(url,config)=>{calls.push({url,config});if(fail)throw {response:{data:new Blob([JSON.stringify({detail:'Localized report error.'})],{type:'application/problem+json'})}};if(pending===true)await new Promise(resolve=>pending=resolve);return {data:new Blob(['xlsx'])};},post:async url=>{postCalls.push(url);return {data:{total:3,backfilled:3}};}}};
const Report=require(country+'/src/AfghanMinistryReport.tsx').default;
const {MemoryRouter}=require(app+'/react-router-dom');
const view=kind=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(Report,{kind}))));
(async()=>{
 const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:require(core+'/node_modules/lodash/merge')({},JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json')))};
 await i18n.init({lng:'fa-AF',resources,interpolation:{escapeValue:false}});
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);for(const kind of ['student','teacher']){
   const ui=view(kind);assert(!/TPT|Phase 2b|AfghanStudentDetails|AfghanTeacherDetails/.test(ui.container.textContent));
   const before=calls.length;fireEvent.click(ui.getByRole('button',{name:i18n.t('ministryReports.download')}));await waitFor(()=>assert.equal(clicked.length,calls.length));
   assert.equal(calls.length,before+1);assert.equal(calls.at(-1).config.responseType,'blob');assert(calls.at(-1).config.signal);assert.equal(clicked.at(-1).filename,kind==='student'?'StudentFileInfo.xlsx':'TeacherFileInfo.xlsx');cleanup();assert(calls.at(-1).config.signal.aborted);
  }
 }
 const prepared=view('student');fireEvent.click(prepared.getByRole('button',{name:i18n.t('ministryReports.studentFileInfo.backfill')}));await waitFor(()=>assert(prepared.getByText(i18n.t('ministryReports.studentFileInfo.backfillDone',{count:3}))));assert.equal(postCalls.length,1);cleanup();
 await i18n.changeLanguage('fa-AF');fail=true;let ui=view('student');fireEvent.click(ui.getByRole('button',{name:i18n.t('ministryReports.download')}));await waitFor(()=>assert(ui.getByText('Localized report error.')));const beforeError=clicked.length;assert.equal(beforeError,6);cleanup();fail=false;
 pending=true;ui=view('teacher');fireEvent.click(ui.getByRole('button',{name:i18n.t('ministryReports.download')}));await waitFor(()=>assert.equal(typeof pending,'function'));const signal=calls.at(-1).config.signal;cleanup();assert(signal.aborted);await act(async()=>pending());assert.equal(clicked.length,beforeError);pending=false;
 // Real Core API client: binary GETs never read/write the offline cache or mask failures with an old report.
 const {configureApiClient}=require(core+'/src/api/client.ts');const client=configureApiClient({apiUrl:'http://report.invalid/api'});let network=0;
 client.defaults.adapter=async config=>{network++;return {status:200,statusText:'OK',headers:{},config,data:new Blob(['fresh workbook'])};};
 for(const responseType of ['blob','arraybuffer'])await client.get('/any-module/report',{responseType});assert.equal(network,2);assert.equal(cache.reads,0);assert.equal(cache.writes,0);
 client.defaults.adapter=async config=>{throw Object.assign(Error('network down'),{config});};await assert.rejects(client.get('/any-module/report',{responseType:'blob'}),/network down/);assert.equal(cache.reads,0);
 assert.equal(revoked.length,6);
 console.log('PASS: real country report screens download once in all languages, show problem details, abort abandoned requests, preserve filenames and clean URLs; real Core binary requests bypass cache and stale offline fallback.');
})().catch(error=>{console.error(error);process.exitCode=1;});
