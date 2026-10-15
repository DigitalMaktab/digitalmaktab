const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let mocks,api;const original=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core'&&mocks)return mocks;
 if(/\/api\/exam$/.test(request))return {__esModule:true,default:api};
 if(/\/select\/App(Class|Course)Select$/.test(request)){const kind=request.includes('Class')?'class':'course';return {__esModule:true,default:props=>h('button',{type:'button','aria-label':'Choose '+kind,onClick:()=>props.onChange(kind+'-id')},kind)};}
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),{MemoryRouter}=require(app+'/react-router-dom'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default;
const {CalendarProvider,gregorianCalendar}=require(core+'/src/contexts/CalendarContext.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
mocks={AppButton:load('components/AppButton.tsx'),AppCalendarGrid:load('components/calendar/AppCalendarGrid.tsx'),AppStandaloneInput:load('components/input/AppStandaloneInput.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer};
const {afghanistanCalendar}=require(country+'/src/calendarModule.ts');
let choices,loads=[],created=[],failLoad=false,failCreate=false,createResolve,createdCallbacks=0,items=[];
api={schedulingOptions:async signal=>{loads.push(signal);if(failLoad)throw Error('network');return {status:200,data:choices};},create:async dto=>{created.push(dto);if(failCreate)throw {response:{data:{detail:'Stale examination period: reload choices.'}}};if(createResolve===true)await new Promise(resolve=>{createResolve=resolve;});return {status:200,data:{id:'created',...dto}};},list:async()=>({status:200,data:items}),conflicts:async()=>({status:200,data:{sameRoomConflicts:[],sameStudentConflicts:[],sameProctorConflicts:[]}})};
const Form=load('components/exam/AppExamCreateForm.tsx');
mocks={...mocks,AppExamCreateForm:Form,AppCard:load('components/card/AppCard.tsx'),AppModal:load('components/modal/AppModal.tsx'),AppAlert:load('components/AppAlert.tsx'),AppTable:load('components/table/AppTable.tsx'),ResponseResult,UserRole:require(core+'/src/models/UserRole.ts').UserRole,useUser:()=>({role:0}),useFormattedDate:load('hooks/useFormattedDate.ts'),exam:api};
const Screen=require(projects+'/digitalmaktab-spa/src/screens/exam/Exams.tsx').default;
const view=(component,calendar=afghanistanCalendar)=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:0}},h(CalendarProvider,{value:calendar},component)))));
const form=()=>h(Form,{onCreated:()=>{createdCallbacks++;}});
const fill=async(ui,calendar)=>{
 fireEvent.click(ui.getByRole('button',{name:'Choose class'}));fireEvent.click(ui.getByRole('button',{name:'Choose course'}));
 fireEvent.change(ui.getByLabelText(i18n.t('exam.create.fields.title'),{exact:false}),{target:{value:'Mathematics exam'}});
 const dateInput=calendar===gregorianCalendar?ui.container.querySelector('input[type="date"]'):ui.getByLabelText(i18n.t('exam.create.fields.startAt'),{exact:true});
 if(calendar===gregorianCalendar)fireEvent.change(dateInput,{target:{value:'2026-07-15'}});
 else {fireEvent.click(dateInput);fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanDatePicker.today')}));}
};
(async()=>{
 const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:require(core+'/node_modules/lodash/merge')({},JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json')))};
 await i18n.init({lng:'fa-AF',resources,interpolation:{escapeValue:false}});
 choices={required:true,options:[{providerId:'afghanistan.exam-periods',optionId:'midterm',version:'v1',calendarYearId:'year-id',label:'Midterm ۱۴۰۵',fromDate:'2026-07-01',toDate:'2026-07-16'}]};
 let ui=view(form());await waitFor(()=>assert(ui.getByLabelText(i18n.t('exam.scheduling.period'),{exact:false})));assert.equal(loads.length,1);
 await fill(ui);fireEvent.change(ui.getByLabelText(i18n.t('exam.scheduling.period'),{exact:false}),{target:{value:'midterm'}});
 failCreate=true;fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText('Stale examination period: reload choices.')));
 assert.deepEqual(created[0].schedulingSelection,{providerId:'afghanistan.exam-periods',optionId:'midterm',version:'v1'});assert.equal(created[0].calendarYearId,'year-id');assert(created[0].startAt.endsWith('Z'));assert.equal(createdCallbacks,0);
 choices={...choices,options:choices.options.map(option=>({...option,version:'v2'}))};failCreate=false;
 fireEvent.click(ui.getByRole('button',{name:i18n.t('exam.scheduling.reload')}));await waitFor(()=>assert.equal(loads.length,2));
 await act(async()=>{});createResolve=true;fireEvent.submit(ui.container.querySelector('form'));
 await waitFor(()=>assert.equal(typeof createResolve,'function'));assert(ui.getByRole('button',{name:i18n.t('exam.create.submit')}).disabled);
 assert.equal(created.at(-1).schedulingSelection.version,'v2');await act(async()=>{createResolve();});await waitFor(()=>assert.equal(createdCallbacks,1));cleanup();assert(loads[0].aborted);
 // Empty required choices keep submit unavailable; retry a failed read without loops.
 choices={required:true,options:[]};failLoad=true;ui=view(form());await waitFor(()=>assert(ui.getByText(i18n.t('exam.scheduling.loadFailed'))));assert(ui.getByRole('button',{name:i18n.t('exam.create.submit')}).disabled);
 const before=loads.length;failLoad=false;fireEvent.click(ui.getByRole('button',{name:i18n.t('exam.scheduling.reload')}));await waitFor(()=>assert(ui.getByText(i18n.t('exam.scheduling.noneAvailable'))));assert.equal(loads.length,before+1);assert(ui.getByRole('button',{name:i18n.t('exam.create.submit')}).disabled);cleanup();
 // Schools without a scheduling provider use the class's year on the server, with no empty year UUID sent.
 await i18n.changeLanguage('en-US');choices={required:false,options:[]};createResolve=false;ui=view(form(),gregorianCalendar);await waitFor(()=>assert(!ui.queryByRole('status')));await fill(ui,gregorianCalendar);fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(createdCallbacks,2));assert.equal(created.at(-1).calendarYearId,undefined);assert.equal(created.at(-1).schedulingSelection,undefined);cleanup();
 // Actual consuming table accepts HTTP 200 and filters provider labels through AppTable.
 items=[{id:'exam',title:'Visible HTTP exam',startAt:'2026-07-15T08:00:00Z',durationMinutes:60,schedulingOption:{...choices.options[0],label:'Country midterm'},creationDate:'2026-10-15'}];
 ui=view(h(Screen));await waitFor(()=>assert(ui.getByText('Visible HTTP exam')));assert(ui.getByText('Country midterm'));
 assert(ui.getByLabelText(i18n.t('exam.scheduling.period'),{exact:false}).closest('.filter-form'));
 fireEvent.change(ui.getByLabelText(i18n.t('exam.scheduling.period'),{exact:false}),{target:{value:'does not match'}});fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('Visible HTTP exam'));cleanup();
 console.log('PASS: shared exam form uses localized native dates, scoped/versioned choices, retry without loops, visible stale errors, one in-flight submit, HTTP 200 success and class-year fallback; consuming table filters provider labels.');
})().catch(error=>{console.error(error);process.exitCode=1;});
