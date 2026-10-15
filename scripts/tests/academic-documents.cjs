const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let mocks,reportApi,transcriptApi;const original=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core'&&mocks)return mocks;
 if(/\/api\/reportCard$/.test(request))return {__esModule:true,default:reportApi};
 if(/\/api\/transcript$/.test(request))return {__esModule:true,default:transcriptApi};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),{MemoryRouter,Routes,Route}=require(app+'/react-router-dom'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default;
const {CalendarProvider,gregorianCalendar}=require(core+'/src/contexts/CalendarContext.tsx'),{CountryPersonProvider}=require(core+'/src/contexts/CountryPersonContext.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx');
mocks={AppButton:load('components/AppButton.tsx'),AppCalendarGrid:load('components/calendar/AppCalendarGrid.tsx'),AppStandaloneInput:load('components/input/AppStandaloneInput.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,apiClient:{get:async()=>({data:[]})}};
const {afghanistanCalendar}=require(country+'/src/calendarModule.ts'),{afghanStudentTableExtension}=require(country+'/src/studentTable.ts');
const base={id:'course',creationDate:'2025-03-20T00:00:00Z',creationUserName:'',updateDate:'2025-03-20T00:00:00Z',updateUserName:'',status:true};
const student={...base,id:'student',firstName:'Core Student',lastName:'Ahmad 10012',countryCode:'AF',countryDetails:{fatherNameNative:'CountryFather',asasNumber:10012}};
const data={student,school:{schoolName:'Test school',address:{street:'Street',city:{unexpected:'object'},country:{unexpected:'object'},district:{districtName:'District',city:{stateName:'Province'}}}},transcriptNumber:'TR-1002',issuedAt:'2025-03-20T12:00:00Z',years:[{calendarYearId:'year',year:'1403',classes:[{classId:'class',className:'دوم',courses:[{...base,courseId:'course',subjectName:'Mathematics',midTermScore:0,finalScore:85}]}]}]};
const report={student,grades:[],attendance:[],fees:[],comment:'Teacher narrative',commentUpdatedAt:data.issuedAt};
let transcriptCalls=[],reportCalls=[],failTranscript=false,failReport=false,pendingTranscript;
transcriptApi={get:async(id,signal)=>{transcriptCalls.push({id,signal});if(failTranscript)throw Error('denied');if(pendingTranscript===true)await new Promise(resolve=>pendingTranscript=resolve);return {status:200,data};}};
reportApi={mine:async signal=>{reportCalls.push(signal);if(failReport)throw Error('denied');return {status:200,data:report,headers:{}};},forStudent:async(id,signal)=>({status:200,data:report,headers:{}})};
const Transcript=load('components/transcript/AppTranscript.tsx'),Report=load('components/reportCard/AppReportCard.tsx'),useReportCard=load('hooks/useReportCard.ts');
mocks={...mocks,AppTranscript:Transcript,AppReportCard:Report,AppAlert:load('components/AppAlert.tsx'),ResponseResult:require(core+'/src/dtos/ResultEnum.ts').ResponseResult,transcript:transcriptApi,useReportCard};
const TranscriptScreen=require(projects+'/digitalmaktab-spa/src/screens/transcript/Transcript.tsx').default;
const StudentScreen=require(projects+'/digitalmaktab-spa/src/screens/student/StudentReportCard.tsx').default;
const view=(component,calendar=afghanistanCalendar)=>render(h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:['/transcript/student']},h(AuthContext.Provider,{value:{userRole:0}},h(LoaderProvider,null,h(CalendarProvider,{value:calendar},h(CountryPersonProvider,{students:[afghanStudentTableExtension],teachers:[]},component)))))));
(async()=>{
 const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:require(core+'/node_modules/lodash/merge')({},JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json')))};
 await i18n.init({lng:'fa-AF',resources,interpolation:{escapeValue:false}});
 for(const language of ['fa-AF','ps-AF','en-US']){
  await i18n.changeLanguage(language);let ui=view(h(Transcript,{transcript:data}));
  const document=ui.container.querySelector('.app-print-document');assert.equal(document.dir,language==='en-US'?'ltr':'rtl');assert.equal(document.lang,language);
  assert(ui.getByText('CountryFather'));assert(ui.getByText('Core Student Ahmad 10012'));assert(ui.getByText('Mathematics'));assert(!ui.container.textContent.includes('[object'));
  assert(ui.getByText('Street, District, Province'));assert(ui.container.querySelector('[data-print-controls]'));assert(ui.container.querySelector('table'));
  if(language==='fa-AF')assert(/۳۰ حوت ۱۴۰۳/.test(ui.container.textContent));if(language==='en-US')assert(ui.container.textContent.includes('30 Hoot 1403'));cleanup();
  ui=view(h(Report,{report}));assert(ui.getByText('CountryFather'));assert(ui.getByText('Teacher narrative'));assert.equal(ui.container.querySelector('.app-print-document').dir,language==='en-US'?'ltr':'rtl');cleanup();
 }
 await i18n.changeLanguage('fa-AF');let ui=view(h(Routes,null,h(Route,{path:'/transcript/:studentId',element:h(TranscriptScreen)})));
 await waitFor(()=>assert(ui.getByText('Mathematics')));assert.equal(transcriptCalls.length,1);cleanup();assert(transcriptCalls[0].signal.aborted);
 failTranscript=true;ui=view(h(Routes,null,h(Route,{path:'/transcript/:studentId',element:h(TranscriptScreen)})));await waitFor(()=>assert(ui.getByText(i18n.t('transcript.notAvailable'))));cleanup();failTranscript=false;
 pendingTranscript=true;ui=view(h(Routes,null,h(Route,{path:'/transcript/:studentId',element:h(TranscriptScreen)})));await waitFor(()=>assert.equal(typeof pendingTranscript,'function'));const last=transcriptCalls.at(-1);cleanup();assert(last.signal.aborted);await act(async()=>pendingTranscript());pendingTranscript=false;
 ui=view(h(StudentScreen));await waitFor(()=>assert(ui.getByText('Teacher narrative')));await act(async()=>new Promise(resolve=>setTimeout(resolve,50)));assert.equal(reportCalls.length,1,'Loader updates must not trigger repeated report requests');cleanup();assert(reportCalls[0].aborted);
 failReport=true;ui=view(h(StudentScreen));await waitFor(()=>assert(ui.getByText(i18n.t('reportCard.notAvailable'))));assert.equal(reportCalls.length,2);cleanup();
 console.log('PASS: shared academic documents show Core/country fields, native dates, language/direction and safe structured addresses; real screens accept HTTP 200, cancel abandoned reads, show failures and issue one report request through the real loader provider.');
})().catch(error=>{console.error(error);process.exitCode=1;});
