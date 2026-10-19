const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','i18next','formik','react-router-dom'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react');
const {I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const Form=require(core+'/src/components/form/AppForm.tsx').default,Bells=require(core+'/src/academicYears/AppTimetableBellFields.tsx').default,Button=require(core+'/src/components/AppButton.tsx').default;
const {academicYearPlanForm,academicYearPlanPayload,validAcademicYearPlan}=require(core+'/src/academicYears/contracts.ts');
const {validBellSchedules}=require(core+'/src/academicYears/bellSchedules.ts');
const ScheduleTable=require(core+'/src/components/table/ScheduleTable.tsx').default,{MemoryRouter}=require(app+'/react-router-dom');
const make=()=>({...academicYearPlanForm(),displayName:'1405',timeZone:'Asia/Kabul',teachingWeekdays:['6','0','1','2','3','4'],bellSchedules:[{code:'grade-8-morning',shift:'0',gradeFrom:'8',gradeTo:'8',weekdays:['6','0','1','2','3','4'],periods:Array.from({length:8},(_,i)=>({startTime:`${String(8+Math.floor(i*40/60)).padStart(2,'0')}:${String(i*40%60).padStart(2,'0')}`,endTime:`${String(8+Math.floor((i+1)*40/60)).padStart(2,'0')}:${String((i+1)*40%60).padStart(2,'0')}`}))}]});
(async()=>{
 const resources={};for(const locale of ['en-US','fa-AF','ps-AF'])resources[locale]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+locale+'/translation.json'))}};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 const initial=make(),payload=academicYearPlanPayload(initial);assert.equal(payload.bellSchedules[0].shift,0);assert.equal(payload.bellSchedules[0].periods.length,8);
 assert.equal(payload.bellSchedules[0].periods[7].endMinute,800);assert.deepEqual(academicYearPlanForm(payload).bellSchedules,initial.bellSchedules);
 const midnight=make();midnight.bellSchedules[0].periods=[{startTime:'23:20',endTime:'00:00'}];assert.equal(academicYearPlanPayload(midnight).bellSchedules[0].periods[0].endMinute,1440);
 const overlap=make();overlap.bellSchedules[0].periods[1].startTime='08:20';assert.equal(validBellSchedules(overlap.bellSchedules,overlap.teachingWeekdays),false);
 const duplicate=make();duplicate.bellSchedules.push({...duplicate.bellSchedules[0],code:'same-grade-overlap'});assert.equal(validBellSchedules(duplicate.bellSchedules,duplicate.teachingWeekdays),false);
 const closed=make();closed.bellSchedules[0].weekdays=['5'];assert.equal(validBellSchedules(closed.bellSchedules,closed.teachingWeekdays),false);
 for(const locale of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(locale);let saved=[];
  const view=render(h(I18nextProvider,{i18n},h(Form,{initialValues:{plan:make()},validate:values=>validAcademicYearPlan(values.plan,'2026-03-21','2027-03-20')?{}:{plan:'invalid'},onSubmit:values=>{saved.push(academicYearPlanPayload(values.plan))}},h(Bells,{name:'plan'}),h(Button,{type:'submit',label:'Save test'}))));
  assert.equal(view.container.querySelectorAll('input[type="time"]').length,16);
  assert(!view.container.textContent.includes('timetablePlanning.'));
  const period='input[name="plan.bellSchedules.0.periods.1.startTime"]';
  await act(async()=>fireEvent.change(view.container.querySelector(period),{target:{value:'08:20'}}));
  await act(async()=>{fireEvent.click(view.getByRole('button',{name:'Save test'}));await new Promise(resolve=>setTimeout(resolve,25));});assert.equal(saved.length,0,'overlapping bells must not submit');
  await act(async()=>fireEvent.change(view.container.querySelector(period),{target:{value:'08:40'}}));
  await act(async()=>{fireEvent.click(view.getByRole('button',{name:'Save test'}));});await waitFor(()=>assert.equal(saved.length,1));
  assert.equal(saved[0].bellSchedules[0].shift,0);assert.equal(saved[0].bellSchedules[0].periods[0].startMinute,480);assert.equal(saved[0].bellSchedules[0].periods[7].endMinute,800);
  assert.equal(view.container.querySelector('input[name="plan.bellSchedules.0.code"]').value,'grade-8-morning');
  cleanup();
  const table=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(ScheduleTable,{data:[{id:'saturday',day:'Saturday',hour1:'Math',hour8:'Dari',hour9:'Physics ninth',hour10:'Chemistry tenth'}]}))));
  assert(table.getByText('Physics ninth'));assert(table.getByText('Chemistry tenth'));
  cleanup();
 }
 console.log('PASS: shared bell controls in three languages; eight 40-minute periods, first shift, native time input validation, overlap/weekday checks, payload round-trip and midnight.');
})().catch(error=>{console.error(error);process.exitCode=1});
