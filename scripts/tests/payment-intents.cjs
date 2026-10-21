// Real fee screens + shared forms/intent hook/API serialization. Table transport is a small test harness;
// independently hosted API + PostgreSQL ledger races are covered by PaymentConcurrencyTests.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let apiExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return apiExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=f=>require(core+'/src/'+f).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const fee=load('api/fee.ts'),client=load('api/client.ts'),useMutationIntent=load('hooks/useMutationIntent.ts');
const row={id:'student-one',studentId:'student-one',studentName:'Test Student',feeId:'fee-one',amount:100,paidAmount:0};
const waiver={id:'waiver-one',feeId:row.feeId,waiverStatus:0,reasonText:'Test hardship',fee:{...row,month:0,calendarYear:{year:'2026-01-01'}}};
let writes=[],failure=true;const error='Another payment changed the balance; your entries remain.';
client.post=async(url,dto,config)=>{writes.push({url,dto:JSON.parse(JSON.stringify(dto)),key:config?.headers?.['Idempotency-Key']});if(failure)throw{response:{status:409,data:{detail:error}}};return{status:200,data:url.includes('bulk-pay')?{paymentIds:['payment-one'],allocated:100}:{id:'payment-one'}};};
client.delete=async(url,config)=>{writes.push({url,key:config?.headers?.['Idempotency-Key']});return{status:204}};
client.get=async(url)=>({status:200,data:url.includes('/waivers')?[waiver]:url.includes('/payments')?[]:[{id:'fee-one',amount:100,paidAmount:0,month:0}]});
const normalize=async call=>{try{return await call()}catch{return{status:ResponseResult.ERROR,errors:[error]}}};
const mainOperations={data:{id:"year-one"},fetchActiveCalendarYear:async()=>{}};
const operations={data:[row],totalPages:1,roster:async()=>({status:200,data:[row]}),generate:async()=>({status:200}),recordPayment:dto=>normalize(()=>fee.recordPayment(dto))};
const Table=props=>h('div',null,(props.data??[]).flatMap((item,index)=>(props.rowContextActions??[]).filter(action=>!action.hidden?.(item)).map((action,j)=>h('button',{key:`r${index}-${j}`,onClick:()=>action.onClick(item)},'row:'+action.label))),(props.actions??[]).map((action,index)=>h('button',{key:'a'+index,onClick:action.onClick},'tool:'+action.label)));
const paths={AppAlert:'components/AppAlert.tsx',AppButton:'components/AppButton.tsx',AppCard:'components/card/AppCard.tsx',AppForm:'components/form/AppForm.tsx',AppFormInput:'components/form/AppFormInput.tsx',AppModal:'components/modal/AppModal.tsx',AppPaymentMethodSelect:'components/select/AppPaymentMethodSelect.tsx',AppStatusBadge:'components/AppStatusBadge.tsx',AppCheckbox:'components/AppCheckbox.tsx',AppFormOptionSelect:'components/form/AppFormOptionSelect.tsx'};
apiExports=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file)]));
const noop=()=>null;
Object.assign(apiExports,{ResponseResult,fee,school:{},useMutationIntent,useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFees:()=>operations,useMainOperations:()=>mainOperations,useCalendar:()=>({months:[{ordinal:0,key:'January'}]}),useFormattedDate:()=>value=>String(value??''),getPersonFirstName:person=>person?.firstName,getPersonLastName:person=>person?.lastName,AppPaymentMethodSelect: props=>h("select",{value:props.value,onChange:event=>props.onChange(event.target.value)},h("option",{value:"0"},"Cash")),AppTable:Table,AppClassSelect:noop,AppEnumFilterSelect:noop,AppCalendarDate:noop,AppStudentSelect:props=>h('select',{'aria-label':'Student picker',value:props.value,onChange:event=>props.onChange(event.target.value)},h('option',{value:''},'Choose'),h('option',{value:'student-one'},'Student')),PaymentMethod:require(core+'/src/models/PaymentMethod.ts').PaymentMethod,WaiverStatus:require(core+'/src/models/WaiverStatus.ts').WaiverStatus});
const Admin=require(shell+'/src/screens/school/fees/AdminFees.tsx').default,Waivers=require(shell+'/src/screens/school/fees/FeeWaivers.tsx').default;
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,children)));
(async()=>{
 const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await i18n.changeLanguage(lang);writes=[];failure=true;
  const ui=render(h(Admin),{wrapper});await waitFor(()=>ui.getByRole('button',{name:'row:'+i18n.t('adminFees.recordPayment.label')}));
  fireEvent.click(ui.getByRole('button',{name:'row:'+i18n.t('adminFees.recordPayment.label')}));let dialog=within(ui.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText(i18n.t('adminFees.recordPayment.amount'),{exact:false}),{target:{value:'40'}});fireEvent.change(dialog.getByLabelText(i18n.t('adminFees.recordPayment.reference')),{target:{value:'Cash reference'}});
  await act(async()=>{fireEvent.submit(ui.container.querySelector('form'));});await waitFor(()=>dialog.getByText(error));assert.equal(writes.length,1);
  await act(async()=>{fireEvent.submit(ui.container.querySelector('form'));});await waitFor(()=>assert.equal(writes.length,2));assert.deepEqual(writes[1],writes[0]);assert.match(writes[0].key,/^[0-9a-f-]{36}$/);assert.equal(writes[0].dto.clientRequestId,undefined);
  assert.equal(dialog.getByLabelText(i18n.t('adminFees.recordPayment.reference')).value,'Cash reference');
  failure=false;await act(async()=>{fireEvent.submit(ui.container.querySelector('form'));});await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.deepEqual(writes[2],writes[0]);
  fireEvent.click(ui.getByRole('button',{name:'row:'+i18n.t('adminFees.recordPayment.label')}));await act(async()=>{fireEvent.submit(ui.container.querySelector('form'));});await waitFor(()=>assert.equal(writes.length,4));assert.notEqual(writes[3].key,writes[0].key);cleanup();
  writes=[];failure=true;const review=render(h(Waivers),{wrapper});await waitFor(()=>review.getByRole('button',{name:'row:'+i18n.t('feeWaivers.approve.action')}));
  fireEvent.click(review.getByRole('button',{name:'row:'+i18n.t('feeWaivers.approve.action')}));await act(async()=>{fireEvent.submit(review.container.querySelector('form'));});await waitFor(()=>review.getByText(error));await act(async()=>{fireEvent.submit(review.container.querySelector('form'));});await waitFor(()=>assert.equal(writes.length,2));assert.deepEqual(writes[1],writes[0]);cleanup();
 }
 console.log('PASS: actual fee payment/waiver forms preserve values and reuse request IDs/timestamps after conflicts in all locales; new operations get fresh IDs and IDs travel only in headers.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
