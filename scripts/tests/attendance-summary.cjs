// Real Core summary, table, request hook and shell consumers; network is controlled.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;
 if(request.endsWith('/useJsPdfExportToPdf'))return{__esModule:true,default:()=>async()=>{throw Error('Not an export table')}};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react');
const {MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default,Summary=load('components/attendance/AppAttendanceSummary.tsx'),client=load('api/client.ts');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{LoaderContext}=require(core+'/src/contexts/LoaderContext.tsx');
let account={role:0,token:'first-token',school:{id:'school-one'}},requests=[],mode='ok',pending;
const row=(label='Aggregate pupil')=>({studentId:'pupil',studentLabel:label,present:100,absent:100,recent:[{date:'2026-04-02',status:true}]});
client.get=async(url,config)=>{const request={url,config};requests.push(request);if(mode==='fail')throw{response:{status:503,data:{detail:'Busy'}}};if(mode==='wait')return new Promise(resolve=>{request.resolve=resolve;pending=request;});
 return{status:200,data:[row(config.params.classId?'Scoped pupil':config.params.pageNumber===2?'Second page pupil':'Aggregate pupil')],headers:{pagination:JSON.stringify({totalPages:2,totalItems:11})}};};
const context={showLoader:()=>{},hideLoader:()=>{},setError:()=>{}};
const wrap=child=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderContext.Provider,{value:context},h(AuthContext.Provider,{value:{user:account,userRole:account.role}},child))));
const ClassSelect=({name,value,onChange})=>h('label',null,'Class',h('select',{name,value,onChange:e=>onChange(e.target.value)},h('option',{value:''},'All'),h('option',{value:'class-one'},'One')));
coreExports={AppAttendanceSummary:Summary,AppClassSelect:ClassSelect,AppCard:({children})=>h('section',null,children),AppAlert:({children})=>h('div',null,children),AppAnnouncementBanner:()=>null,
 useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,...require(core+'/src/helper/tableScope.ts')};
const resources={'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}};
for(const lang of ['fa-AF','ps-AF'])resources[lang]={translation:JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+lang+'/translation.json'))};
(async()=>{await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){await act(async()=>i18n.changeLanguage(lang));localStorage.setItem('user',JSON.stringify(account));
  requests=[];mode='ok';let ui=render(wrap(h(Summary,{source:{kind:'school'},showStudentName:true,recentDays:30,filterControls:{initialValues:{classId:''},render:(values,change)=>h(ClassSelect,{name:'classId',value:values.classId??'',onChange:value=>change('classId',value)})}})));
  await waitFor(()=>assert(ui.getByText('Aggregate pupil')));assert.equal(requests.length,1);assert(ui.getByText('50%'));
  assert.equal(requests[0].url,'/attendance/school/summary');assert.equal(requests[0].config.params.recentDays,30);assert.equal(requests[0].config.headers['Cache-Control'],'no-store');assert.equal(requests[0].config.accountToken,'first-token');
  fireEvent.change(ui.getByLabelText('Class'),{target:{value:'class-one'}});
  fireEvent.change(ui.getByLabelText(i18n.t('dateRange.from'),{selector:'input'}),{target:{value:'2026-04-02'}});
  assert.equal(requests.length,1,'draft controls do not issue reads');fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));
  await waitFor(()=>assert(ui.getByText('Scoped pupil')));assert.equal(requests.length,2);assert.equal(requests[1].config.params.creationDateFrom,'2026-04-02');assert.equal(requests[1].config.params.classId,'class-one');
  assert(ui.getByText('50%'),'synthesized row creation date must not filter out a remote aggregate');
  fireEvent.click(ui.getByRole('button',{name:i18n.t('pagination.next')}));await waitFor(()=>assert.equal(requests.length,3));assert.equal(requests[2].config.params.pageNumber,2);assert.equal(requests[2].config.params.creationDateFrom,'2026-04-02');
  mode='wait';fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset').trim()})[0]);await waitFor(()=>assert.equal(requests.length,4));const old=pending;
  account={...account,token:'renewed-token'};localStorage.setItem('user',JSON.stringify(account));mode='ok';ui.rerender(wrap(h(Summary,{source:{kind:'school'},showStudentName:true,recentDays:30})));
  await waitFor(()=>assert.equal(requests.length,5));assert(old.config.signal.aborted);assert.equal(requests[4].config.accountToken,'renewed-token');
  await act(async()=>old.resolve({status:200,data:[row('Obsolete pupil')],headers:{pagination:JSON.stringify({totalPages:1})}}));assert(!ui.queryByText('Obsolete pupil'));ui.unmount();cleanup();account={...account,token:'first-token'};
  // Real shell consumers delegate to the same Core server summary; no full-array fetch effect.
  for(const [file,kind] of [['school/attendance/AdminAttendance.tsx','school'],['student/StudentAttendance.tsx','mine'],['parent/ParentChildAttendance.tsx','children']]){
   requests=[];mode='ok';const Screen=require(shell+'/src/screens/'+file).default;ui=render(wrap(h(Screen)));await waitFor(()=>assert.equal(requests.length,1));assert.equal(requests[0].url,`/attendance/${kind}/summary`);await waitFor(()=>assert(ui.getByText('50%')));cleanup();
  }
 }
 requests=[];mode='ok';let sorted=render(wrap(h(Summary,{source:{kind:'school'},showStudentName:true})));await waitFor(()=>assert.equal(requests.length,1));
 fireEvent.click(sorted.getByRole('button',{name:i18n.t('pagination.next')}));await waitFor(()=>assert.equal(requests.length,2));
 const header=sorted.getByText(i18n.t('attendanceSummary.present.label')).closest('th');fireEvent.click(header);await waitFor(()=>assert.equal(requests.length,3));
 assert.equal(requests[2].config.params.pageNumber,1);assert.equal(requests[2].config.params.sortBy,'present');assert.equal(requests[2].config.params.sortOrder,'asc');
 await waitFor(()=>assert(sorted.getByText('Aggregate pupil')));fireEvent.click(sorted.getByText(i18n.t('attendanceSummary.present.label')).closest('th'));await waitFor(()=>assert.equal(requests.length,4));assert.equal(requests[3].config.params.sortOrder,'desc');
 await waitFor(()=>assert(sorted.getByText('Aggregate pupil')));fireEvent.click(sorted.getByText(i18n.t('attendanceSummary.present.label')).closest('th'));await waitFor(()=>assert.equal(requests.length,5));assert.equal(requests[4].config.params.sortBy,'');cleanup();
 const local=h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{user:account,userRole:0}},h(Summary,{attendances:[{id:'mark',enrollment:{studentId:'local'},status:true,dateTime:'2026-04-01T00:00:00Z'}]}))));
 const localView=render(local);assert(localView.getByText('100%'));cleanup();
 console.log('PASS: real shared attendance summary/table and all shell consumers page server totals, apply class/creation filters once, preserve ratios, pin account credentials, abort obsolete reads, and suppress late results in en/fa/ps.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
