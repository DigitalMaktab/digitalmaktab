// Real Chrome regression for shared selects and country date selection.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-picker-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json','utf8')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+language+'/translation.json','utf8'))}};}
const country=projects+'/digitalmaktab-spa-country-afghanistan';
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import AppForm from ${JSON.stringify(core+'/src/components/form/AppForm.tsx')};
import AppTimetableBellFields from ${JSON.stringify(core+'/src/academicYears/AppTimetableBellFields.tsx')};
import AppFormValues from ${JSON.stringify(core+'/src/components/form/AppFormValues.tsx')};
import AppFormInput from ${JSON.stringify(core+'/src/components/form/AppFormInput.tsx')};
import AppFormOptionSelect from ${JSON.stringify(core+'/src/components/form/AppFormOptionSelect.tsx')};
import AppFormLocalDatePicker from ${JSON.stringify(core+'/src/components/form/AppFormLocalDatePicker.tsx')};
import {CalendarProvider,gregorianCalendar} from ${JSON.stringify(core+'/src/contexts/CalendarContext.tsx')};
import AfghanDatePicker from ${JSON.stringify(country+'/src/AfghanDatePicker.tsx')};
import $ from 'jquery'; window.jquery=$;
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',dark=params.get('state')==='dark';
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');document.documentElement.dir=language==='en-US'?'ltr':'rtl';
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><CalendarProvider value={{...gregorianCalendar,system:'SOLAR_HIJRI',DatePicker:AfghanDatePicker}}>
 <div className="card m-2"><div className="card-body p-2"><AppForm initialValues={{title:'Teaching year',climate:'COLD',birth:'2026-10-13',plan:{teachingWeekdays:['6','0','1','2','3','4'],bellSchedules:[{code:'morning-grade-8',shift:'0',gradeFrom:'8',gradeTo:'8',weekdays:['6','0','1','2','3','4'],periods:Array.from({length:8},(_,i)=>({startTime:String(8+Math.floor(i*40/60)).padStart(2,'0')+':'+String(i*40%60).padStart(2,'0'),endTime:String(8+Math.floor((i+1)*40/60)).padStart(2,'0')+':'+String((i+1)*40%60).padStart(2,'0')}))}]}}} onSubmit={()=>{window.submitted=true}}>
 <AppFormInput name="title" label="Title" />
 <AppFormOptionSelect name="climate" label="Climate" options={[{value:'COLD',label:'Cold'},{value:'WARM',label:'Warm'}]} />
 <AppFormLocalDatePicker name="birth" label="Birth" max="2026-10-13" />
 <AppFormValues>{values=><output id="birth-value">{values.birth}</output>}</AppFormValues>
 <AppTimetableBellFields name="plan" />
 </AppForm></div></div></CalendarProvider></I18nextProvider>);
});
`;
fs.writeFileSync(work+'/entry.tsx',entry);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
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
  for(const [width,height,language,state,fullscreen] of [[1280,800,'fa-AF','dark'],[320,640,'fa-AF','dark'],[360,640,'ps-AF','dark'],[1280,800,'en-US','light']]){
   const name=width+'x'+height+'-'+language+'-'+state+(fullscreen?'-fullscreen':'');
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state+(fullscreen?'&fullscreen=1':'')},sessionId);
   const evaluate=async(expression,awaitPromise=false)=>{
    const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise},sessionId);
    if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;
   };
   for(let attempt=0;attempt<100;attempt++){if(await evaluate('!!window.jquery?.("#climate").data("select2")'))break;assert(attempt<99,'Select2 failed to initialize');await wait(100)}
   const click=async(selector)=>{
    const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},sessionId);await wait(150);
   };
   await click('input[name="title"]');
   await click('.select2-selection');
   assert(await evaluate('window.jquery("#climate").data("select2").isOpen()'),'Dropdown closed on opening/blur');
   assert(await evaluate('!!document.querySelector(".select2-results__option")'),'Dropdown choices missing');
   await evaluate('window.initialWidget=window.jquery("#climate").data("select2");document.querySelector("input[name=title]").dispatchEvent(new FocusEvent("focusout",{bubbles:true}))');await wait(150);
   assert(await evaluate('window.jquery("#climate").data("select2")===window.initialWidget && window.initialWidget.isOpen()'),'Formik update rebuilt the dropdown');
   await click('.select2-results__option:last-child');
   assert.equal(await evaluate('document.querySelector("#climate").value'),'WARM');
   await click('select[name="plan.bellSchedules.0.shift"] + .select2 .select2-selection');
   assert(await evaluate(`window.jquery(document.querySelector('select[name="plan.bellSchedules.0.shift"]')).data('select2').isOpen()`),'Bell shift picker closed on opening');
   await evaluate(`window.bellWidget=window.jquery(document.querySelector('select[name="plan.bellSchedules.0.shift"]')).data('select2');document.querySelector('input[name="plan.bellSchedules.0.code"]').dispatchEvent(new FocusEvent('focusout',{bubbles:true}))`);await wait(150);
   assert(await evaluate(`window.jquery(document.querySelector('select[name="plan.bellSchedules.0.shift"]')).data('select2')===window.bellWidget && window.bellWidget.isOpen()`),'Bell shift picker rebuilt during Formik validation');
   await click('.select2-results__option:last-child');
   assert.equal(await evaluate(`document.querySelector('select[name="plan.bellSchedules.0.shift"]').value`),'3');
   assert.equal(await evaluate('document.querySelectorAll("input[type=time]").length'),16);
   const bellLayout=await evaluate(`Array.from(document.querySelectorAll('input[type="time"]')).map(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right}})`);
   assert(bellLayout.every(r=>r.left>=0 && r.right<=width),'Bell time controls overflow viewport');
   await click('#birth');
   const label=translations[language].translation.afghanDatePicker;
   await click(`button[aria-label="${label.chooseYear}"]`);
   await click('input[name="birth-year"]');
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:4},sessionId);
   await send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:4},sessionId);
   // Use the native input setter to simulate a controlled input edit reliably on each OS.
   await evaluate(`(()=>{const e=document.querySelector('input[name="birth-year"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,'۱۳۸۰');e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(100);
   await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter'},sessionId);await wait(100);
   await click('[role="dialog"] [role="group"] button:first-child');
   await click('[role="dialog"] [role="group"] button:nth-of-type(15)');
   assert.equal(await evaluate('!!window.submitted'),false,'Picker Enter submitted form');
   assert.equal(await evaluate('!!document.querySelector("[role=dialog]")'),false);
   assert.equal(await evaluate('document.querySelector("#birth-value").textContent'),'2001-04-04');
   const display=await evaluate('document.querySelector("#birth").value');assert(/1380|۱۳۸۰/.test(display),display);
   await click('#birth');
   const layout=await evaluate(`(()=>{const e=document.querySelector('[role="dialog"]'),r=e.getBoundingClientRect(),s=getComputedStyle(e);return{left:r.left,right:r.right,background:s.backgroundColor,color:s.color}})()`);
   assert(layout.left>=0 && layout.right<=width,'Picker overflows viewport '+JSON.stringify(layout));
   const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(shot.data,'base64'));
   console.log('PASS: '+name+'; real mouse opens Select2 through Formik blur, selection works, bell shift selection stays open through validation, eight period controls fit, direct Hijri birth-year entry preserves ISO form value and fits viewport.');
  }
  console.log('Picker browser artifacts: '+work);
 }catch(error){console.error(error);console.error('Picker browser artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
