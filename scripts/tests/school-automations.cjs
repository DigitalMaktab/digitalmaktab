const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let calls=[],writes=[],hold=null,fail=false;
const empty='00000000-0000-0000-0000-000000000000';
let row={id:'PTM_UPCOMING',titleKey:'automations.rules.PTM_UPCOMING.title',descriptionKey:'automations.rules.PTM_UPCOMING.description',enabled:false,leadMinutes:1440,timeZoneOverride:'',effectiveTimeZone:'Asia/Kabul',version:empty,lastCheckedAt:null,lastCreatedCount:0,lastErrorCode:'',creationDate:null};
const transport={get:async(url,config)=>{calls.push({url,config});return {data:[{...row}]};},post:async(url,dto,config)=>{writes.push({url,dto,config});if(hold)await hold.promise;if(fail)throw {response:{data:{detail:'Preview could not be prepared'}}};return {data:{timeZoneId:"Asia/Kabul",eligibleRecipients:3,alreadyDelivered:1,newRecipients:2,items:[{sourceId:'meeting-a',subject:'',occursAt:'2026-10-20T08:00:00Z',recipients:2}]}};},put:async(url,dto,config)=>{writes.push({url,dto,config});if(hold)await hold.promise;if(fail)throw {response:{status:409,data:{detail:'Refresh these settings'}}};row={...row,...dto,version:'new-version'};return {data:{...row}};}};
const original=Module._load;Module._load=function(request,parent,isMain){if(request==='../api/client'&&parent.filename.includes('/automation/'))return {__esModule:true,default:transport};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance(),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx');
const Screen=require(core+'/src/automation/AppSchoolAutomations.tsx').default;
(async()=>{
 const resources={};for(const locale of ['en-US','fa-AF','ps-AF'])resources[locale]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+locale+'/translation.json'))}};await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const locale of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(locale);calls=[];writes=[];row={...row,enabled:false,version:empty,timeZoneOverride:''};hold=null;fail=false;
  const ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:['/automations']},h(AuthContext.Provider,{value:{userRole:0,user:{role:0}}},h(Screen)))));
  await waitFor(()=>assert(ui.getByRole('button',{name:i18n.t('automations.configure'),exact:true})));
  assert.equal(calls.length,1);assert(calls[0].config.signal);assert.equal(writes.length,0);
  fireEvent.click(ui.getByRole('button',{name:i18n.t('automations.configure'),exact:true}));let dialog=ui.getByRole('dialog');
  const field=name=>dialog.querySelector('[name='+name+']');const button=key=>within(dialog).getByRole('button',{name:i18n.t('automations.'+key),exact:true});
  assert.equal(field('timeZoneOverride').value,'');fireEvent.change(field('leadMinutes'),{target:{value:'14'}});fireEvent.click(button('preview'));await waitFor(()=>assert(within(dialog).getByText(i18n.t('automations.invalidDraft'))));assert.equal(writes.length,0);
  fireEvent.change(field('leadMinutes'),{target:{value:'60'}});fireEvent.change(field('timeZoneOverride'),{target:{value:'Asia/Kabul'}});fireEvent.change(field('enabled'),{target:{value:'true'}});
  fireEvent.click(button('preview'));await waitFor(()=>assert(within(dialog).getByText(i18n.t('automations.privateMeeting'))));assert.equal(writes.length,1);assert.equal(writes[0].dto.leadMinutes,60);assert.equal(writes[0].dto.enabled,true);assert.equal(writes[0].dto.timeZoneOverride,'Asia/Kabul');assert.equal(row.enabled,false,'Preview must not save');
  const beforeLanguage=calls.length;await act(async()=>i18n.changeLanguage(locale==='en-US'?'fa-AF':'en-US'));assert.equal(field('leadMinutes').value,'60');assert.equal(calls.length,beforeLanguage);await act(async()=>i18n.changeLanguage(locale));
  fireEvent.change(field('leadMinutes'),{target:{value:'120'}});assert.equal(within(dialog).queryByText(i18n.t('automations.privateMeeting')),null,'Hide stale preview after draft changes');
  hold={};hold.promise=new Promise(resolve=>hold.resolve=resolve);fireEvent.click(button('save'));fireEvent.click(button('save'));await waitFor(()=>assert.equal(writes.length,2));assert.equal(writes[1].dto.version,empty);fireEvent.keyDown(window,{key:'Escape'});assert(ui.getByRole('dialog'),'Busy modal cannot close');
  await act(async()=>{hold.resolve();});await waitFor(()=>assert.equal(ui.queryByRole('dialog'),null));assert(ui.getByText(i18n.t('automations.saved')));assert.equal(row.leadMinutes,120);assert.equal(row.enabled,true);
  hold=null;fireEvent.click(ui.getByRole('button',{name:i18n.t('automations.configure'),exact:true}));dialog=ui.getByRole('dialog');fail=true;fireEvent.click(button('save'));await waitFor(()=>assert(within(dialog).getByText('Refresh these settings')));assert(ui.getByRole('dialog'));
  cleanup();
 }
 await i18n.changeLanguage('en-US');calls=[];writes=[];fail=false;hold=null;
 row={...row,id:'ATTENDANCE_INCOMPLETE',titleKey:'automations.rules.ATTENDANCE_INCOMPLETE.title',descriptionKey:'automations.rules.ATTENDANCE_INCOMPLETE.description',windowKind:'OVERDUE',usesDailyDeadline:true,dailyDeadlineMinute:1080};
 const daily=render(h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:['/automations']},h(AuthContext.Provider,{value:{userRole:0,user:{role:0}}},h(Screen)))));
 await waitFor(()=>assert(daily.getByRole('button',{name:i18n.t('automations.configure'),exact:true})));fireEvent.click(daily.getByRole('button',{name:i18n.t('automations.configure'),exact:true}));
 const dialog=daily.getByRole('dialog'),time=dialog.querySelector('input[name=dailyDeadlineTime]');assert(time);assert.equal(time.value,'18:00');assert(within(dialog).getByLabelText(i18n.t('automations.lookback'),{exact:false}));
 fireEvent.change(time,{target:{value:'00:00'}});fireEvent.click(within(dialog).getByRole('button',{name:i18n.t('automations.save'),exact:true}));await waitFor(()=>assert.equal(writes.length,1));assert.equal(writes[0].dto.dailyDeadlineMinute,0);assert.equal('dailyDeadlineTime' in writes[0].dto,false);
 cleanup();
 console.log('PASS: opt-in settings, no-send preview, draft validation, timezone and version payloads, stale preview invalidation, single-flight save, busy modal, errors and three languages.');
})().catch(error=>{console.error(error);process.exitCode=1;});
