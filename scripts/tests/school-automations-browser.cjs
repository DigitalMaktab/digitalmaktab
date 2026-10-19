// Real Chrome regression for automation controls, previews and modal accessibility.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-automations-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json','utf8')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+language+'/translation.json','utf8'))}};}
const country=projects+'/digitalmaktab-spa-country-afghanistan';
const rule={id:'ATTENDANCE_INCOMPLETE',windowKind:'OVERDUE',usesDailyDeadline:true,dailyDeadlineMinute:1080,titleKey:'automations.rules.ATTENDANCE_INCOMPLETE.title',descriptionKey:'automations.rules.ATTENDANCE_INCOMPLETE.description',enabled:false,leadMinutes:1440,timeZoneOverride:'',effectiveTimeZone:'Asia/Kabul',version:'initial',lastCheckedAt:null,lastCreatedCount:0,lastErrorCode:''};
fs.writeFileSync(work+'/api.ts',`let rule=${JSON.stringify(rule)};export default {
 get:async()=>{window.automationReads=(window.automationReads||0)+1;return {data:[rule]}},
 put:async(url,dto)=>{window.automationSaved=dto;rule={...rule,...dto,version:'next'};return {data:rule}},
 post:async(url,dto)=>{window.automationPreview=dto;return {data:{timeZoneId:"Asia/Kabul",eligibleRecipients:40,alreadyDelivered:0,newRecipients:40,items:Array.from({length:40},(_,index)=>({sourceId:'meeting-'+index,subject:'Class '+index,pendingCount:1,occursAt:'2026-10-20T08:00:00Z',recipients:1}))}}}};`);
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import Screen from ${JSON.stringify(core+'/src/automation/AppSchoolAutomations.tsx')};
import {AuthContext} from ${JSON.stringify(core+'/src/helper/auth/AuthProvider.tsx')};import {MemoryRouter} from 'react-router-dom';
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',dark=params.get('state')==='dark';
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');document.documentElement.dir=language==='en-US'?'ltr':'rtl';
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/automations']}><AuthContext.Provider value={{userRole:0,user:{role:0}}}><div className="m-2"><Screen/></div></AuthContext.Provider></MemoryRouter></I18nextProvider>);
});`;
fs.writeFileSync(work+'/entry.tsx',entry);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.NormalModuleReplacementPlugin(/api\/client$/,resource=>{if(resource.context===core+'/src/automation')resource.request=work+'/api.ts'}),new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
webpack(config,async(error,stats)=>{
 let browser, socket;
 try{
  if(error)throw error;assert(!stats.hasErrors(),stats.toString({all:false,errors:true}));
  fs.writeFileSync(work+'/index.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync(projects+'/digitalmaktab-spa/node_modules/select2/dist/css/select2.min.css','utf8')+fs.readFileSync(projects+'/digitalmaktab-spa/src/App.css','utf8')+'</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>');
  browser=spawn(chrome,['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});
  const log=fs.createWriteStream(work+'/chrome.log');browser.stderr.pipe(log);
  const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
  for(let attempt=0;!fs.existsSync(work+'/profile/DevToolsActivePort');attempt++){assert(attempt<100,'Chrome did not start');await wait(100)}
  const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0];const version=await (await fetch('http://127.0.0.1:'+port+'/json/version')).json();
  socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result)}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}))});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);
  for(const [width,height,language,state,screen] of [[1280,1000,'fa-AF','dark','automation'],[320,800,'fa-AF','dark','automation'],[360,800,'ps-AF','dark','automation'],[1280,1000,'en-US','light','automation']]){
   const name=width+'x'+height+'-'+language+'-'+state+'-'+screen;
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state+'&screen='+screen},sessionId);
   const evaluate=async(expression,awaitPromise=false)=>{
    const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise},sessionId);
    if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;
   };
   for(let attempt=0;attempt<100;attempt++){if(await evaluate('!!document.querySelector("tbody button")'))break;assert(attempt<99,'AI form failed to render');await wait(100)}
   const click=async(selector)=>{
    const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},sessionId);await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},sessionId);await wait(150);
   };
   const fill=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${selector.startsWith('textarea')?'HTMLTextAreaElement':'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(100)};
   await click('tbody button');
   await click('select[name="enabled"] + .select2 .select2-selection');
   assert(await evaluate('!!document.querySelector(".select2-container--open .select2-results")'),'Status picker closed while opening');
   await click('.select2-results__option:last-child');
   await fill('input[name="dailyDeadlineTime"]','07:30');await fill('input[name="leadMinutes"]','60');await fill('input[name="timeZoneOverride"]','Asia/Kabul');
   await click('.modal-body form button');
   assert(await evaluate('!!window.automationPreview && window.automationPreview.enabled===true && window.automationPreview.dailyDeadlineMinute===450'),'Preview did not use current fields');
   assert.equal(await evaluate('!!window.automationSaved'),false,'Preview saved settings');
   assert.equal(await evaluate('window.automationReads'),1,'Settings requests looped');
   const footer=await evaluate('(()=>{const e=document.querySelector(".modal-footer");const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}})()');
   assert(footer.top>=0&&footer.bottom<=height+1&&footer.height>0,'Modal buttons left the viewport '+JSON.stringify(footer));
   const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'-modal.png',Buffer.from(shot.data,'base64'));
   await click('.modal-footer button:last-child');await wait(200);
   assert(await evaluate('!!window.automationSaved && window.automationSaved.enabled===true && window.automationSaved.leadMinutes===60 && window.automationSaved.dailyDeadlineMinute===450'),'Settings were not saved');
   assert.equal(await evaluate('!!document.querySelector(".modal.show")'),false,'Modal stayed open after save');
   const layout=await evaluate('({width:document.documentElement.scrollWidth,background:getComputedStyle(document.querySelector(".card")).backgroundColor,color:getComputedStyle(document.querySelector(".card")).color})');
   assert(layout.width<=width+1,'Automation screen overflows '+JSON.stringify(layout));
   if(state==='dark'){assert.notEqual(layout.background,'rgb(255, 255, 255)');assert.notEqual(layout.color,'rgb(0, 0, 0)');}
   const pageShot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(pageShot.data,'base64'));
   console.log('PASS: '+name+'; shared picker, preview, saved payload, bounded requests, modal footer, viewport fit and theme.');
  }
  console.log('Automation browser artifacts: '+work);
 }catch(error){console.error(error);console.error('Automation browser artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
