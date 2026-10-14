// Real Chrome layout regression: CSS geometry cannot be checked by jsdom.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-calendar-layout-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:JSON.parse(fs.readFileSync(projects+'/'+repo+'/src/locales/'+language+'/translation.json','utf8'))};}
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import Month from ${JSON.stringify(core+'/src/components/calendar/AppMonthCalendar.tsx')};
import {CalendarProvider,gregorianCalendar} from ${JSON.stringify(core+'/src/contexts/CalendarContext.tsx')};
import {afghanistanCalendar} from ${JSON.stringify(projects+'/digitalmaktab-spa-country-afghanistan/src/index.ts')};
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',dark=params.get('state')==='dark';
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><CalendarProvider value={language==='en-US'?gregorianCalendar:afghanistanCalendar}>
 <div className="card m-2"><div className="card-body p-2"><Month cursor={new Date(2024,2,20,12)} onCursorChange={()=>{}} onSelectDate={()=>{}} entries={[{id:'one',kind:'EVENT',title:'A long school calendar event عنوان رویداد مکتب',fromDate:'2024-03-20',toDate:'2024-03-20'}]} /></div></div>
 </CalendarProvider></I18nextProvider>);
 setTimeout(()=>{
  const button=document.querySelector('button[aria-label="2024-03-20"]'),cell=button.parentElement,style=getComputedStyle(cell),box=cell.getBoundingClientRect();
  const output=document.createElement('pre');output.id='layout-result';output.textContent=JSON.stringify({viewport:{width:innerWidth,height:innerHeight},dark,background:style.backgroundColor,color:style.color,scrollWidth:document.documentElement.scrollWidth,label:document.querySelector('h4').textContent,cellWidth:box.width,days:document.querySelectorAll('button[aria-label^="2024-"]').length,dir:document.documentElement.dir});document.body.appendChild(output);
 },300);
});
`;
fs.writeFileSync(work+'/entry.tsx',entry);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
webpack(config,async(error,stats)=>{
 let browser, socket;
 try{
  if(error)throw error;assert(!stats.hasErrors(),stats.toString({all:false,errors:true}));
  fs.writeFileSync(work+'/index.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync(projects+'/digitalmaktab-spa/src/App.css','utf8')+'</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>');
  browser=spawn(chrome,['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});
  const log=fs.createWriteStream(work+'/chrome.log');browser.stderr.pipe(log);
  const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
  for(let attempt=0;!fs.existsSync(work+'/profile/DevToolsActivePort');attempt++){assert(attempt<100,'Chrome did not start');await wait(100)}
  const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0];const version=await (await fetch('http://127.0.0.1:'+port+'/json/version')).json();
  socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result)}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}))});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);
  for(const [width,height,language,state,fullscreen] of [[1280,800,'fa-AF','dark'],[320,640,'fa-AF','dark'],[360,640,'ps-AF','dark'],[1280,800,'en-US','light']]){
   const name=width+'x'+height+'-'+language+'-'+state+(fullscreen?'-fullscreen':'');
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state+(fullscreen?'&fullscreen=1':'')},sessionId);
   let content;for(let attempt=0;attempt<100;attempt++){const value=await send('Runtime.evaluate',{expression:'document.getElementById("layout-result")?.textContent',returnByValue:true},sessionId);content=value.result.value;if(content)break;await wait(100)}
   const html=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true},sessionId);fs.writeFileSync(work+'/'+name+'.html',html.result.value);
   const screenshot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(screenshot.data,'base64'));
   assert(content,'No layout result for '+name);const layout=JSON.parse(content);assert.deepEqual(layout.viewport,{width,height});
   fs.writeFileSync(work+'/'+name+'.json',JSON.stringify(layout,null,2));
   assert(layout.scrollWidth<=width+1,'Calendar overflows viewport '+JSON.stringify(layout));assert(layout.cellWidth>20);assert(layout.days>=29);
   if(state==='dark'){assert.notEqual(layout.background,'rgb(255, 255, 255)');assert.notEqual(layout.color,'rgb(0, 0, 0)');assert(layout.background!=='rgba(0, 0, 0, 0)');}
   if(language!=='en-US'){assert(layout.label.includes(language==='ps-AF'?'وری':'حمل'));assert(/۱۴۰۳|1403|١٤٠٣/.test(layout.label));assert.equal(layout.dir,'rtl');}else assert(layout.label.includes('March'));
   console.log('PASS: '+name+'; calendar fits, native month/day labels and theme colors verified.');
  }
  console.log('Calendar layout artifacts: '+work);
 }catch(error){console.error(error);console.error('Calendar layout artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
