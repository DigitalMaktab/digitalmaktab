// Real Chrome regression for shared selects and country date selection.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-sidebar-groups-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json','utf8')),...(language==='en-US'?{}:JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+language+'/translation.json','utf8')))}};}
const country=projects+'/digitalmaktab-spa-country-afghanistan';

fs.writeFileSync(work+'/api.ts',`export default {get:async()=>({data:{year:'2026-03-21',nativeYear:'1405',academicSummary:{displayName:'School academic year',fromDate:'2026-03-21',toDate:'2027-03-20'}}})};`);
fs.writeFileSync(work+'/entry.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import Sidebar from ${JSON.stringify(core+'/src/components/AppSideBar.tsx')};import {MemoryRouter} from 'react-router-dom';
import {AuthContext} from ${JSON.stringify(core+'/src/helper/auth/AuthProvider.tsx')};
import {CalendarProvider} from ${JSON.stringify(core+'/src/contexts/CalendarContext.tsx')};
import {afghanistanCalendar} from ${JSON.stringify(country+'/src/calendarModule.ts')};
const p=new URLSearchParams(location.search),language=p.get('lang'),dark=p.get('state')==='dark';
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');document.documentElement.dir=language==='en-US'?'ltr':'rtl';
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><AuthContext.Provider value={{userRole:0,user:{role:0,school:{id:'school'}}}}><CalendarProvider value={afghanistanCalendar}><MemoryRouter><Sidebar isOpen={true}/></MemoryRouter></CalendarProvider></AuthContext.Provider></I18nextProvider>));`);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.NormalModuleReplacementPlugin(/api\/client$/,resource=>{if(resource.context===core+'/src/components')resource.request=work+'/api.ts'}),new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
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


  for(const [width,language,state] of [[1280,'en-US','light'],[1280,'fa-AF','dark'],[320,'ps-AF','dark']]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state},sessionId);
   const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true},sessionId);if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value};
   for(let attempt=0;attempt<100;attempt++){if(await evaluate('!!document.querySelector(".sidebar-link")'))break;assert(attempt<99,'Sidebar failed to render');await wait(100)}
   assert.equal(await evaluate('document.querySelector(".sidebar-link").getAttribute("href")'),'/home');
   await evaluate(`Array.from(document.querySelectorAll('.sidebar-link')).find(e=>e.getAttribute('data-testid')?.includes(${JSON.stringify(translations[language].translation.sidebar.students.label)})).click()`);
   assert(await evaluate(`!!document.querySelector('a[href="/student-list"]')`));
   const stateInfo=await evaluate(`(()=>{const sidebar=document.querySelector('.sidebar'),r=sidebar.getBoundingClientRect();return {left:r.left,right:r.right,labels:sidebar.textContent,headings:[...sidebar.querySelectorAll('.sidebar-main-title[aria-label]')].map(e=>e.textContent),dir:document.documentElement.dir}})()`);
   assert(stateInfo.left>=0&&stateInfo.right<=width+1,'Sidebar outside viewport');assert(!stateInfo.labels.includes('sidebar.groups.'));assert.equal(stateInfo.headings[1],translations[language].translation.sidebar.groups.daily);
   const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(work+'/'+width+'-'+language+'-'+state+'.png',Buffer.from(screenshot.data,'base64'));
   console.log('PASS: '+JSON.stringify({width,language,state,headings:stateInfo.headings}));
  }
  console.log('Screenshots: '+work);
 }catch(error){console.error(error);process.exitCode=1}finally{socket?.close();browser?.kill('SIGTERM')}
});
