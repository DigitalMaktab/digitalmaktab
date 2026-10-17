// Render the real assignment screen, AppTable and modal controls. The repository is in memory;
// backend database persistence is covered separately by the PostgreSQL suite.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage','File'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;let exportsForScreen;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return exportsForScreen;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const get=p=>require(core+'/src/'+p).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const paths={AppAlert:'components/AppAlert.tsx',AppButton:'components/AppButton.tsx',AppCard:'components/card/AppCard.tsx',AppForm:'components/form/AppForm.tsx',AppFormInput:'components/form/AppFormInput.tsx',AppModal:'components/modal/AppModal.tsx',AppEnumFilterSelect:'components/select/AppEnumFilterSelect.tsx',AppImg:'components/AppImg.tsx',AppButtonLink:'components/AppButtonLink.tsx'};
let writes=[],failure=false,currentUser,logins=[];
exportsForScreen=Object.fromEntries(Object.entries(paths).map(([name,p])=>[name,get(p)]));
const mutate=async dto=>{writes.push(dto);return failure?{status:ResponseResult.ERROR,errors:['Profile refused']}:{status:200,data:{...dto,genderValue:'Female'}}};
Object.assign(exportsForScreen,{AuthContext,UserRole,ResponseResult,Gender:require(core+'/src/models/Gender.ts').Gender,getAssetUrl:()=>'',AppCountryPersonFields:()=>null,getPersonFirstName:person=>person?.firstName,getPersonLastName:person=>person?.lastName,useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useUser:require(core+'/src/hooks/useUser.ts').default,useTeacherOperations:()=>({updateProfile:mutate}),useParentOperations:()=>({updateProfile:mutate})});
const Screen=require(shell+'/src/screens/account/MyProfile.tsx').default;
function Session({initial}){const [user,setUser]=React.useState(initial);currentUser=user;return h(AuthContext.Provider,{value:{user,userRole:user.role,isAuthenticated:true,login:next=>{logins.push(next);setUser(next)},logout:()=>{}}},h(Screen))}
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,children)));
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 const t=i18n.t.bind(i18n);
 for(const role of [UserRole.TEACHER,UserRole.PARENT]){
  writes=[];logins=[];failure=true;
  const key=role===UserRole.TEACHER?'teacher':'parent';const initial={role,token:'session-token',[key]:{id:'person-one',schoolId:'school-one',firstName:'Original',lastName:'Person',gender:0,genderValue:'Male',primaryAddress:{street:'Street',region:'Region',village:'Village',postalCode:'1010',districtId:'district-one',addressType:1},phoneNumber:{countryId:'country-one',number:'1234567'},countryDetails:{nativeName:'Country name'},moduleDetails:{country:{registered:true}}}};
  const ui=render(h(Session,{initial}),{wrapper});fireEvent.click(ui.getByRole('button',{name:t('myProfile.action.edit')}));const dialog=within(ui.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(t('myProfile.edit.firstName'),{exact:false}),{target:{value:'Edited'}});fireEvent.change(dialog.getByLabelText(t('myProfile.edit.street')),{target:{value:'New street'}});fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(dialog.getByText('Profile refused')));assert.equal(logins.length,0);assert.equal(dialog.getByLabelText(t('myProfile.edit.firstName'),{exact:false}).value,'Edited');
  assert.equal(writes[0].primaryAddress.postalCode,'1010');assert.equal(writes[0].primaryAddress.districtId,'district-one');assert.equal(writes[0].primaryAddress.addressType,1);
  failure=false;fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(logins.length,1));assert.equal(currentUser[key].firstName,'Edited');assert.equal(currentUser[key].primaryAddress.street,'New street');assert.equal(currentUser[key].primaryAddress.postalCode,'1010');assert.equal(currentUser.token,'session-token');assert.equal(currentUser[key].countryDetails.nativeName,'Country name');assert(ui.getByRole('heading',{name:'Edited Person'}));cleanup();
 }
 console.log('PASS: real teacher/parent profile forms preserve address fields omitted from the editor, retain rejected drafts and immediately update the shared session/display after save.');
})().catch(error=>{console.error(error);process.exitCode=1});
