// Actual Admin Actions screen + Core action/intent/modal/API. Controlled transport.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react');
const {MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=file=>require(core+'/src/'+file).default,client=load('api/client.ts'),school=load('api/school.ts');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx');
const {CalendarProvider,gregorianCalendar}=require(core+'/src/contexts/CalendarContext.tsx');
let account={role:0,token:'first-token',school:{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}},writes=[],mode='fail',block;
const result={markedCount:4,eligibleCount:6,date:'2026-10-24',calendarYearId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'};
const deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
client.post=async(url,dto,config)=>{writes.push({url,dto,config});if(block)await block.promise;if(mode==='fail')throw{response:{status:503}};return{status:200,data:mode==='invalid'?{markedCount:4}:result,headers:{}}};
coreExports={AppAttendanceFillAction:load('components/attendance/AppAttendanceFillAction.tsx'),school,fee:{rollCurrentMonth:async()=>({data:{}})},
 useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,readAllPages:require(core+'/src/helper/readAllPages.ts').readAllPages,
 main:{calendarYearList:async()=>({data:[],headers:{pagination:JSON.stringify({totalPages:1})}})},AppEnumFilterSelect:()=>null};
for(const [name,file] of Object.entries({AppCard:'components/card/AppCard.tsx',AppButton:'components/AppButton.tsx',AppAlert:'components/AppAlert.tsx'}))coreExports[name]=load(file);
const Screen=require(shell+'/src/screens/school/admin/AdminActions.tsx').default;
const {afghanistanCalendar}=require(projects+'/digitalmaktab-spa-country-afghanistan/src/calendarModule.ts');
let activeCalendar=gregorianCalendar;const calendar=()=>activeCalendar;
const wrap=child=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(CalendarProvider,{value:calendar()},h(AuthContext.Provider,{value:{user:account,userRole:0}},child))));
const label=key=>i18n.t('adminActions.attendance.'+key),button=(ui,key)=>ui.getByRole('button',{name:label(key),exact:true});
const setAccount=value=>{account=value;localStorage.setItem('user',JSON.stringify(account));};
(async()=>{const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+lang+'/translation.json'))}]));await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 // The formerly separate school alias cannot bypass or omit the durable ID.
 mode='ok';writes=[];const controller=new AbortController(),key='cccccccc-cccc-cccc-cccc-cccccccccccc';
 await school.autoPresentToday(key,undefined,{signal:controller.signal,token:'pinned-token'});assert.equal(writes[0].url,'/attendance/auto-present-today');assert.equal(writes[0].config.headers['Idempotency-Key'],key);assert.equal(writes[0].config.accountToken,'pinned-token');assert.equal(writes[0].config.signal,controller.signal);
 for(const lang of Object.keys(resources)){activeCalendar=lang==='en-US'?gregorianCalendar:afghanistanCalendar;await act(async()=>i18n.changeLanguage(lang));setAccount({...account,token:'first-token',school:{id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}});writes=[];mode='fail';block=deferred();let ui=render(wrap(h(Screen)));
  fireEvent.click(button(ui,'run'));assert(ui.getByRole('dialog'));assert.equal(writes.length,0,'opening confirmation does not write');fireEvent.click(button(within(ui.getByRole('dialog')),'cancel'));assert.equal(writes.length,0);
  fireEvent.click(button(ui,'run'));const submit=button(within(ui.getByRole('dialog')),'confirm');fireEvent.click(submit);fireEvent.click(submit);await waitFor(()=>assert.equal(writes.length,1));const first=writes[0];assert.match(first.config.headers['Idempotency-Key'],/^[0-9a-f-]{36}$/);
  assert.equal(first.config.accountToken,'first-token');assert.equal(first.config.headers['Cache-Control'],'no-store');assert(first.config.signal);fireEvent.keyDown(window,{key:'Escape'});assert(ui.getByRole('dialog'),'busy confirmation stays open');
  await act(async()=>block.resolve());block=null;await waitFor(()=>assert(ui.getByText(label('failed'))));fireEvent.click(button(within(ui.getByRole('dialog')),'cancel'));
  await act(async()=>i18n.changeLanguage(lang==='en-US'?'fa-AF':'en-US'));
  setAccount({...account,token:'renewed-token'});ui.rerender(wrap(h(Screen)));fireEvent.click(button(ui,'retry'));mode='invalid';fireEvent.click(button(within(ui.getByRole('dialog')),'retry'));await waitFor(()=>assert.equal(writes.length,2));await waitFor(()=>assert(ui.getByText(label('failed'))));
  mode='ok';await waitFor(()=>assert(!button(within(ui.getByRole('dialog')),'retry').disabled));assert(!ui.queryByText(label('confirmBody')),'recovery must not ask to start a newly dated roll-call');fireEvent.click(button(within(ui.getByRole('dialog')),'retry'));await waitFor(()=>assert.equal(writes.length,3));await waitFor(()=>assert(!ui.queryByRole('dialog')));assert(button(ui,'newRun'));const date=calendar().formatDate(new Date(result.date),i18n.language,{timeZone:'UTC'});assert(ui.getByText(i18n.t('adminActions.attendance.ok',{count:new Intl.NumberFormat(i18n.language).format(4),date})));assert.equal(writes[1].config.headers['Idempotency-Key'],first.config.headers['Idempotency-Key']);assert.equal(writes[2].config.headers['Idempotency-Key'],first.config.headers['Idempotency-Key']);assert.equal(writes[2].config.accountToken,'renewed-token');
  fireEvent.click(button(ui,'newRun'));assert.equal(writes.length,3);fireEvent.click(button(within(ui.getByRole('dialog')),'confirm'));await waitFor(()=>assert.equal(writes.length,4));await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.notEqual(writes[3].config.headers['Idempotency-Key'],first.config.headers['Idempotency-Key']);
  // Abandoned writes are canceled and cannot display the previous actor's result.
  fireEvent.click(button(ui,'newRun'));block=deferred();fireEvent.click(button(within(ui.getByRole('dialog')),'confirm'));await waitFor(()=>assert.equal(writes.length,5));const old=writes[4];
  setAccount({...account,token:'other-token',school:{id:'dddddddd-dddd-dddd-dddd-dddddddddddd'}});ui.rerender(wrap(h(Screen)));assert(old.config.signal.aborted);assert(button(ui,'run'));await act(async()=>block.resolve());block=null;assert(!ui.queryByText(label('newRun')));cleanup();
 }
 console.log('PASS: real Admin Actions delegates to Core confirmation, durable school alias, single-flight fill, same-ID recovery after failed/malformed responses, token renewal, explicit fresh runs, scoped cancellation and stale-result suppression in en/fa/ps.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
