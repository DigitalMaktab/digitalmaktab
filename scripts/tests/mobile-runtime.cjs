// Shared mobile runtime + actual app adapters; transport and SecureStore are controlled.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-mobile-core',app=projects+'/digitalmaktab-mobile-student/node_modules';
const original=Module._load,ts=require(core+'/node_modules/typescript');let exportsCore;
require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const secure=new Map();const storageFor=repo=>{if(!secure.has(repo))secure.set(repo,new Map());const data=secure.get(repo);return{getItemAsync:async key=>data.get(key)??null,setItemAsync:async(key,value)=>{data.set(key,value)},deleteItemAsync:async key=>{data.delete(key)}}};
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/mobile-core')return exportsCore;
 if(['react','react/jsx-runtime','react-dom/client','react-dom','@tanstack/react-query','zustand','zustand/vanilla','axios'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 const repo=parent?.filename.includes('digitalmaktab-mobile-parent')?'parent':'student';
 if(request==='expo-secure-store')return storageFor(repo);
 if(request==='../constants'&&parent?.filename.includes('/core/'))return{Settings:{apiUrl:'https://school.invalid/api'},UserRoleTarget:repo==='parent'?'PARENT':'STUDENT'};
 return original.apply(this,arguments);
};
exportsCore=require(core+'/src/index.ts');const {createMobileApi,createMobileAuthStore,sessionIsBound,MobileSessionQueryProvider,MobileCapacityError}=exportsCore;
const axios=require(app+'/axios'),React=require(app+'/react'),{act}=React;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const response=(config,data={Student:{FirstName:'Original'},Status:false})=>({config,status:200,statusText:'OK',headers:{},data});
const denied=config=>new axios.AxiosError('Denied','ERR_BAD_REQUEST',config,{}, {...response(config),status:401});
const session=(id,role='STUDENT',school='school-one')=>{const claims={nameid:id,role,'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid':school};return{token:'header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature',user:{id,role,firstName:'Person',lastName:'One',email:'test@invalid',raw:{id,schoolId:school}}}};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const wire=[],api=createMobileApi({baseURL:'https://school.invalid/api',maxActive:2,adapter:config=>{const task=deferred();wire.push({config,task});return task.promise;}});let loggedOut=0;api.setUnauthorizedHandler(()=>loggedOut++);api.setAuthToken('token-a');
 const old=api.apiClient.get('/Student/attendance');await turn();assert.equal(wire[0].config.headers.get('Authorization'),'Bearer token-a');assert.equal(wire[0].config.headers.get('Cache-Control'),'no-store');
 api.setAuthToken('token-b');assert(wire[0].config.signal.aborted);wire[0].task.resolve(response(wire[0].config));await assert.rejects(old,axios.isCancel);
 await assert.rejects(api.apiClient.get('/old-override',{accountToken:'token-a'}),axios.isCancel);assert.equal(wire.length,1);
 const stale=api.apiClient.get('/old');await turn();api.setAuthToken('token-c');wire[1].task.reject(denied(wire[1].config));await assert.rejects(stale);assert.equal(loggedOut,0,'old credentials cannot log out current session');
 const publicLogin=api.apiClient.post('/Auth',{email:'wrong',password:'fixture'});await turn();assert(!wire[2].config.headers.get('Authorization'));wire[2].task.reject(denied(wire[2].config));await assert.rejects(publicLogin);assert.equal(loggedOut,0);
 const current=api.apiClient.get('/Notification');await turn();wire[3].task.reject(denied(wire[3].config));await assert.rejects(current);assert.equal(loggedOut,1);
 const one=api.apiClient.get('/one'),two=api.apiClient.get('/two');await turn();await assert.rejects(api.apiClient.get('/three'),error=>error instanceof MobileCapacityError);assert.equal(wire.length,6);
 api.setAuthToken('token-d');await assert.rejects(api.apiClient.get('/still-busy'),error=>error instanceof MobileCapacityError);
 wire[4].task.resolve(response(wire[4].config));wire[5].task.resolve(response(wire[5].config));await Promise.all([assert.rejects(one,axios.isCancel),assert.rejects(two,axios.isCancel)]);
 const callerHeaders=new axios.AxiosHeaders({Authorization:'caller-value'}),read=api.apiClient.get('/safe',{headers:callerHeaders,timeout:999999});await turn();assert.equal(callerHeaders.get('Authorization'),'caller-value');assert.equal(wire[6].config.headers.get('Authorization'),'Bearer token-d');assert.equal(wire[6].config.timeout,20000);
 wire[6].task.resolve(response(wire[6].config,JSON.parse('{"__proto__":{"Secret":"value"},"Student":{"FirstName":"Name"},"Status":false}')));const normalized=await read;assert.equal(normalized.data.student.firstName,'Name');assert.equal(normalized.data.status,false);assert.equal(Object.getPrototypeOf(normalized.data),Object.prototype);assert.equal({}.secret,undefined);
 await assert.rejects(api.apiClient.get('https://outside.invalid/data'));assert.equal(wire.length,7);
 const small=createMobileApi({baseURL:'https://school.invalid/api',maxJsonNodes:100,adapter:async config=>response(config,Array(101).fill('x'))});await assert.rejects(small.apiClient.get('/oversize'));
 const abort=new AbortController();abort.abort();await assert.rejects(api.apiClient.get('/aborted',{signal:abort.signal}),axios.isCancel);assert.equal(wire.length,7);
 assert(sessionIsBound(session('one')));assert(sessionIsBound(session('parent','PARENT')));assert(!sessionIsBound({...session('one'),user:session('other').user}));assert(!sessionIsBound({...session('one'),user:{...session('one').user,raw:{schoolId:'other'}}}));assert(!sessionIsBound({...session('one'),token:'bad-token'}));
 // Shared attendance transport preserves true totals/false marks and validates the bounded contract.
 const sampleSummary={studentId:'student-one',studentLabel:'Core Name',present:91,absent:12,recent:[{date:'2026-10-26',status:false},{date:'2026-10-25',status:true}]};
 let summaryWire,summaryBody=[sampleSummary],summaryHeader={currentPage:1,itemsPerPage:1,totalItems:1,totalPages:1};
 const summaryApi=createMobileApi({baseURL:'https://school.invalid/api',adapter:async config=>{summaryWire=config;return {...response(config,summaryBody),headers:{Pagination:JSON.stringify(summaryHeader)}}}});
 const {readMobileAttendanceSummary,formatMobileAttendanceDay}=exportsCore;
 const summaryPage=await readMobileAttendanceSummary(summaryApi,'mine');assert.equal(summaryWire.url,'/Attendance/mine/summary');assert.deepEqual(summaryWire.params,{pageNumber:1,pageSize:1,recentDays:30});assert.equal(summaryPage.items[0].present,91);assert.equal(summaryPage.items[0].recent[0].status,false);
 summaryHeader={CurrentPage:2,ItemsPerPage:10,TotalItems:11,TotalPages:2};await readMobileAttendanceSummary(summaryApi,'children',2);assert.equal(summaryWire.params.pageSize,10);
 summaryBody=[{...sampleSummary,recent:[{date:'2026-02-30',status:false}]}];await assert.rejects(readMobileAttendanceSummary(summaryApi,'children',2));
 summaryBody=[{...sampleSummary,recent:Array(31).fill(sampleSummary.recent[0])}];await assert.rejects(readMobileAttendanceSummary(summaryApi,'children',2));
 summaryBody=[sampleSummary];summaryHeader={currentPage:1,totalItems:11,totalPages:1};await assert.rejects(readMobileAttendanceSummary(summaryApi,'children'));
 assert.equal(formatMobileAttendanceDay('bad','en-US'),'bad');assert(formatMobileAttendanceDay('2026-10-26','fa-AF').includes('۲۰۲۶'),'Gregorian fallback is independent of interface language');
 const {afghanistanCalendar}=require(projects+'/digitalmaktab-mobile-country-afghanistan/src/calendar/solarHijriAdapter.ts');
 let civilOptions;const formatted=formatMobileAttendanceDay('2026-10-26','en-US',(date,locale,options)=>{civilOptions=options;assert.equal(date.toISOString(),'2026-10-26T00:00:00.000Z');return afghanistanCalendar.formatDate(date,locale,options)});assert(formatted.includes('1405'));assert.equal(civilOptions.timeZone,'UTC');
 // Hydration is single-flight and cannot replace a newer successful login.
 let disk=session('old'),reads=0,clear=0;const initial=deferred();const runtime=createMobileApi({baseURL:'https://school.invalid/api'});
 const store=createMobileAuthStore({api:runtime,login:async id=>session(id),storage:{read:()=>{reads++;return initial.promise},store:async value=>{disk=value},clear:async()=>{clear++;disk=null}},errorKey:()=> 'common.error'});
 const hydration=store.getState().hydrate();assert.equal(hydration,store.getState().hydrate());await turn();assert.equal(reads,1);const login=store.getState().login('new','fixture');assert(store.getState().loginPending);initial.resolve(session('old'));await hydration;await login;assert.equal(store.getState().user.id,'new');assert.equal(disk.user.id,'new');await store.getState().hydrate();assert.equal(reads,1);
 // Physical writes settle in order; stale attempts never publish or clear a newer result.
 const writeGate=deferred(),journal=[];let saved;const coordinated=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>null,store:async value=>{journal.push(value.user.id);if(value.user.id==='first')await writeGate.promise;saved=value},clear:async()=>{saved=null}},errorKey:()=> 'common.error'});
 const first=coordinated.getState().login('first','fixture');const firstFailure=assert.rejects(first,axios.isCancel);await turn();assert.deepEqual(journal,['first']);const second=coordinated.getState().login('second','fixture');await turn();assert.deepEqual(journal,['first']);writeGate.resolve();await firstFailure;await second;assert.equal(saved.user.id,'second');assert.equal(coordinated.getState().user.id,'second');
 const clearGate=deferred();let cleared=false;const logoutStore=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>session('one'),store:async()=>{},clear:async()=>{await clearGate.promise;cleared=true}},errorKey:()=> 'common.error'});
 await logoutStore.getState().hydrate();const logout=logoutStore.getState().logout();assert.equal(logoutStore.getState().status,'anonymous');assert.equal(logoutStore.getState().user,null);assert(!cleared);clearGate.resolve();await logout;
 const broken=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>({...session('one'),user:session('other').user}),store:async()=>{},clear:async()=>{clear++}},errorKey:()=> 'common.error'});const before=clear;await broken.getState().hydrate();assert.equal(broken.getState().status,'anonymous');assert.equal(clear,before+1);
 // Actual app wrappers both consume the one Core implementation and retain existing secure keys.
 const originalAdapter=axios.defaults.adapter;let appTransport=async config=>{const data=JSON.parse(config.data??'{}'),parent=data.email?.startsWith('parent'),bound=session(parent?'parent-one':'student-one',parent?'PARENT':'STUDENT');return response(config,{token:bound.token,role:parent?6:4,[parent?'parent':'student']:{...bound.user.raw,firstName:'Person',lastName:'One',email:data.email}})};axios.defaults.adapter=config=>appTransport(config);
 for(const repo of ['parent','student']){const folder=projects+'/digitalmaktab-mobile-'+repo;const appStore=require(folder+'/src/presentation/hooks/useAuth.ts').useAuthStore;await appStore.getState().hydrate();await appStore.getState().login(repo+'@fixture.invalid','fixture');assert.equal(appStore.getState().status,'authenticated');assert.equal(appStore.getState().user.role,repo.toUpperCase());assert.equal(secure.get(repo).size,2);await appStore.getState().logout();assert.equal(secure.get(repo).size,0);}
 axios.defaults.adapter=originalAdapter;
 // Provider cleanup clears old data and rejects in-flight cache results, even when keys repeat.
 const {JSDOM}=require(projects+'/digitalmaktab-spa/node_modules/jsdom'),dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
 const {createRoot}=require(app+'/react-dom/client'),{useQuery,useQueryClient}=require(app+'/@tanstack/react-query');const root=createRoot(document.getElementById('root'));const queryApi=createMobileApi({baseURL:'https://school.invalid/api'}),slow=deferred();let client,fetches=0;
 function Probe(){client=useQueryClient();const result=useQuery({queryKey:['private','same-key'],queryFn:()=>++fetches===1?slow.promise:Promise.resolve('new-data')});return React.createElement('span',null,result.data??'loading');}
 await act(async()=>root.render(React.createElement(MobileSessionQueryProvider,{api:queryApi},React.createElement(Probe))));const previousClient=client;
 await act(async()=>{queryApi.setAuthToken('new-session');await turn();});for(let i=0;i<100&&document.querySelector('span').textContent!=='new-data';i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});assert.notEqual(client,previousClient);assert.equal(previousClient.getQueryCache().getAll().length,0);assert.equal(document.querySelector('span').textContent,'new-data');
 await act(async()=>{slow.resolve('old-data');await turn();});assert.equal(document.querySelector('span').textContent,'new-data');assert.equal(fetches,2);const lastClient=client;const replacement=createMobileApi({baseURL:'https://other.invalid/api'});await act(async()=>root.render(React.createElement(MobileSessionQueryProvider,{api:replacement},React.createElement(Probe))));assert.notEqual(client,lastClient);assert.equal(lastClient.getQueryCache().getAll().length,0);await act(async()=>root.unmount());assert.equal(client.getQueryCache().getAll().length,0);// Actual data hooks consume React Query cancellation, not just cache fencing.
 for(const repo of ['student','parent']){
  const requests=[];appTransport=config=>{const task=deferred();requests.push({config,task});return task.promise;};
  const folder=projects+'/digitalmaktab-mobile-'+repo,actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const domain=require(folder+'/src/presentation/hooks/'+(repo==='student'?'useStudentData.ts':'useParentData.ts'));const shared=require(folder+'/src/presentation/hooks/useSharedData.ts');
  const reads=[...Object.values(domain),shared.useNotifications,shared.useUnreadNotificationCount,shared.useUpcomingEvents];
  function ActualReads(){for(const read of reads)read();return null;}
  const actualRoot=createRoot(document.getElementById('root'));await act(async()=>actualRoot.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(ActualReads))));
  assert.equal(requests.length,reads.length);assert(requests.every(r=>!r.config.signal.aborted));
  await act(async()=>actualRoot.unmount());assert(requests.every(r=>r.config.signal.aborted));
  await act(async()=>{for(const request of requests)request.task.resolve(response(request.config,[]));await turn();});
 }
 // Mount both actual attendance screens with native presentation adapters. Keep real read hooks/Core/country dates.
 const renderSlot=slot=>typeof slot==='function'?React.createElement(slot):slot;
 const Box=({children,style,...props})=>React.createElement('div',{'data-native':'view',style:Object.assign({},...[style].flat(Infinity).filter(Boolean))},children);
 const Text=({children,color})=>React.createElement('span',{style:{color}},children);
 const Flat=props=>React.createElement('div',null,renderSlot(props.ListHeaderComponent),props.data.length?props.data.map((item,index)=>React.createElement(React.Fragment,{key:index},props.renderItem({item,index}))):renderSlot(props.ListEmptyComponent),renderSlot(props.ListFooterComponent));
 const Sections=props=>React.createElement('div',null,renderSlot(props.ListHeaderComponent),props.sections.length?props.sections.map((section,index)=>React.createElement('section',{key:index},props.renderSectionHeader({section}),section.data.map((item,index)=>React.createElement(React.Fragment,{key:index},props.renderItem({item,index,section}))))):renderSlot(props.ListEmptyComponent),renderSlot(props.ListFooterComponent));
 let language='en-US';const localeBundles=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(locale=>[locale,JSON.parse(fs.readFileSync(projects+'/digitalmaktab-mobile-country-afghanistan/src/locales/'+locale+'/translation.json'))]));
 const t=key=>key.split('.').reduce((value,part)=>value?.[part],localeBundles[language])??key;
 const palette={surface:'#1c1f24',border:'#444444',text:'#f1f3f5',textSecondary:'#dddddd',primary:'#43b9b2',success:'#198754',danger:'#dc3545',white:'#ffffff'};
 const screenLoad=Module._load;
 Module._load=function(request,parent,isMain){
  const screen=parent?.filename.endsWith('/AttendanceScreen.tsx')||parent?.filename.endsWith('/ChildrenAttendanceScreen.tsx');
  if(screen){
   if(request==='react-native')return{View:Box,StyleSheet:{create:x=>x},ActivityIndicator:()=>React.createElement('i',null,'loading'),FlatList:Flat,SectionList:Sections};
   if(request==='react-i18next')return{useTranslation:()=>({t,i18n:{language}})};
   if(request==='@expo/vector-icons/MaterialCommunityIcons')return({name})=>React.createElement('i',{'data-icon':name});
   if(request==='../../../core/theme')return{useColors:()=>palette};
   if(request==='../../../core/country')return{useCountry:()=>({calendar:afghanistanCalendar})};
   if(request==='../../../core/rtl')return{useRTL:()=>({rowDirection:language==='en-US'?'row':'row-reverse'})};
   if(request==='../../hooks'){const repo=parent.filename.includes('mobile-parent')?'parent':'student';return require(projects+'/digitalmaktab-mobile-'+repo+'/src/presentation/hooks/'+(repo==='parent'?'useParentData.ts':'useStudentData.ts'));}
   if(request==='../../components')return{AppScreen:Box,AppCard:Box,AppText:Text,AppEmptyView:({message})=>React.createElement('span',null,message),AppErrorView:()=>React.createElement('span',null,'test-read-error'),AppButton:({label,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},label)};
  }
  return screenLoad.apply(this,arguments);
 };
 const waitFor=async predicate=>{for(let i=0;i<100&&!predicate();i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});assert(predicate());};
 for(const repo of ['student','parent']){
  const folder=projects+'/digitalmaktab-mobile-'+repo,actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const screen=require(folder+'/src/presentation/screens/'+repo+'/'+(repo==='student'?'AttendanceScreen.tsx':'ChildrenAttendanceScreen.tsx'));
  const Component=screen[repo==='student'?'AttendanceScreen':'ChildrenAttendanceScreen'];const calls=[];
  appTransport=async config=>{calls.push(config);const page=config.params.pageNumber,count=repo==='student'?1:11,size=config.params.pageSize;const rows=Array.from({length:Math.min(size,Math.max(0,count-(page-1)*size))},(_,index)=>({...sampleSummary,studentId:'student-'+((page-1)*size+index),studentLabel:'Core Name '+((page-1)*size+index)}));return{...response(config,rows),headers:{Pagination:JSON.stringify({currentPage:page,totalItems:count,totalPages:Math.ceil(count/size)})}}};
  const mounted=createRoot(document.getElementById('root'));
  for(const locale of ['en-US','fa-AF','ps-AF']){
   language=locale;await act(async()=>mounted.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component,{key:locale}))));
   await waitFor(()=>document.body.textContent.includes(t('mobileAttendance.recordedTotals')));
   const body=document.body.textContent;assert(body.includes(t('mobileAttendance.present')));assert(body.includes(t('mobileAttendance.absent')));assert(body.includes(new Intl.NumberFormat(locale).format(91)));assert(body.includes(new Intl.NumberFormat(locale).format(12)));assert(body.includes(afghanistanCalendar.formatDate(new Date('2026-10-26T00:00:00Z'),locale,{dateStyle:'medium',timeZone:'UTC'})));assert(body.includes(t('mobileAttendance.recent')));assert(document.querySelector('[data-icon="close"]'));assert(document.querySelector('[data-icon="check"]'));assert(!body.includes('test-read-error'));
  }
  if(repo==='parent'){
   const next=[...document.querySelectorAll('button')].find(button=>button.textContent===t('mobileAttendance.next'));assert(!next.disabled);await act(async()=>next.click());await waitFor(()=>document.body.textContent.includes('Core Name 10'));assert(calls.some(config=>config.params.pageNumber===2));assert([...document.querySelectorAll('button')].find(button=>button.textContent===t('mobileAttendance.next')).disabled);
  }
  assert(calls.every(config=>config.url.endsWith('/summary')&&config.params.recentDays===30));
  await act(async()=>mounted.unmount());
 }
 Module._load=screenLoad;
 dom.window.close();
 console.log('PASS: shared mobile runtime pins credentials, rejects stale responses/401s, bounds work and normalization, coordinates auth/storage races, validates persisted identity pairs, replaces private query caches, drives both actual app adapters, and renders bounded native attendance summaries in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
