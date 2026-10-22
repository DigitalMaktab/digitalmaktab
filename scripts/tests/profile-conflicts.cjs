// Real profile editors, Core conflict review/forms and API serialization. Database races are tested independently.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter,Routes,Route}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=f=>require(core+'/src/'+f).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const client=load('api/client.ts'),school=load('api/school.ts'),parent=load('api/parent.ts');
let writes=[],failure=true,remote,readBlocked,reads=[],writeBlocked,readFailure=false;
const clone=value=>JSON.parse(JSON.stringify(value));
client.get=async(url,config)=>{
 if(url.startsWith('/school/student/')||url.startsWith('/school/teacher/')||/^\/parent\/[^/]+$/.test(url)||url==='/teacher'){
  reads.push({url,signal:config?.signal,cache:config?.headers?.['Cache-Control']});if(readFailure)throw{response:{status:503}};if(readBlocked)await readBlocked.promise;return{status:200,headers:{},data:clone(remote)};
 }
 return{status:200,headers:{},data:[]};
};
client.put=async(url,dto)=>{writes.push({url,dto:clone(dto)});if(writeBlocked)await writeBlocked.promise;if(failure)throw{response:{status:409,data:{detail:'Another editor saved this record',code:'record_edit_conflict'}}};remote={...remote,...dto,revision:'33333333-3333-3333-3333-333333333333'};return{status:200,headers:{},data:clone(remote)};};
const paths={AppForm:'components/form/AppForm.tsx',AppAlert:'components/AppAlert.tsx',AppButton:'components/AppButton.tsx',AppCard:'components/card/AppCard.tsx',AppFormCard:'components/card/AppFormCard.tsx',AppBaseEditor:'components/AppBaseEditor.tsx',AppFormInput:'components/form/AppFormInput.tsx',AppFormSelect:'components/form/AppFormSelect.tsx',AppAddressForm:'components/form/AppAddressForm.tsx',AppFormSectionContainer:'components/form/AppFormSectionContainer.tsx',AppPasswordRevealModal:'components/AppPasswordRevealModal.tsx',AppModal:'components/modal/AppModal.tsx',AppRecordConflictReview:'components/form/AppRecordConflictReview.tsx',AppFormOptionSelect:'components/form/AppFormOptionSelect.tsx',AppFormSubmitButton:'components/form/AppFormSubmitButton.tsx'};
coreExports=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file)]));
const noop=()=>null;
Object.assign(coreExports,{ResponseResult,school,parent,teacher:load('api/teacher.ts'),isRecordEditConflict:require(core+'/src/helper/recordConflict.ts').isRecordEditConflict,personConflictFields:require(core+'/src/helper/personConflictFields.ts').personConflictFields,useMutationIntent:load('hooks/useMutationIntent.ts'),useSchoolOperations:load('hooks/useSchoolOperations.ts'),useParentOperations:load('hooks/useParentOperations.ts'),useTeacherOperations:load('hooks/useTeacherOperations.ts'),useUser:load('hooks/useUser.ts'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormData:require(core+'/src/hooks/useFormData.ts').useFormData,getValidationSchema:require(core+'/src/helper/helper.ts').getValidationSchema,useSchoolCountryCode:()=>"AT",useModuleEditorTabs:()=>[],getPersonFirstName:person=>person?.firstName,getPersonLastName:person=>person?.lastName,AppTab:({tabs})=>tabs[0].content});
for(const name of ['AppTable','AppFormLocalDatePicker','AppGenderSelects','AppBloodGroupSelect','AppDisabilityTypeSelect','AppClassSelect','AppClassAutoSuggest','AppPhotoPicker','AppResetPasswordButton','AppStudentPickerModal','AppStatusBadge','AppCountryPersonFields','AppImg','AppStaffProfile'])coreExports[name]=noop;
for(const name of ['Gender','DiscountKind','BloodGroup','DisabilityType','SchoolType','UserRole'])coreExports[name]=require(core+'/src/models/'+name+'.ts')[name];
coreExports.AppButtonLink=({children,to,...props})=>h('a',{href:to},children);
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx');coreExports.AuthContext=AuthContext;coreExports.getAssetUrl=()=>'';
const initial={id:'record-one',revision:'11111111-1111-1111-1111-111111111111',firstName:'Original',lastName:'Person',email:'person@profile.invalid',gender:0,joiningClassId:'room-one',dateOfBirth:'2015-01-01',primaryAddress:{street:'Street',region:'Region',village:'Village',postalCode:'1010',districtId:'district-one',addressType:1},secondaryAddress:{street:'Street',region:'Region',village:'Village'},phoneNumber:{countryId:'country-one',number:'1234567'},disabilityType:0,bloodGroup:0,monthlyFee:100,children:[]};
const latest=()=>({...clone(initial),dateOfBirth:'2015-02-01T00:00:00Z',revision:'22222222-2222-2222-2222-222222222222',firstName:'Remote name',primaryAddress:{...initial.primaryAddress,street:'Remote street',postalCode:'2020'}});
const screens=[['student','StudentEditor'],['teacher','TeacherEditor'],['parent','ParentEditor']].map(([kind,name])=>({kind,Screen:require(shell+'/src/screens/school/'+kind+'/'+name+'.tsx').default}));
const {CalendarProvider}=require(core+'/src/contexts/CalendarContext.tsx');
const {afghanistanCalendar}=require(projects+'/digitalmaktab-spa-country-afghanistan/src/calendarModule.ts');
function Calendar({children}) {return h(CalendarProvider,{value:i18n.language==='en-US'?undefined:afghanistanCalendar},children);}
const wrapper=({children})=>h(I18nextProvider,{i18n},h(Calendar,null,h(MemoryRouter,{initialEntries:['/edit/record-one']},h(LoaderProvider,null,h(Routes,null,h(Route,{path:'/edit/:id',element:children}),h(Route,{path:'/*',element:h('p',null,'Saved destination')}))))));
const SelfProfile=require(shell+'/src/screens/account/MyProfile.tsx').default;
let changeSession,logins=[];
function Session({role}) {
 const key=role===coreExports.UserRole.TEACHER?'teacher':'parent';const [user,setUser]=React.useState({role,token:'original-token',[key]:clone(initial)});changeSession=patch=>setUser(current=>({...current,...patch}));
 return h(AuthContext.Provider,{value:{user,userRole:role,isAuthenticated:true,login:next=>{logins.push(next);setUser(next)},logout:()=>{}}},h(SelfProfile));
}
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);
  for(const {kind,Screen} of screens){
   writes=[];reads=[];failure=true;readBlocked=null;remote=clone(initial);const ui=render(h(Screen),{wrapper});
   await waitFor(()=>assert.equal(ui.container.querySelector('[name="firstName"]')?.value,'Original'));
   assert.equal(reads.length,1,kind+' initially fetches one full versioned record');assert.equal(reads[0].cache,'no-store');assert(reads[0].signal);
   fireEvent.change(ui.container.querySelector('[name="firstName"]'),{target:{value:'My typed name'}});
   fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByRole('button',{name:i18n.t('recordConflict.review')})));
   assert.equal(writes[0].dto.revision,initial.revision);remote=latest();const draft=ui.container.querySelector('[name="firstName"]');assert.equal(draft.value,'My typed name');
   readBlocked=deferred();fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));await waitFor(()=>assert.equal(reads.length,2));
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));assert.equal(reads.length,2,'one review request');
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.keep')}));assert(reads.at(-1).signal.aborted);await act(async()=>readBlocked.resolve());readBlocked=null;assert.equal(draft.value,'My typed name');
   readFailure=true;fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));await waitFor(()=>assert(ui.getByText(i18n.t('recordConflict.loadFailed'))));assert(ui.getByRole('button',{name:i18n.t('recordConflict.useSaved')}).disabled);
   readFailure=false;fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.retry')}));await waitFor(()=>assert(ui.getByText('Remote name')));assert(!ui.container.textContent.includes('[object'));
   if(kind==='student') {
    const expected=lang==='en-US'?new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(latest().dateOfBirth)):afghanistanCalendar.formatDate(new Date(latest().dateOfBirth),lang,{timeZone:'UTC'});
    assert(ui.getByText(expected),'date-only comparison uses the active country calendar and UTC bounds');
   }
   assert(ui.getByText('My typed name'));assert.equal(writes.length,1,'review never saves');assert(ui.getByRole('button',{name:i18n.t('recordConflict.useSaved')}).closest('.modal-footer'));
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.keep')}));await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.equal(draft.value,'My typed name');
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));await waitFor(()=>assert(ui.getByText('Remote name')));fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.useSaved')}));
   await waitFor(()=>assert.equal(ui.container.querySelector('[name="firstName"]').value,'Remote name'));assert.equal(writes.length,1);
   fireEvent.change(ui.container.querySelector('[name="firstName"]'),{target:{value:'Reviewed edit'}});failure=false;fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,2));
   assert.equal(writes[1].dto.revision,latest().revision);assert.equal(writes[1].dto.firstName,'Reviewed edit');assert.equal(writes[1].dto.primaryAddress.street,'Remote street');assert.equal(writes[1].dto.primaryAddress.postalCode,'2020');cleanup();
  }
  for(const role of [coreExports.UserRole.TEACHER,coreExports.UserRole.PARENT]){
   writes=[];reads=[];logins=[];failure=true;readBlocked=null;writeBlocked=null;remote=clone(initial);
   const ui=render(h(Session,{role}),{wrapper});fireEvent.click(ui.getByRole('button',{name:i18n.t('myProfile.action.edit')}));
   let outer=within(ui.getByRole('dialog'));fireEvent.change(outer.getByLabelText(i18n.t('myProfile.edit.firstName'),{exact:false}),{target:{value:'My own edit'}});
   fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByRole('button',{name:i18n.t('recordConflict.review')})));assert.equal(writes[0].dto.revision,initial.revision);remote=latest();
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));await waitFor(()=>assert(ui.getByText('Remote name')));assert.equal(ui.getAllByRole('dialog').length,2);
   fireEvent.keyDown(window,{key:'Escape'});await waitFor(()=>assert.equal(ui.getAllByRole('dialog').length,1));assert.equal(document.body.style.overflow,'hidden');assert.equal(ui.container.querySelector('[name="firstName"]').value,'My own edit');
   fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.review')}));await waitFor(()=>assert(ui.getByText('Remote name')));fireEvent.click(ui.getByRole('button',{name:i18n.t('recordConflict.useSaved')}));
   await waitFor(()=>assert.equal(ui.container.querySelector('[name="firstName"]').value,'Remote name'));assert.equal(logins.length,0,'review does not overwrite the session or save');
   failure=false;writeBlocked=deferred();fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,2));
   await act(async()=>changeSession({token:'renewed-token'}));fireEvent.submit(ui.container.querySelector('form'));assert.equal(writes.length,2);
   await act(async()=>writeBlocked.resolve());writeBlocked=null;await waitFor(()=>assert.equal(logins.length,1));
   assert.equal(logins[0].token,'renewed-token');assert.equal(writes[1].dto.revision,latest().revision);assert.equal(writes[1].dto.primaryAddress.postalCode,'2020');assert.equal(writes[1].dto.phoneNumber.countryId,'country-one');cleanup();assert.equal(document.body.style.overflow,'');
   // An unmounted profile cannot restore a logged-out account after a late save response.
   writes=[];logins=[];remote=clone(initial);writeBlocked=deferred();const leaving=render(h(Session,{role}),{wrapper});fireEvent.click(leaving.getByRole('button',{name:i18n.t('myProfile.action.edit')}));fireEvent.submit(leaving.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,1));leaving.unmount();await act(async()=>writeBlocked.resolve());writeBlocked=null;assert.equal(logins.length,0);cleanup();
  }
 }
 // A nested dialog may already be visible at mount; only the top one owns keyboard focus/Escape.
 function Nested(){const [outer,setOuter]=React.useState(true),[inner,setInner]=React.useState(true);return h(coreExports.AppModal,{isVisible:outer,title:'Outer',onClose:()=>setOuter(false),modalContent:h(React.Fragment,null,h('button',null,'Outer action'),h(coreExports.AppModal,{isVisible:inner,title:'Inner',onClose:()=>setInner(false),modalContent:h(React.Fragment,null,h('button',null,'Inner first'),h('button',null,'Inner last'))}))});}
 document.body.style.overflow='scroll';const nested=render(h(Nested),{wrapper});assert.equal(nested.getAllByRole('dialog').length,2);nested.getByRole('button',{name:'Inner last'}).focus();fireEvent.keyDown(window,{key:'Tab'});assert.equal(document.activeElement.textContent,'Inner first');fireEvent.keyDown(window,{key:'Escape'});assert.equal(nested.getAllByRole('dialog').length,1);assert.equal(document.body.style.overflow,'hidden');fireEvent.keyDown(window,{key:'Escape'});assert.equal(nested.queryAllByRole('dialog').length,0);assert.equal(document.body.style.overflow,'scroll');cleanup();document.body.style.overflow='';
 console.log('PASS: actual admin and self-service person editors hydrate versions, retain stale drafts, cancel/retry reviews and explicitly reload before saving in three languages; nested modal focus/Escape/footer/scroll, token renewal and late-session responses are guarded.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
