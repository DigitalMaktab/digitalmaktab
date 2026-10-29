// Real Core read lifecycle + report screens; PostgreSQL query/snapshot behavior is tested separately.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
let exportsForScreen;const original=Module._load;Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return exportsForScreen;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,act,cleanup}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const get=file=>require(core+'/src/'+file).default,useReloadableRead=get('hooks/useReloadableRead.ts'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const api=get('api/client.ts'),fee=get('api/fee.ts'),financial=get('api/financialHealth.ts');
const health={collectedThisMonth:37,expectedThisMonth:100,outstandingTotal:560,agingBucket0To30:70,agingBucket31To60:50,agingBucket61To90:70,agingBucket90Plus:370,topOverdueParents:[],generatedAt:'2027-01-17T10:00:00Z'};
const feeReport={totalInvoiced:310,totalCollected:30,totalOutstanding:280,unpaidCount:3,partialCount:1,paidCount:0,monthly:[],byClass:[]};
let requests=[],mode='defer';api.get=(url,config)=>{const task=deferred();requests.push({url,config,task});return mode==='success'?Promise.resolve({status:200,data:url.includes('financial-health')?health:feeReport}):mode==='fail'?Promise.reject({response:{status:503}}):task.promise;};
const paths={AppCard:'components/card/AppCard.tsx',AppButton:'components/AppButton.tsx',AppAlert:'components/AppAlert.tsx',AppKpiTile:'components/kpi/AppKpiTile.tsx'};
exportsForScreen=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,get(file)]));Object.assign(exportsForScreen,{useReloadableRead,financialDashboard:financial,fee,useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormattedDate:()=>value=>value,AppTable:()=>null,AppBarChart:()=>null,AppPieChart:()=>null,AppCalendarDate:()=>null,useCalendar:()=>({months:[]}),ResponseResult:require(core+'/src/dtos/ResultEnum.ts').ResponseResult});
const Health=require(shell+'/src/screens/school/dashboard/FinancialHealth.tsx').default,Report=require(shell+'/src/screens/school/fees/AdminFeeReports.tsx').default;
let last;
function Probe({loader}){last=useReloadableRead(loader);return h('div',null,h('output',null,last.data??''),h('button',{onClick:()=>void last.reload()},'Reload'));}
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,children)));
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 let reads=[],account={token:'account-a',role:0};const loader=signal=>{const task=deferred();reads.push({signal,task});return task.promise;};
 const node=fn=>h(AuthContext.Provider,{value:{user:account}},h(Probe,{loader:fn}));
 let ui=render(node(loader),{wrapper});await waitFor(()=>assert.equal(reads.length,1));ui.rerender(node(signal=>loader(signal)));await act(async()=>{});assert.equal(reads.length,1,'inline callbacks do not refetch');fireEvent.click(ui.getByRole('button'));fireEvent.click(ui.getByRole('button'));assert.equal(reads.length,1,'active reads are single-flight');
 await act(async()=>reads[0].task.resolve('Account A'));await waitFor(()=>assert.equal(last.data,'Account A'));
 fireEvent.click(ui.getByRole('button'));await waitFor(()=>assert.equal(reads.length,2));await act(async()=>reads[1].task.reject({response:{status:503}}));assert.equal(last.data,'Account A');assert(last.error);
 fireEvent.click(ui.getByRole('button'));await waitFor(()=>assert.equal(reads.length,3));account={token:'account-b',role:0};ui.rerender(node(loader));assert.equal(last.data,null);assert(reads[2].signal.aborted);await waitFor(()=>assert.equal(reads.length,4));
 await act(async()=>reads[2].task.resolve('Late private Account A'));assert.equal(last.data,null);await act(async()=>reads[3].task.resolve('Account B'));assert.equal(last.data,'Account B');
 fireEvent.click(ui.getByRole('button'));await waitFor(()=>assert.equal(reads.length,5));await act(async()=>reads[4].task.reject({response:{status:403}}));assert.equal(last.data,null,'authoritative permission loss clears the snapshot');
 fireEvent.click(ui.getByRole('button'));await waitFor(()=>assert.equal(reads.length,6));ui.unmount();assert(reads[5].signal.aborted);await act(async()=>reads[5].task.resolve('Unmounted'));
 for(const lang of Object.keys(resources)){
  await act(async()=>i18n.changeLanguage(lang));
  for(const [Screen,namespace] of [[Health,'financialDashboard'],[Report,'adminFeeReports']]){
   requests=[];mode='fail';ui=render(h(Screen),{wrapper});await waitFor(()=>ui.getByRole('alert'));assert.equal(requests.length,1);assert.equal(requests[0].config.headers['Cache-Control'],'no-store');assert(!requests[0].config.signal.aborted);
   const message=i18n.t(namespace+'.loadFailed');assert(ui.getByText(message));mode='defer';fireEvent.click(ui.getByRole('button',{name:i18n.t(namespace+'.refresh')}));await waitFor(()=>assert.equal(requests.length,2));assert(ui.getByRole('button',{name:i18n.t(namespace+'.refresh')}).disabled);
   await act(async()=>requests[1].task.resolve({status:200,data:Screen===Health?health:feeReport}));await waitFor(()=>assert(!ui.queryByRole('alert')));
   mode='fail';fireEvent.click(ui.getByRole('button',{name:i18n.t(namespace+'.refresh')}));await waitFor(()=>ui.getByRole('alert'));assert(ui.container.textContent.includes(new Intl.NumberFormat(lang).format(Screen===Health?560:310)),'last snapshot remains after overload');
   mode='defer';fireEvent.click(ui.getByRole('button',{name:i18n.t(namespace+'.refresh')}));await waitFor(()=>assert.equal(requests.length,4));ui.unmount();assert(requests[3].config.signal.aborted);await act(async()=>requests[3].task.resolve({status:200,data:Screen===Health?health:feeReport}));cleanup();
  }
 }
 // Actual academic report hooks also use the scoped lifecycle and pin credentials.
 const useReportCard=get('hooks/useReportCard.ts'),useClassOverview=get('hooks/useClassOverview.ts');
 for(const kind of ['mine','child','student','class']){
  requests=[];mode='defer';let value,resource='one';account={token:'academic-a',role:0};
  function AcademicProbe(){value=kind==='class'?useClassOverview(resource):useReportCard(kind,resource);return h('output',null,value.data?.marker??'');}
  const academicNode=()=>h(AuthContext.Provider,{value:{user:account}},h(AcademicProbe));
  ui=render(academicNode(),{wrapper});await waitFor(()=>assert.equal(requests.length,1));assert.equal(requests[0].config.accountToken,'academic-a');assert.equal(requests[0].config.headers['Cache-Control'],'no-store');
  const previous=requests[0];account={token:'academic-b',role:0};resource='two';ui.rerender(academicNode());assert.equal(value.data,null);assert(previous.config.signal.aborted);await waitFor(()=>assert.equal(requests.length,2));assert.equal(requests[1].config.accountToken,'academic-b');
  await act(async()=>previous.task.resolve({status:200,data:{marker:'old-private'}}));assert.equal(value.data,null);
  await act(async()=>requests[1].task.resolve({status:200,data:{marker:'current'}}));assert.equal(value.data.marker,'current');
  await act(async()=>{void value.reload();});await waitFor(()=>assert.equal(requests.length,3));const current=requests[2];ui.unmount();assert(current.config.signal.aborted);await act(async()=>current.task.resolve({status:200,data:{marker:'late'}}));cleanup();
 }
 // Actual calendar screen reuses this lifecycle and displays server guidance.
 const calendarApi=get('api/schoolCalendar.ts');
 Object.assign(exportsForScreen,{schoolCalendar:calendarApi,AuthContext,
  UserRole:require(core+'/src/models/UserRole.ts').UserRole,
  usePermissions:()=>({can:()=>false,canAccess:()=>false}),
  useCalendar:()=>require(core+'/src/contexts/CalendarContext.tsx').gregorianCalendar,
  getCalendarMonth:require(core+'/src/helper/calendarMonth.ts').getCalendarMonth,
  localDateKey:require(core+'/src/helper/calendarMonth.ts').localDateKey,
  getCalendarEntryLabel:entry=>entry.kind,getCalendarEntryManagePath:()=>null,
  AppMonthCalendar:({entries,onSelectDate})=>h('div',null,h('output',null,entries.map(row=>row.title).join(',')),h('button',{onClick:()=>onSelectDate(new Date(),entries)},'Open day')),
  AppModal:({isVisible,modalContent})=>isVisible?h('aside',null,modalContent):null});
 const Calendar=require(shell+'/src/screens/school/calendar/SchoolCalendar.tsx').default;
 for(const lang of Object.keys(resources)){
  await act(async()=>i18n.changeLanguage(lang));requests=[];mode='defer';account={token:'calendar-a',role:0};
  const calendarNode=()=>h(AuthContext.Provider,{value:{user:account}},h(Calendar));
  ui=render(calendarNode(),{wrapper});await waitFor(()=>assert.equal(requests.length,1));
  assert.equal(requests[0].config.headers['Cache-Control'],'no-store');
  const detail=i18n.t('schoolCalendar.loadFailed')+' (413)';
  await act(async()=>requests[0].task.reject({response:{status:413,data:{detail}}}));assert.equal(ui.getByRole('alert').textContent,detail);
  account={token:'calendar-b',role:0};ui.rerender(calendarNode());await waitFor(()=>assert.equal(requests.length,2));const old=requests[1];
  account={token:'calendar-c',role:0};ui.rerender(calendarNode());assert(old.config.signal.aborted);await waitFor(()=>assert.equal(requests.length,3));
  await act(async()=>old.task.resolve({status:200,data:{entries:[{title:'Old private calendar'}]}}));assert(!ui.container.textContent.includes('Old private calendar'));
  await act(async()=>requests[2].task.resolve({status:200,data:{entries:[{id:'event',kind:'EVENT',title:'Current calendar'}]}}));assert(ui.container.textContent.includes('Current calendar'));fireEvent.click(ui.getByRole('button',{name:'Open day'}));assert(ui.container.querySelector('aside'));
  account={token:'calendar-d',role:0};ui.rerender(calendarNode());assert.equal(ui.container.querySelector('aside'),null,'old calendar detail cannot cross account scope');await waitFor(()=>assert.equal(requests.length,4));ui.unmount();assert(requests[3].config.signal.aborted);cleanup();
 }
 // Holiday screen delegates paging/filter/export loads to the actual Core API.
 let holidayTable;
 Object.assign(exportsForScreen,{AppTable:props=>{holidayTable=props;return h('output',null,'Holiday table');},AppForm:()=>null,AppFormInput:()=>null,AppFormLocalDatePicker:()=>null});
 const Holidays=require(shell+'/src/screens/school/calendar/Holidays.tsx').default;
 requests=[];mode='defer';ui=render(h(Holidays),{wrapper});assert(holidayTable.serverSort);assert.equal(holidayTable.data.length,0);
 assert.equal(holidayTable.columns.find(column=>column.accessor==='name').filter.accessor,'searchTerm');
 const stop=new AbortController();const criteria={searchTerm:'رخصتی',creationDateFrom:'2026-04-01',creationDateTo:'2026-04-30',sortBy:'name',sortOrder:'desc'};
 const holidayRead=holidayTable.fetchPageData(2,50,criteria,stop.signal);assert.equal(requests.length,1);assert.equal(requests[0].url,'/holidays');
 assert.deepEqual(requests[0].config.params,{...criteria,pageNumber:2,pageSize:50});assert.equal(requests[0].config.signal,stop.signal);assert.equal(requests[0].config.headers['Cache-Control'],'no-store');
 await act(async()=>requests[0].task.resolve({status:200,data:[],headers:{pagination:JSON.stringify({totalPages:2,totalItems:60})}}));await holidayRead;
 const key=holidayTable.reloadKey;act(()=>holidayTable.actions.find(action=>action.label===i18n.t('holiday.refresh')).onClick());assert.equal(holidayTable.reloadKey,String(Number(key)+1));assert.equal(requests.length,1,'screen does not duplicate AppTable page fetching');ui.unmount();cleanup();
 console.log('PASS: real report screens recover from overload in three locales, retain snapshots, send no-store/cancellation and block duplicate reads; Core read scope clears private data across accounts/permissions, ignores late responses and aborts on unmount.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
