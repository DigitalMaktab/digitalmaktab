const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),Module=require('module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let mocks;const original=Module._load;Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core'&&mocks)return mocks;
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter,Routes,Route}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),load=file=>require(core+'/src/'+file).default;
let reads=[],saves=[],failSave=false,delay=false,reader=false;
const record={id:'record',enrollmentId:'enrol-a',period:0,registered:true,instructionalDays:90,presentDays:85,absentDays:2,sickDays:1,leaveDays:2,participation:0,version:'version-a'};
let pupil={id:'enrol-a',classId:'class-a',calendarYearId:'year-a',studentId:'pupil-a',studentName:'Student A',fatherName:'Father A',grade:2,branchName:'A',nativeYear:'1405',creationDate:'2026-04-01T00:00:00Z',midterm:null,annual:null};
mocks={usePermissions:require(core+'/src/access/usePermissions.ts').usePermissions,useApplicationModules:()=>({scope:{schoolId:'school-a'}}),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer};
for(const [name,file] of [['AppTable','table/AppTable'],['AppCard','card/AppCard'],['AppBaseEditor','AppBaseEditor'],['AppAlert','AppAlert'],['AppButton','AppButton'],['AppButtonLink','AppButtonLink'],['AppFormInput','form/AppFormInput'],['AppFormOptionSelect','form/AppFormOptionSelect'],['AppStatusBadge','AppStatusBadge']])mocks[name]=load('components/'+file+'.tsx');
const Select=load('components/AppSelect.tsx');mocks.AppClassSelect=({name,value,onChange})=>h(Select,{label:i18n.t('class.className.label'),name,value,onChange:event=>onChange(event.target.value)},h('option',{value:''},'Choose'),h('option',{value:'class-a'},'Class A'),h('option',{value:'class-b'},'Class B'));
mocks.apiClient={get:async(url,config={})=>{reads.push({url,config});if(delay===true)await new Promise(resolve=>delay=resolve);return {data:url.includes('/enrollments/')?pupil:url.endsWith('class-b')?[]:[pupil]};},put:async(url,dto,config)=>{saves.push({url,dto,config});if(failSave)throw {response:{data:{detail:'Reload the latest record.'}}};return {data:{...record,...dto}}}};
const List=require(country+'/src/ministryRecords/AfghanMinistryRecordList.tsx').default,Editor=require(country+'/src/ministryRecords/AfghanMinistryRecordEditor.tsx').default;
const helpers=require(country+'/src/ministryRecords/contracts.ts');
function view(url){const user=reader?{role:8,staff:{capabilities:['students.read','attendance.read']}}:{role:0};return render(h(I18nextProvider,{i18n},h(AuthContext.Provider,{value:{user,userRole:user.role}},h(MemoryRouter,{initialEntries:[url]},h(Routes,null,h(Route,{path:'/afghanistan/ministry-records',element:h(List)}),h(Route,{path:'/afghanistan/ministry-records/:classId/:enrollmentId/:period',element:h(Editor)}))))));}
const field=(ui,key)=>ui.container.querySelector(`input[name="${key}"]`);
(async()=>{
 const resources={};for(const lang of ['en-US','fa-AF','ps-AF'])resources[lang]={translation:require(core+'/node_modules/lodash/merge')({},JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),JSON.parse(fs.readFileSync(country+'/src/locales/'+lang+'/translation.json')))};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);reads=[];saves=[];pupil={...pupil,midterm:null,annual:null};
  let ui=view('/afghanistan/ministry-records?classId=class-a');await waitFor(()=>assert(ui.getByText('Student A')));assert.equal(reads.length,1);
  const filter=ui.getByLabelText(i18n.t('class.className.label'),{exact:false,selector:'select'});assert(filter.closest('.filter-form'));
  fireEvent.change(filter,{target:{value:'class-b'}});assert.equal(reads.length,1);fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));await waitFor(()=>assert.equal(reads.length,2));await waitFor(()=>assert(!ui.queryByText('Student A')));assert(ui.getByLabelText(i18n.t('class.className.label'),{exact:false,selector:'select'}));cleanup();
  ui=view('/afghanistan/ministry-records/class-a/enrol-a/0');await waitFor(()=>assert(field(ui,'instructionalDays')));
  for(const key of helpers.dayFields)assert.equal(field(ui,key).value,'');
  for(const key of helpers.dayFields)fireEvent.change(field(ui,key),{target:{value:'0'}});
  fireEvent.change(ui.getByLabelText(i18n.t('afghanMinistryRecords.registered'),{exact:false,selector:'select'}),{target:{value:'true'}});
  fireEvent.change(ui.getByLabelText(i18n.t('afghanMinistryRecords.participation'),{exact:false,selector:'select'}),{target:{value:'0'}});
  fireEvent.change(field(ui,'instructionalDays'),{target:{value:'1'}});fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText(i18n.t('afghanMinistryRecords.unbalancedDays'))));assert.equal(saves.length,0);
  fireEvent.change(field(ui,'instructionalDays'),{target:{value:'0'}});fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(saves.length,1));assert.deepEqual(saves[0].dto,{version:undefined,registered:true,instructionalDays:0,presentDays:0,absentDays:0,sickDays:0,leaveDays:0,participation:0});assert(saves[0].url.endsWith('/enrollments/enrol-a/periods/0'));cleanup();
  pupil={...pupil,midterm:record};failSave=true;ui=view('/afghanistan/ministry-records/class-a/enrol-a/0');await waitFor(()=>assert.equal(field(ui,'presentDays').value,'85'));fireEvent.change(field(ui,'presentDays'),{target:{value:'84'}});fireEvent.change(field(ui,'absentDays'),{target:{value:'3'}});fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText('Reload the latest record.')));assert.equal(saves.at(-1).dto.version,'version-a');assert.equal(saves.at(-1).dto.presentDays,84);assert.equal(field(ui,'presentDays').value,'84');cleanup();failSave=false;
 }
 reader=true;const ui=view('/afghanistan/ministry-records/class-a/enrol-a/0');await waitFor(()=>assert(ui.getByText(new Intl.NumberFormat(i18n.language).format(85))));assert(!ui.container.querySelector('form'));cleanup();reader=false;
 delay=true;const abandoned=view('/afghanistan/ministry-records/class-a/enrol-a/0');await waitFor(()=>assert.equal(typeof delay,'function'));const signal=reads.at(-1).config.signal;cleanup();assert(signal.aborted);await act(async()=>delay());delay=false;
 assert.deepEqual(helpers.validateMinistryForm({instructionalDays:'0',presentDays:'0',absentDays:'0',sickDays:'0',leaveDays:'0',participation:'0',registered:'true'},key=>key),{});
 console.log('PASS: real ministry table filters apply once and survive empty results; shared editor rejects unbalanced counts, preserves explicit zero and versions, retains failed edits, restricts readers and cancels stale requests in all 3 locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
