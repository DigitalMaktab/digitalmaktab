// Real Core request hook, table/filter controls and both shell viewers; controlled transport.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let exportsForScreen;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return exportsForScreen;
 if(request.endsWith('/useJsPdfExportToPdf'))return{__esModule:true,default:()=>async()=>{throw Error('Not an export table')}};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react');
const {MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default,ScheduleTable=load('components/table/ScheduleTable.tsx'),api=load('api/client.ts');
const {UserRole}=require(core+'/src/models/UserRole.ts');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{LoaderContext}=require(core+'/src/contexts/LoaderContext.tsx');
exportsForScreen={ScheduleTable,AppCard:load('components/card/AppCard.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer};
const Student=require(shell+'/src/screens/student/StudentTimetable.tsx').default,Parent=require(shell+'/src/screens/parent/ParentChildTimetable.tsx').default;
const labels={'en-US':['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'],'fa-AF':['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'],'ps-AF':['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه']};
let account,requests=[],mode='ok',marker='Private',globalLoads=0,observed=[];
const grid=(name=marker,lang=i18n.language)=>labels[lang].map((day,index)=>({day,...Object.fromEntries(Array.from({length:10},(_,hour)=>['hour'+(hour+1),hour===0?name+' '+index:hour===9&&index===0?'Late period':'']))}));
api.get=(url,config)=>{
 const request={url,config,lang:i18n.language};requests.push(request);
 if(mode==='wait')return new Promise((resolve,reject)=>{request.resolve=resolve;request.reject=reject});
 if(mode==='empty')return Promise.resolve({status:200,data:[],headers:{}});
 if(mode==='fail')return Promise.reject({response:{status:503,data:{detail:'Busy'}}});
 if(mode==='deny')return Promise.reject({response:{status:403,data:{detail:'Denied'}}});
 const rows=grid(config.params.creationDateFrom?'Filtered':marker);
 if(mode==='malformed')rows[0].hour1={private:'object'};
 return Promise.resolve({status:200,data:rows,headers:{}});
};
const context={showLoader:()=>globalLoads++,hideLoader:()=>{},setError:()=>{}};
function Snapshot({children}){React.useLayoutEffect(()=>{observed.push(document.body.textContent)});return children;}
const node=Screen=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderContext.Provider,{value:context},h(AuthContext.Provider,{value:{user:account,userRole:account?.role}},h(Snapshot,null,h(Screen))))));
const settled=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,20))});
const changeSelect=async(element,value)=>{await act(async()=>{require(core+'/node_modules/jquery')(element).val(value).trigger('change')});};
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';
 const resources=Object.fromEntries(Object.keys(labels).map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(labels)){
  await act(async()=>i18n.changeLanguage(lang));
  for(const [Screen,kind] of [[Student,'mine'],[Parent,'children']]){
   account=kind==='mine'?{role:UserRole.STUDENT,token:'original',student:{id:'pupil',schoolId:'school'}}:{role:UserRole.PARENT,token:'original',parent:{id:'parent',schoolId:'school'}};
   localStorage.setItem('user',JSON.stringify(account));requests=[];mode='ok';marker='Private';
   let ui=render(node(Screen));await waitFor(()=>assert(ui.getByText('Private 0')));assert.equal(requests.length,1);assert.equal(requests[0].url,'/schedule/'+kind);assert.equal(requests[0].config.accountToken,'original');assert.equal(requests[0].config.headers['Cache-Control'],'no-store');assert(requests[0].config.signal);assert(ui.getByText('Late period'));
   await settled();ui.rerender(node(Screen));await settled();assert.equal(requests.length,1,'choices and callback renders do not refetch');
   const dates=ui.container.querySelectorAll('input[type=date]');assert.equal(dates.length,2);fireEvent.change(dates[0],{target:{value:'2026-04-02'}});fireEvent.change(dates[1],{target:{value:'2026-04-03'}});
   await changeSelect(ui.container.querySelector('select[name$="-id"]'),'3');assert.equal(requests.length,1,'draft controls wait for Apply');
   fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));await waitFor(()=>assert(ui.getByText('Filtered 3')));assert(!ui.queryByText('Filtered 0'));assert.equal(requests.length,2);assert.deepEqual(requests[1].config.params,{creationDateFrom:'2026-04-02',creationDateTo:'2026-04-03',id:'3'});
   // A token renewal remounts the private row cache while preserving applied criteria.
   mode='wait';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert.equal(requests.length,3));const old=requests[2];assert(!ui.queryByText('Filtered 3'));
   account={...account,token:'renewed'};localStorage.setItem('user',JSON.stringify(account));observed=[];ui.rerender(node(Screen));await waitFor(()=>assert.equal(requests.length,4));assert(old.config.signal.aborted);assert(observed.every(text=>!text.includes('Filtered 3')));assert.equal(requests[3].config.accountToken,'renewed');assert.equal(requests[3].config.params.id,'3');assert.equal(requests[3].config.params.creationDateFrom,'2026-04-02');
   await act(async()=>old.resolve({status:200,data:grid('Late old account'),headers:{}}));assert(!ui.queryByText('Late old account 3'));
   await act(async()=>requests[3].resolve({status:200,data:grid('Renewed'),headers:{}}));await waitFor(()=>assert(ui.getByText('Renewed 3')));
   // A new immutable actor with the same token gets no rows or filters from the previous actor.
   const before=requests.length;account=kind==='mine'?{...account,student:{id:'other-pupil',schoolId:'school'}}:{...account,parent:{id:'other-parent',schoolId:'school'}};
   localStorage.setItem('user',JSON.stringify(account));observed=[];ui.rerender(node(Screen));assert(!ui.queryByText('Renewed 3'));await waitFor(()=>assert.equal(requests.length,before+1));assert.deepEqual(requests.at(-1).config.params,{});assert(observed.every(text=>!text.includes('Renewed 3')));
   await act(async()=>requests.at(-1).resolve({status:200,data:grid('Other actor'),headers:{}}));await waitFor(()=>assert(ui.getByText('Other actor 0')));
   mode='ok';const resetDates=ui.container.querySelectorAll('input[type=date]');fireEvent.change(resetDates[0],{target:{value:'2026-05-01'}});await changeSelect(ui.container.querySelector('select[name$="-id"]'),'1');fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));await waitFor(()=>assert(ui.getByText('Filtered 1')));
   fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset').trim()})[0]);await waitFor(()=>assert(ui.getByText('Private 0')));assert.deepEqual(requests.at(-1).config.params,{});
   mode='empty';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(ui.getByText(i18n.t((kind==='mine'?'studentTimetable':'parentChildTimetable')+'.empty'))));assert(ui.container.querySelector('input[type=date]'),'empty results retain filters');
   mode='fail';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(ui.getByText(i18n.t('table.error.label'))));const failedCount=requests.length;await settled();assert.equal(requests.length,failedCount,'failed reads never automatically retry');assert(!ui.queryByText('Other actor 0'));
   mode='malformed';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert.equal(requests.length,failedCount+1));await settled();assert(ui.getByText(i18n.t('table.error.label')));assert(!ui.container.textContent.includes('[object'));
   mode='ok';marker='Recovered';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(ui.getByText('Recovered 0')));
   mode='deny';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(ui.getByText(i18n.t('table.error.label'))));assert(!ui.queryByText('Recovered 0'));
   mode='wait';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(requests.at(-1).resolve));const pending=requests.at(-1);cleanup();assert(pending.config.signal.aborted);await act(async()=>pending.resolve({status:200,data:grid('Unmounted'),headers:{}}));
  }
 }
 // Locale replacement cancels pending transport and retains the ordinal day + source dates.
 await act(async()=>i18n.changeLanguage('en-US'));account={role:UserRole.STUDENT,token:'locale-token',student:{id:'locale-pupil',schoolId:'school'}};localStorage.setItem('user',JSON.stringify(account));requests=[];mode='ok';marker='English private';
 let ui=render(node(Student));await waitFor(()=>assert(ui.getByText('English private 0')));await changeSelect(ui.container.querySelector('select[name$="-id"]'),'2');const date=ui.container.querySelector('input[type=date]');fireEvent.change(date,{target:{value:'2026-05-02'}});fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));await waitFor(()=>assert(ui.getByText('Filtered 2')));
 mode='wait';fireEvent.click(ui.getByRole('button',{name:i18n.t('schedule.refresh')}));await waitFor(()=>assert(requests.at(-1).resolve));const old=requests.at(-1);observed=[];
 await act(async()=>i18n.changeLanguage('fa-AF'));await waitFor(()=>assert.equal(requests.length,4));assert(old.config.signal.aborted);assert(!ui.queryByText('Filtered 2'));assert.equal(requests.at(-1).config.params.id,'2');assert.equal(requests.at(-1).config.params.creationDateFrom,'2026-05-02');
 await act(async()=>old.resolve({status:200,data:grid('Late English','en-US'),headers:{}}));assert(!ui.queryByText('Late English 2'));
 await act(async()=>requests.at(-1).resolve({status:200,data:grid('Dari private','fa-AF'),headers:{}}));await waitFor(()=>assert(ui.getByText('Dari private 2')));assert(ui.getAllByText(labels['fa-AF'][2]).length);assert(!ui.queryByText('Monday'));cleanup();
 assert.equal(globalLoads,0,'table-local reads never compete for the global loader');
 // Local composite report snapshots retain the provider-free renderer contract.
 ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(ScheduleTable,{data:grid('Local','fa-AF')}))));assert(ui.getByText('Local 0'));assert(!ui.queryByRole('button',{name:i18n.t('schedule.refresh')}));cleanup();
 console.log('PASS: actual student/parent timetable screens use one cancellable scoped row cache, source-date + ordinal-day Apply filters, retained criteria on renewal/locale changes, cleared criteria on actor switches, explicit refresh, rejected malformed grids, no automatic retries, all ten periods and provider-free local snapshots in three locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
