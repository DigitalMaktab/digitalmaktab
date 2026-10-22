// Real registration editors, shared forms/hooks and API serialization. Database races are tested independently.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=f=>require(core+'/src/'+f).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const client=load('api/client.ts'),school=load('api/school.ts'),parent=load('api/parent.ts');
let writes=[],failure=true,blocked;
client.post=async(url,dto,config)=>{writes.push({url,dto:JSON.parse(JSON.stringify(dto)),key:config?.headers?.['Idempotency-Key']});if(blocked)await blocked.promise;if(failure)throw{response:{status:503,data:{detail:'Registration response unavailable'}}};return{status:200,headers:{},data:{id:'new-account',initialPassword:'Original@123',emailed:false,emailQueued:true}};};
client.get=async()=>({status:200,headers:{},data:[]});
const paths={AppAlert:'components/AppAlert.tsx',AppButton:'components/AppButton.tsx',AppCard:'components/card/AppCard.tsx',AppFormCard:'components/card/AppFormCard.tsx',AppBaseEditor:'components/AppBaseEditor.tsx',AppFormInput:'components/form/AppFormInput.tsx',AppFormSelect:'components/form/AppFormSelect.tsx',AppAddressForm:'components/form/AppAddressForm.tsx',AppFormSectionContainer:'components/form/AppFormSectionContainer.tsx',AppPasswordRevealModal:'components/AppPasswordRevealModal.tsx',AppModal:'components/modal/AppModal.tsx'};
coreExports=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file)]));
const noop=()=>null;
Object.assign(coreExports,{ResponseResult,school,parent,useMutationIntent:load('hooks/useMutationIntent.ts'),useSchoolOperations:load('hooks/useSchoolOperations.ts'),useParentOperations:load('hooks/useParentOperations.ts'),useUser:load('hooks/useUser.ts'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormData:require(core+'/src/hooks/useFormData.ts').useFormData,getValidationSchema:require(core+'/src/helper/helper.ts').getValidationSchema,useSchoolCountryCode:()=>"AT",useModuleEditorTabs:()=>[],getPersonFirstName:person=>person?.firstName,getPersonLastName:person=>person?.lastName,AppTab:({tabs})=>tabs[0].content});
for(const name of ['AppTable','AppFormLocalDatePicker','AppGenderSelects','AppFormOptionSelect','AppBloodGroupSelect','AppDisabilityTypeSelect','AppClassSelect','AppClassAutoSuggest','AppPhotoPicker','AppResetPasswordButton','AppStudentPickerModal','AppStatusBadge'])coreExports[name]=noop;
for(const name of ['Gender','DiscountKind','BloodGroup','DisabilityType','SchoolType'])coreExports[name]=require(core+'/src/models/'+name+'.ts')[name];
const initial={firstName:'Original',lastName:'Person',email:'person@registration.invalid',gender:0,joiningClassId:'room-one',dateOfBirth:'2015-01-01',primaryAddress:{street:'Street',region:'Region',village:'Village'},secondaryAddress:{street:'Street',region:'Region',village:'Village'},phoneNumber:{countryId:'country-one',number:'1234567'},disabilityType:0,bloodGroup:0,monthlyFee:100};
const screens=[['student','StudentEditor'],['teacher','TeacherEditor'],['parent','ParentEditor']].map(([kind,name])=>({kind,Screen:require(shell+'/src/screens/school/'+kind+'/'+name+'.tsx').default}));
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:[{pathname:'/new',search:'?studentId=child-one',state:{initialData:initial}}]},h(LoaderProvider,null,children)));
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);
  for(const {kind,Screen} of screens){
   writes=[];failure=true;blocked=deferred();const ui=render(h(Screen),{wrapper});
   const name=ui.container.querySelector('[name="firstName"]');assert(name,kind);fireEvent.change(name,{target:{value:'Retained edit'}});
   fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,1));
   fireEvent.submit(ui.container.querySelector('form'));await act(async()=>{await Promise.resolve()});assert.equal(writes.length,1,'one pending registration');
   await act(async()=>blocked.resolve());blocked=null;
   await waitFor(()=>assert(ui.getByText('Registration response unavailable')));
   await waitFor(()=>assert(!ui.container.querySelector('button[type="submit"]').disabled));assert.equal(name.value,'Retained edit');
   for(const attempt of [2,3]){failure=attempt!==3;fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,attempt));await waitFor(()=>assert(!ui.container.querySelector('button[type="submit"]').disabled));}
   await waitFor(()=>assert(ui.getByText(i18n.t('passwordReveal.bodyQueued'))));assert(ui.getByText('Original@123'));
   assert.deepEqual(writes[1],writes[0]);assert.deepEqual(writes[2],writes[0]);assert.match(writes[0].key,/^[0-9a-f-]{36}$/);assert.equal(writes[0].dto.clientRequestId,undefined);assert.equal(writes[0].dto.firstName,'Retained edit');
   const oldKey=writes[0].key;cleanup();writes=[];failure=false;
   const second=render(h(Screen),{wrapper});fireEvent.submit(second.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,1));assert.notEqual(writes[0].key,oldKey,'fresh editor means fresh operation');cleanup();
  }
 }

 // A credential refresh cannot turn an uncertain payment/registration retry into a new intent.
 const {UserRole}=require(core+'/src/models/UserRole.ts');const useMutationIntent=load('hooks/useMutationIntent.ts');
 let intent;
 function IntentProbe(){intent=useMutationIntent();return null;}
 const probe=render(h(IntentProbe));
 const setUser=user=>localStorage.setItem('user',JSON.stringify(user));
 setUser({role:UserRole.STAFF,token:'old-token',staff:{id:'actor-one',schoolId:'school-one'}});const first=intent.get();
 setUser({role:UserRole.STAFF,token:'renewed-token',staff:{id:'actor-one',schoolId:'school-one'}});assert.deepEqual(intent.get(),first);
 setUser({role:UserRole.STAFF,token:'renewed-token',staff:{id:'actor-one',schoolId:'school-two'}});const otherSchool=intent.get();assert.notEqual(otherSchool.requestId,first.requestId);
 setUser({role:UserRole.STAFF,token:'renewed-token',staff:{id:'actor-two',schoolId:'school-two'}});assert.notEqual(intent.get().requestId,otherSchool.requestId);
 intent.reset();const reset=intent.get();assert.notEqual(reset.requestId,otherSchool.requestId);
 localStorage.removeItem('user');assert.notEqual(intent.get().requestId,reset.requestId);cleanup();
 console.log('PASS: actual student/teacher/parent registration editors in three locales keep values and original request keys after failures, block double submissions, recover the original password, show queued delivery, and give new editor operations fresh IDs.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
