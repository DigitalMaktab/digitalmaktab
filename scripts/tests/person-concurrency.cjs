// Exercise the shared form + request hook against conflict/overload responses.
// Real PostgreSQL racing profile writes are covered by StudentWriteTests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');
require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;
Module._load=function(request,parent,isMain){if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const AppForm=require(core+'/src/components/form/AppForm.tsx').default,Input=require(core+'/src/components/form/AppFormInput.tsx').default,Alert=require(core+'/src/components/AppAlert.tsx').default;
const {LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),useApiRequests=require(core+'/src/hooks/useApiRequests.ts').default;
const revision='11111111-1111-1111-1111-111111111111';let writes=[],status=409,detail='';
function Editor(){const {execute}=useApiRequests();const [error,setError]=React.useState(null);return h(React.Fragment,null,error&&h(Alert,{variant:'danger'},error),h(AppForm,{initialValues:React.useMemo(()=>({firstName:'Original',revision}),[]),onSubmit:async values=>{const result=await execute(async()=>{writes.push({...values});throw {response:{status,data:{detail,code:status===409?'record_edit_conflict':'server_busy'}}};});setError(result.errors.join(' '));}},h(Input,{name:'firstName',label:'Name'}),h('button',{type:'submit'},'Save')));}
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';
 const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);writes=[];detail=lang==='en-US'?'Someone updated this record. Your entries have been kept.':lang==='fa-AF'?'این رکورد تغییر کرده است. اطلاعات شما حفظ شده است.':'دا ریکارډ بدل شوی دی. ستاسو معلومات ساتل شوي دي.';
  const ui=render(h(I18nextProvider,{i18n},h(LoaderProvider,null,h(Editor))));
  const input=ui.getByLabelText('Name',{exact:false});fireEvent.change(input,{target:{value:'My unsaved edit'}});
  for(const nextStatus of [409,428,503]){status=nextStatus;const before=writes.length;fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,before+1));await waitFor(()=>assert(ui.getByText(detail)));assert.equal(input.value,'My unsaved edit');assert.equal(writes.at(-1).revision,revision);}
  cleanup();
 }
 console.log('PASS: Core forms retain entered values and original versions after conflicts, missing preconditions and overload in all three languages; no automatic mutation retries.');
})().catch(error=>{console.error(error);process.exitCode=1});
