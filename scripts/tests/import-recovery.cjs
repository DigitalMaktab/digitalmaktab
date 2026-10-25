// Actual shared modal and API upload serialization; PostgreSQL verifies server replay independently.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage','File','Blob','FormData'])global[key]=dom.window[key];
global.crypto=require('node:crypto').webcrypto;global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;Module._load=function(request,parent,isMain){if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments);};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react');
const {MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),Modal=require(core+'/src/components/import/BulkImportModal.tsx').default;
const client=require(core+'/src/api/client.ts').default,school=require(core+'/src/api/school.ts').default,parent=require(core+'/src/api/parent.ts').default;
const {UserRole}=require(core+'/src/models/UserRole.ts');const {importRequestId,ImportIntentStorageError}=require(core+'/src/components/import/importIntent.ts');
const owner={role:UserRole.ADMIN,token:'first-token',school:{id:'school-one'}},setUser=user=>localStorage.setItem('user',JSON.stringify(user));
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
const response={totalRows:1,createdCount:1,skippedCount:0,errors:[],generatedPasswords:[{email:'person@import.invalid',firstName:'First',lastName:'Last',password:'Imported@1234'}]};
let writes=[],block=null,fail=true,notifications=0;
client.post=async(url,form,config)=>{writes.push({url,file:form.get('file'),key:config.headers['Idempotency-Key'],token:config.accountToken,signal:config.signal});if(block)await block.promise;if(fail)throw{response:{status:503,data:{detail:'Original import response unavailable'}}};return{status:200,data:response};};
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,children)));
(async()=>{
 const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+lang+'/translation.json'))}]));
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);
  for(const [kind,upload] of [['student',school.importStudents],['teacher',school.importTeachers],['parent',parent.importParents]]){
   localStorage.clear();setUser(owner);writes=[];block=deferred();fail=true;notifications=0;
   const file=new File(['file bytes'],'people.xlsx',{lastModified:100,type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
   const props={isVisible:true,onClose:()=>{},translationPrefix:kind+'.import',downloadTemplate:async()=>({data:new Blob()}),importFile:upload,templateFileName:'template.xlsx',passwordsFileName:'passwords.csv',onImported:()=>notifications++};
   let ui=render(h(Modal,props),{wrapper});fireEvent.change(ui.container.querySelector('input[type="file"]'),{target:{files:[file]}});
   const click=()=>fireEvent.click(ui.getByRole('button',{name:i18n.t(kind+'.import.uploadButton'),exact:true}));
   click();fireEvent.click(ui.getByRole('button',{name:i18n.t(kind+'.import.uploading'),exact:true}));await waitFor(()=>assert.equal(writes.length,1));
   await act(async()=>block.resolve());block=null;await waitFor(()=>ui.getByText('Original import response unavailable'));
   assert.equal(writes[0].token,'first-token');assert.match(writes[0].key,/^[a-f0-9-]{36}$/);assert.equal(writes[0].file,file);
   setUser({...owner,token:'renewed-token'});click();await waitFor(()=>assert.equal(writes.length,2));await waitFor(()=>ui.getByText('Original import response unavailable'));
   assert.equal(writes[1].key,writes[0].key);assert.equal(writes[1].token,'renewed-token');
   fireEvent.click(ui.container.querySelector('.btn-close'));ui.rerender(h(Modal,{...props,isVisible:false}));ui.rerender(h(Modal,props));click();
   await waitFor(()=>assert.equal(writes.length,3));await waitFor(()=>ui.getByText('Original import response unavailable'));assert.equal(writes[2].key,writes[0].key);
   // Re-selecting the same immutable file after a remount recovers its retained ID.
   cleanup();ui=render(h(Modal,props),{wrapper});fireEvent.change(ui.container.querySelector('input[type="file"]'),{target:{files:[file]}});fail=false;click();
   await waitFor(()=>assert.equal(notifications,1));assert.equal(writes[3].key,writes[0].key);
   for(const key of Object.keys(localStorage).filter(key=>key.startsWith('digitalmaktab.import.intent.'))){const saved=localStorage.getItem(key);assert(!saved.includes('token'));assert(!saved.includes('Imported@1234'));assert(!saved.includes('file bytes'));}
   // A pending old account must not receive visible credentials after a switch.
   block=deferred();click();await waitFor(()=>assert.equal(writes.length,5));setUser({role:UserRole.ADMIN,token:'other-token',school:{id:'school-two'}});ui.rerender(h(Modal,props));
   await act(async()=>block.resolve());block=null;assert.equal(notifications,1);assert(writes[4].signal.aborted);assert(!ui.queryByText(i18n.t(kind+'.import.passwordsTitle',{count:1})));
   cleanup();
  }
 }
 let called=0;const bad={getItem:()=>null,setItem:()=>{throw Error('storage full')}};
 assert.throws(()=>importRequestId(bad,'[0,"school","actor"]','students',{name:'x',size:1,lastModified:1,type:''},()=>{called++;return '11111111-1111-4111-8111-111111111111';}),ImportIntentStorageError);assert.equal(called,1);
 const corrupted={getItem:()=>'{bad',setItem:()=>assert.fail('must not replace a corrupt accepted intent')};
 assert.throws(()=>importRequestId(corrupted,'[0,"school","actor"]','students',{name:'x',size:1,lastModified:1,type:''},()=>assert.fail('must not invent another request')),ImportIntentStorageError);
 assert.throws(()=>importRequestId(bad,'bearer-token','students',{name:'x',size:1,lastModified:1,type:''},()=>assert.fail('must not persist fallback token scope')),ImportIntentStorageError);
 console.log('PASS: actual person import modal/APIs retain request IDs and files across failures, close/reopen and remount; pin renewed credentials, block duplicate clicks, suppress stale account results, and keep secrets out of recovery storage in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
