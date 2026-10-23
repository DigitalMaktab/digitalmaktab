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
const client=load('api/client.ts'),inventory=load('api/inventory.ts');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts');
const clone=v=>JSON.parse(JSON.stringify(v)),deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return{promise,resolve}};
const r1='11111111-1111-1111-1111-111111111111',r2='22222222-2222-2222-2222-222222222222',r3='33333333-3333-3333-3333-333333333333';
let item,remote,writes=[],reads=[],failWrite=true,putConflict=true,deleteConflict=true,writeBlock,readBlock,listBlock,account,setAccount;
const error='Retry this inventory operation';
client.get=async(url,config)=>{
 reads.push({url,signal:config?.signal,cache:config?.headers?.['Cache-Control']});
 if(url==='/inventory/item-one'){if(readBlock)await readBlock.promise;return{status:200,data:clone(remote)}}
 const snapshot=url.endsWith('/transactions')?[]:item?[clone(item)]:[];
 if(url==='/inventory'&&listBlock)await listBlock.promise;
 return{status:200,data:snapshot};
};
client.post=async(url,dto,config)=>{
 writes.push({method:'POST',url,dto:clone(dto),key:config?.headers?.['Idempotency-Key']});if(writeBlock)await writeBlock.promise;
 if(failWrite)throw{response:{status:503,data:{detail:error}}};return{status:200,data:url.endsWith('/transactions')?{id:'movement-one'}:clone(item)};
};
client.put=async(url,dto)=>{writes.push({method:'PUT',url,dto:clone(dto)});if(putConflict)throw{response:{status:409,data:{detail:error,code:'record_edit_conflict'}}};item={...remote,...dto,revision:r3};return{status:200,data:clone(item)}};
client.delete=async(url,config)=>{writes.push({method:'DELETE',url,revision:config?.params?.revision});if(writeBlock)await writeBlock.promise;if(deleteConflict)throw{response:{status:409,data:{detail:error,code:'record_edit_conflict'}}};item=null;return{status:200}};
const paths={AppForm:'components/form/AppForm.tsx',AppAlert:'components/AppAlert.tsx',AppButton:'components/AppButton.tsx',AppCard:'components/card/AppCard.tsx',AppFormInput:'components/form/AppFormInput.tsx',AppModal:'components/modal/AppModal.tsx',AppRecordConflictReview:'components/form/AppRecordConflictReview.tsx',AppFormSubmitButton:'components/form/AppFormSubmitButton.tsx',AppStatusBadge:'components/AppStatusBadge.tsx',AppCheckbox:'components/AppCheckbox.tsx'};
coreExports=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file)]));
const Table=props=>h('div',null,(props.data??[]).map(row=>h('span',{key:'stock'+row.id,'data-testid':'stock-'+row.id},String(row.quantity??''))),(props.data??[]).flatMap((row,i)=>(props.rowContextActions??[]).map((action,j)=>h('button',{key:i+':'+j,onClick:()=>action.onClick(row)},'row:'+action.label))),(props.actions??[]).map((action,i)=>h('button',{key:'tool'+i,onClick:action.onClick},'tool:'+action.label)));
Object.assign(coreExports,{ResponseResult,inventory,AppTable:Table,useMutationIntent:load('hooks/useMutationIntent.ts'),useReloadableRead:load('hooks/useReloadableRead.ts'),useUser:load('hooks/useUser.ts'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormattedDate:load('hooks/useFormattedDate.ts'),isRecordEditConflict:require(core+'/src/helper/recordConflict.ts').isRecordEditConflict,getMutationAccountScope:require(core+'/src/helper/auth/accountIdentity.ts').getMutationAccountScope});
const Screen=require(shell+'/src/screens/school/inventory/InventoryList.tsx').default;
function Bound({children}){
 const [user,set]=React.useState(account);setAccount=next=>{account=next;localStorage.setItem('user',JSON.stringify(next));set(next)};
 return h(AuthContext.Provider,{value:{user,userRole:user.role,isAuthenticated:true,login:setAccount,logout:()=>{}}},children);
}
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,h(Bound,null,children))));
const translate=key=>i18n.t(key),button=(ui,key,prefix='')=>ui.getByRole('button',{name:prefix+translate(key),exact:true});
async function submit(ui){await act(async()=>{fireEvent.submit(ui.container.querySelector('form'))})}
async function field(ui,key,value){fireEvent.change(ui.getByLabelText(translate(key),{exact:false}),{target:{value}})}
function reset(){item={id:'item-one',revision:r1,name:'Paper',category:'Stationery',unit:'box',quantity:10,minThreshold:2,status:true,schoolId:'school-one'};remote={...clone(item),name:'Saved paper',minThreshold:9,revision:r2};writes=[];reads=[];failWrite=true;putConflict=true;deleteConflict=true;writeBlock=undefined;readBlock=undefined;listBlock=undefined;account={role:UserRole.ADMIN,token:'token-one',school:{id:'school-one'}};localStorage.setItem('user',JSON.stringify(account));}
(async()=>{
 const countries=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':countries+'/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);reset();const ui=render(h(Screen),{wrapper});await waitFor(()=>button(ui,'inventory.create.label','tool:'));
  fireEvent.click(button(ui,'inventory.create.label','tool:'));await field(ui,'inventory.create.fields.name','New paper');await field(ui,'inventory.create.fields.unit','box');await field(ui,'inventory.create.fields.initialQuantity','4.5');assert.equal(ui.getByLabelText(translate('inventory.create.fields.initialQuantity'),{exact:false}).validity.stepMismatch,false);
  writeBlock=deferred();await submit(ui);await waitFor(()=>assert.equal(writes.length,1));assert.equal(button(ui,'controls.saveButton.saving').disabled,true);assert.equal(ui.getByRole('dialog').getAttribute('aria-busy'),'true');
  fireEvent.keyDown(window,{key:'Escape'});fireEvent.click(ui.getByRole('dialog'));assert(ui.getByRole('dialog'));await submit(ui);assert.equal(writes.length,1);
  const gate=writeBlock;writeBlock=undefined;await act(async()=>gate.resolve());await waitFor(()=>ui.getByText(error));const first=clone(writes[0]);
  assert.equal(ui.getByLabelText(translate('inventory.create.fields.name'),{exact:false}).value,'New paper');await submit(ui);await waitFor(()=>assert.equal(writes.length,2));assert.deepEqual(writes[1],first);assert.match(first.key,/^[0-9a-f-]{36}$/);
  failWrite=false;await submit(ui);await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.deepEqual(writes[2],first);
  fireEvent.click(button(ui,'inventory.tx.action','row:'));await field(ui,'inventory.tx.fields.delta','-2');await field(ui,'inventory.tx.fields.note','Classroom supplies');failWrite=true;await submit(ui);await waitFor(()=>ui.getByText(error));const move=clone(writes.at(-1));
  await act(async()=>setAccount({...account,token:'renewed-token'}));assert(ui.getByRole('dialog'));await submit(ui);await waitFor(()=>assert.deepEqual(writes.at(-1),move));assert.equal(ui.getByLabelText(translate('inventory.tx.fields.note'),{exact:false}).value,'Classroom supplies');
  failWrite=false;await submit(ui);await waitFor(()=>assert(!ui.queryByRole('dialog')));fireEvent.click(button(ui,'inventory.tx.action','row:'));await field(ui,'inventory.tx.fields.delta','0.5');assert.equal(ui.getByLabelText(translate('inventory.tx.fields.delta'),{exact:false}).validity.stepMismatch,false);await submit(ui);await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.notEqual(writes.at(-1).key,move.key);
  fireEvent.click(button(ui,'inventory.edit.action','row:'));await field(ui,'inventory.create.fields.name','My draft');await submit(ui);await waitFor(()=>ui.getByText(translate('recordConflict.kept')));assert.equal(writes.at(-1).dto.revision,r1);assert.equal(reads.filter(r=>r.url==='/inventory/item-one').length,0);
  readBlock=deferred();fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>assert.equal(reads.filter(r=>r.url==='/inventory/item-one').length,1));const pending=reads.at(-1);fireEvent.keyDown(window,{key:'Escape'});assert(pending.signal.aborted);const readGate=readBlock;readBlock=undefined;await act(async()=>readGate.resolve());assert.equal(ui.getByLabelText(translate('inventory.create.fields.name'),{exact:false}).value,'My draft');
  fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>button(ui,'recordConflict.useSaved').disabled===false);fireEvent.click(button(ui,'recordConflict.keep'));assert.equal(ui.getByLabelText(translate('inventory.create.fields.name'),{exact:false}).value,'My draft');
  fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>assert.equal(button(ui,'recordConflict.useSaved').disabled,false));const before=writes.length;fireEvent.click(button(ui,'recordConflict.useSaved'));await waitFor(()=>assert.equal(ui.getByLabelText(translate('inventory.create.fields.name'),{exact:false}).value,'Saved paper'));assert.equal(writes.length,before);
  putConflict=false;await submit(ui);await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.equal(writes.at(-1).dto.revision,r2);assert.equal(writes.at(-1).dto.minThreshold,9);assert.equal(writes.at(-1).dto.quantity,undefined);
  const beforeArchive=writes.length;fireEvent.click(button(ui,'inventory.delete.action','row:'));assert.equal(writes.length,beforeArchive);writeBlock=deferred();fireEvent.click(button(ui,'inventory.delete.confirm'));await waitFor(()=>assert.equal(writes.length,beforeArchive+1));assert(button(ui,'inventory.delete.confirm').disabled);fireEvent.keyDown(window,{key:'Tab'});assert.equal(document.activeElement,ui.getByRole('dialog'));fireEvent.keyDown(window,{key:'Escape'});assert(ui.getByRole('dialog'));const archiveGate=writeBlock;writeBlock=undefined;await act(async()=>archiveGate.resolve());await waitFor(()=>ui.getByText(translate('inventory.delete.changed')));assert.equal(writes.at(-1).revision,r3);assert(button(ui,'inventory.delete.confirm').disabled);
  item.revision=r2;fireEvent.click(button(ui,'inventory.refresh'));await waitFor(()=>assert(!ui.queryByRole('dialog')));await waitFor(()=>button(ui,'inventory.delete.action','row:'));fireEvent.click(button(ui,'inventory.delete.action','row:'));deleteConflict=false;fireEvent.click(button(ui,'inventory.delete.confirm'));await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.equal(writes.at(-1).revision,r2);
  assert(reads.filter(r=>r.url==='/inventory/item-one').every(r=>r.cache==='no-store'&&r.signal));cleanup();
 }
 // Token renewal starts a read before the pending write finishes. Invalidate
 // that snapshot, using the newest scope even through the old callback.
 await i18n.changeLanguage('en-US');reset();const raced=render(h(Screen),{wrapper});await waitFor(()=>button(raced,'inventory.tx.action','row:'));
 fireEvent.click(button(raced,'inventory.tx.action','row:'));await field(raced,'inventory.tx.fields.delta','1');writeBlock=deferred();await submit(raced);await waitFor(()=>assert.equal(writes.length,1));
 listBlock=deferred();await act(async()=>setAccount({...account,token:'renewed-during-write'}));await waitFor(()=>assert.equal(reads.filter(r=>r.url==='/inventory').length,2));
 const superseded=reads.at(-1),oldRead=listBlock;listBlock=undefined;item={...item,quantity:11};failWrite=false;const accepted=writeBlock;writeBlock=undefined;
 await act(async()=>accepted.resolve());await waitFor(()=>assert.equal(raced.getByTestId('stock-item-one').textContent,'11'));assert(superseded.signal.aborted);assert.equal(reads.filter(r=>r.url==='/inventory').length,3);
 await act(async()=>oldRead.resolve());assert.equal(raced.getByTestId('stock-item-one').textContent,'11');cleanup();
 // An old operation must not close or refetch a new account's editor.
 await i18n.changeLanguage('en-US');reset();const ui=render(h(Screen),{wrapper});await waitFor(()=>button(ui,'inventory.create.label','tool:'));fireEvent.click(button(ui,'inventory.create.label','tool:'));await field(ui,'inventory.create.fields.name','Old account draft');await field(ui,'inventory.create.fields.unit','box');writeBlock=deferred();await submit(ui);await waitFor(()=>assert.equal(writes.length,1));const oldGate=writeBlock;writeBlock=undefined;
 await act(async()=>setAccount({role:UserRole.ADMIN,token:'other-token',school:{id:'other-school'}}));await waitFor(()=>assert(!ui.queryByRole('dialog')));fireEvent.click(button(ui,'inventory.create.label','tool:'));await field(ui,'inventory.create.fields.name','New account draft');await field(ui,'inventory.create.fields.unit','box');const readCount=reads.length;failWrite=false;await act(async()=>oldGate.resolve());assert.equal(reads.length,readCount);assert.equal(ui.getByLabelText(translate('inventory.create.fields.name'),{exact:false}).value,'New account draft');cleanup();
 console.log('PASS: actual inventory forms use stable retry IDs, pending dismissal/duplicate guards, retained versioned drafts and explicit Core conflict reload, guarded archive confirmation, write/read invalidation races and account/token scopes in en/fa/ps.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
