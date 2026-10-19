const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let exportsForScreen;const original=Module._load;Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core'&&exportsForScreen)return exportsForScreen;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter,useNavigate}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default,{tableScopeId,tableScopeDate}=require(core+'/src/helper/tableScope.ts'),{readAllPages}=require(core+'/src/helper/readAllPages.ts'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx');
let calls=[],nav;const empty=async(kind,args)=>{calls.push({kind,args});return {status:200,data:[]};};
const classA='11111111-1111-1111-1111-111111111111',classB='22222222-2222-2222-2222-222222222222',course='33333333-3333-3333-3333-333333333333',year='44444444-4444-4444-4444-444444444444';
const Input=load('components/input/AppStandaloneInput.tsx');
exportsForScreen={
 AppTable:load('components/table/AppTable.tsx'),AppCard:load('components/card/AppCard.tsx'),AppAlert:load('components/AppAlert.tsx'),AppButton:load('components/AppButton.tsx'),AppStandaloneInput:Input,
 AppLocalDatePicker:load('components/AppLocalDatePicker.tsx'),AppEnumFilterSelect:load('components/select/AppEnumFilterSelect.tsx'),AppPresentAbsentToggle:()=>null,BulkImportModal:()=>null,
 AppClassSelect:({homeroomOnly,...props})=>h(Input,{...props,label:'Class'}),AppCourseSelect:({classId,...props})=>h(Input,{...props,label:'Course'}),
 tableScopeId,tableScopeDate,readAllPages,ResponseResult:require(core+'/src/dtos/ResultEnum.ts').ResponseResult,ExamType:require(core+'/src/models/ExamType.ts').ExamType,
 getPersonFirstName:()=>'',getPersonLastName:()=>'',getGradingScheme:()=>({maxScore:()=>100}),
 useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,
 useMainOperations:()=>React.useMemo(()=>({fetchActiveCalendarYear:async()=>{},data:{id:year}}),[]),useTeacherOperations:()=>({addAttendance:async()=>{},addGrades:async()=>{}}),
 useOfflineSync:()=>({pending:0,online:true,flush:async()=>{}}),saveToCache:async()=>{},getFromCache:async()=>[],enqueueOffline:async()=>{},
 teacher:{classStudents:(...args)=>empty('roster',args),attendanceList:(...args)=>empty('attendance',args),gradeList:(...args)=>empty('grades',args)},
};
const Attendance=require(projects+'/digitalmaktab-spa/src/screens/teacher/attendance/TeacherAttendance.tsx').default,Grades=require(projects+'/digitalmaktab-spa/src/screens/teacher/grades/TeacherGradeEntry.tsx').default;
function Navigation(){nav=useNavigate();return null;}
const mount=(Screen,url)=>render(h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:[url]},h(AuthContext.Provider,{value:{userRole:3,user:{role:3}}},h(Navigation),h(Screen)))));
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 assert.equal(tableScopeDate('2026-02-30'),'');assert.equal(tableScopeDate('2024-02-29'),'2024-02-29');assert.equal(tableScopeId('-'.repeat(36)),'');assert.equal(tableScopeId(classA),classA);
 let ui=mount(Attendance,'/teacher-attendance?classId='+classA+'&date=2026-10-19');await waitFor(()=>assert(calls.find(call=>call.kind==='attendance')));let loaded=calls.find(call=>call.kind==='attendance');assert.equal(loaded.args[1].classId,classA);assert.equal(loaded.args[1].dateTime,'2026-10-19T00:00:00.000Z');
 calls=[];await act(async()=>nav('/teacher-attendance?classId='+classB+'&date=2026-10-20'));await waitFor(()=>assert(calls.find(call=>call.kind==='attendance')));assert.equal(calls.find(call=>call.kind==='attendance').args[1].classId,classB);assert.equal(calls.find(call=>call.kind==='attendance').args[1].dateTime,'2026-10-20T00:00:00.000Z');cleanup();
 calls=[];ui=mount(Grades,'/teacher-grades?classId='+classA+'&courseId='+course+'&examType=1');await waitFor(()=>assert(calls.find(call=>call.kind==='grades')));loaded=calls.find(call=>call.kind==='grades');assert.deepEqual(loaded.args[1],{classId:classA,courseId:course,examType:1});cleanup();
 console.log('PASS: validated class/date links, leap dates, reminder-scoped attendance and grade API filters, and switching reminder links without stale scope.');
})().catch(error=>{console.error(error);process.exitCode=1;});
