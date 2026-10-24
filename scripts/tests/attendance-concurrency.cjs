// Exercise the real teacher screen, shared controls and API hooks with controlled network/storage.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=f=>require(core+'/src/'+f).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const client=load('api/client.ts'),teacher=load('api/teacher.ts');const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts');
const {getUser}=require(core+'/src/helper/helper.ts'),{getMutationAccountScope}=require(core+'/src/helper/auth/accountIdentity.ts');
const classId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',enrollmentId='cccccccc-cccc-cccc-cccc-cccccccccccc',year={id:'dddddddd-dddd-dddd-dddd-dddddddddddd'};
const account={role:UserRole.TEACHER,token:'attendance-token',teacher:{id:'teacher-one',schoolId:'school-one'}};
let writes=[],reads=[],queued=[],cache=new Map(),sync,block,fail=false,readError;
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
client.get=async(url,config)=>{reads.push({url,config});if(readError)throw{response:{status:readError}};return{status:200,data:url.startsWith('/teacher/classStudents/')?[{id:enrollmentId,student:{firstName:'Pupil',lastName:'One'}}]:[{enrollmentId,status:false,dateTime:'2026-03-31T20:00:00Z'}],headers:{pagination:JSON.stringify({totalPages:1})}}};
client.post=async(url,dto,config)=>{writes.push({url,dto,config});if(block)await block.promise;if(fail)throw{response:{status:500,data:{detail:'Failed'}}};return{status:200,data:{},headers:{}}};
coreExports={ResponseResult,teacher,getUser,getMutationAccountScope,useUser:load('hooks/useUser.ts'),
 getPersonFirstName:p=>p?.firstName,getPersonLastName:p=>p?.lastName,...require(core+'/src/helper/tableScope.ts'),
 useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useTeacherOperations:load('hooks/useTeacherOperations.ts'),
 readAllPages:require(core+'/src/helper/readAllPages.ts').readAllPages,useMainOperations:()=>({data:year,fetchActiveCalendarYear:async()=>{}}),
 useOfflineSync:options=>{sync=options;return{pending:0,online:navigator.onLine,flush:async()=>{},refreshCount:async()=>{}}},enqueueOffline:async(kind,payload)=>{queued.push({kind,payload});return queued.length},
 saveToCache:async(key,data)=>cache.set(key,data),getFromCache:async key=>cache.get(key),
 AppClassSelect:()=>null,AppLocalDatePicker:()=>null,BulkImportModal:()=>null,
 AppTable:props=>h('div',null,(props.data??[]).map(row=>h('div',{key:row.id},props.columns.map(column=>h('div',{key:column.accessor},column.render?column.render(row[column.accessor],row):row[column.accessor]))))),
};
for(const [name,file] of Object.entries({AppAlert:'components/AppAlert.tsx',AppCard:'components/card/AppCard.tsx',AppButton:'components/AppButton.tsx',AppPresentAbsentToggle:'components/attendance/AppPresentAbsentToggle.tsx'}))coreExports[name]=load(file);
const Entry=require(shell+'/src/screens/teacher/attendance/TeacherAttendance.tsx').default;
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:[`/teacher-attendance?classId=${classId}&date=2026-04-01`]},h(LoaderProvider,null,h(AuthContext.Provider,{value:{user:account,userRole:account.role,isAuthenticated:true}},children))));
const button=(ui,key)=>ui.getByRole('button',{name:i18n.t(key),exact:true});
function reset(){writes=[];reads=[];queued=[];cache.clear();block=undefined;fail=false;readError=undefined;localStorage.setItem('user',JSON.stringify(account));Object.defineProperty(navigator,'onLine',{value:true,configurable:true});}
(async()=>{
 const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const language of Object.keys(resources)){
  reset();await i18n.changeLanguage(language);let ui=render(h(Entry),{wrapper});await waitFor(()=>ui.getByText('Pupil One'));
  // UTC day differs from the selected school day. Already-saved absence must stay absent.
  fireEvent.click(button(ui,'attendance.submit'));assert.equal(writes.length,0);
  fireEvent.click(button(ui,'attendance.present.label'));block=deferred();fireEvent.click(button(ui,'attendance.submit'));await waitFor(()=>assert.equal(writes.length,1));
  assert.equal(writes[0].dto.date,'2026-04-01');assert.equal(writes[0].dto.attendances[0].status,true);assert.equal(writes[0].config.accountToken,account.token);assert.equal(writes[0].config.headers['Cache-Control'],'no-store');assert(button(ui,'attendance.present.label').disabled);
  fireEvent.click(button(ui,'attendance.submit'));assert.equal(writes.length,1);const finish=block;block=undefined;await act(async()=>finish.resolve());await waitFor(()=>assert(!button(ui,'attendance.submit').disabled));assert(cache.size);assert([...cache.keys()].every(key=>key.includes(getMutationAccountScope(account))));cleanup();
  // An authoritative denial must never expose the cached roster as a fallback.
  readError=403;ui=render(h(Entry),{wrapper});await waitFor(()=>ui.getByText(i18n.t('attendance.failed')));assert.equal(ui.queryByText('Pupil One'),null);assert.equal(ui.queryByRole('button',{name:i18n.t('attendance.submit'),exact:true}),null);cleanup();
  reset();ui=render(h(Entry),{wrapper});await waitFor(()=>ui.getByText('Pupil One'));fireEvent.click(button(ui,'attendance.present.label'));fail=true;fireEvent.click(button(ui,'attendance.submit'));await waitFor(()=>button(ui,'attendance.submit').disabled===false&&ui.getByText(i18n.t('attendance.failed')));assert.equal(queued.length,0,'unknown completion is never silently enqueued');cleanup();
  reset();ui=render(h(Entry),{wrapper});await waitFor(()=>ui.getByText('Pupil One'));fireEvent.click(button(ui,'attendance.present.label'));Object.defineProperty(navigator,'onLine',{value:false,configurable:true});fireEvent.click(button(ui,'attendance.submit'));await waitFor(()=>assert.equal(queued.length,1));assert.equal(queued[0].payload.date,'2026-04-01');assert.equal(queued[0].kind,`attendance:v2:${getMutationAccountScope(account)}`);assert.equal(writes.length,0);
  const originalHandler=sync.handler;localStorage.setItem('user',JSON.stringify({...account,token:'different-token',teacher:{id:'other',schoolId:'other-school'}}));assert.equal(await originalHandler(queued[0].payload),false);assert.equal(writes.length,0);cleanup();
 }
 console.log('PASS: real attendance screen preserves the selected school date, recognizes UTC-offset marks, pins actors, scopes cache/offline payloads, rejects cross-account replay, guards double submits and never queues an unknown online outcome in en/fa/ps.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
