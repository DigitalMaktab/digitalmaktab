// Real Chrome layout regression: CSS geometry cannot be checked by jsdom.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn,spawnSync}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-academic-print-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:JSON.parse(fs.readFileSync(projects+'/'+repo+'/src/locales/'+language+'/translation.json','utf8'))};}
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';import {MemoryRouter} from 'react-router-dom';
import Transcript from ${JSON.stringify(core+'/src/components/transcript/AppTranscript.tsx')};
import Report from ${JSON.stringify(core+'/src/components/reportCard/AppReportCard.tsx')};
import {CalendarProvider,gregorianCalendar} from ${JSON.stringify(core+'/src/contexts/CalendarContext.tsx')};
import {CountryPersonProvider} from ${JSON.stringify(core+'/src/contexts/CountryPersonContext.tsx')};
import {AuthContext} from ${JSON.stringify(core+'/src/helper/auth/AuthProvider.tsx')};
import {afghanistanCalendar} from ${JSON.stringify(projects+'/digitalmaktab-spa-country-afghanistan/src/calendarModule.ts')};
import {afghanStudentTableExtension} from ${JSON.stringify(projects+'/digitalmaktab-spa-country-afghanistan/src/studentTable.ts')};
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',dark=params.get('state')==='dark',kind=params.get('kind')||'transcript',austria=params.has('austria');
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');
const base={creationDate:'2025-03-20T12:00:00Z',creationUserName:'',updateDate:'2025-03-20T12:00:00Z',updateUserName:'',status:true};
const student={...base,id:'student',firstName:'احمد',lastName:'Ahmad 10012',countryCode:austria?'AT':'AF',countryDetails:{fatherNameNative:'CountryFather',asasNumber:10012}};
const courses=Array.from({length:60},(_,index)=>({...base,id:'course-'+index,courseId:'course-'+index,subjectName:'Course '+(index+1),midTermScore:0,finalScore:85}));
const transcript={student,school:{schoolName:'School document',address:{street:'Street',city:{object:true},district:{districtName:'District',city:{stateName:'Province'}}}},transcriptNumber:'TR-1002',issuedAt:'2025-03-20T12:00:00Z',years:[{calendarYearId:'year',year:'1403',classes:[{classId:'class',className:'دوم',courses}]}]};
const report={student,grades:[],attendance:[],fees:[],comment:'Teacher narrative',commentUpdatedAt:transcript.issuedAt};
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter><AuthContext.Provider value={{userRole:0}}><CalendarProvider value={austria?gregorianCalendar:afghanistanCalendar}><CountryPersonProvider students={[afghanStudentTableExtension]} teachers={[]}>
 <aside>Dashboard chrome should not print</aside><div className="page-wrapper"><main>{kind==='transcript'?<Transcript transcript={transcript}/>:<Report report={report} actions={<button>Print action must not print</button>}/>}</main><footer>Editor controls must not print</footer></div>
 </CountryPersonProvider></CalendarProvider></AuthContext.Provider></MemoryRouter></I18nextProvider>);
 setTimeout(()=>{const doc=document.querySelector('.app-print-document'),style=getComputedStyle(doc);const output=document.createElement('pre');output.id='layout-result';output.textContent=JSON.stringify({viewport:{width:innerWidth,height:innerHeight},background:style.backgroundColor,color:style.color,scrollWidth:document.documentElement.scrollWidth,dir:doc.dir,lang:doc.lang,text:doc.textContent,rows:doc.querySelectorAll('tbody tr').length});document.body.appendChild(output);},300);
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
  for(const [kind,width,height,language,state,austria] of [['transcript',1280,800,'fa-AF','dark'],['transcript',360,640,'ps-AF','dark'],['transcript',1280,800,'en-US','light'],['transcript',1280,800,'en-US','light',true],['report',1280,800,'fa-AF','dark'],['report',360,640,'ps-AF','dark'],['report',1280,800,'en-US','light'],['report',1280,800,'en-US','light',true]]){
   const name=kind+'-'+width+'x'+height+'-'+language+'-'+state+(austria?'-AT':'-AF');
   await send('Emulation.setEmulatedMedia',{media:'screen'},sessionId);
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?kind='+kind+'&lang='+language+'&state='+state+(austria?'&austria=1':'')},sessionId);
   let content;for(let attempt=0;attempt<100;attempt++){const value=await send('Runtime.evaluate',{expression:'document.getElementById("layout-result")?.textContent',returnByValue:true},sessionId);content=value.result.value;if(content)break;await wait(100)}
   assert(content,'No rendered document for '+name);const layout=JSON.parse(content);fs.writeFileSync(work+'/'+name+'.json',JSON.stringify(layout,null,2));
   const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(shot.data,'base64'));
   assert.equal(layout.dir,language==='en-US'?'ltr':'rtl');assert.equal(layout.lang,language);assert(!layout.text.includes('[object'));assert(layout.text.includes('Ahmad 10012'));if(!austria)assert(layout.text.includes('CountryFather'));
   assert(layout.scrollWidth<=width+1,'Document overflows screen '+JSON.stringify(layout));if(state==='dark'){assert.notEqual(layout.background,'rgb(255, 255, 255)');assert.notEqual(layout.color,'rgb(0, 0, 0)');}
   if(!austria){assert(/۱۴۰۳|1403|١٤٠٣/.test(layout.text),'Missing native document year');if(language==='en-US')assert(layout.text.includes('30 Hoot 1403'));}else assert(/2025/.test(layout.text));
   await send('Emulation.setEmulatedMedia',{media:'print'},sessionId);
   const print=await send('Runtime.evaluate',{expression:'JSON.stringify({hidden:Array.from(document.querySelectorAll("[data-print-controls]")).every(node=>getComputedStyle(node).display==="none"),background:getComputedStyle(document.querySelector(".app-print-document")).backgroundColor,aside:getComputedStyle(document.querySelector("aside")).display})',returnByValue:true},sessionId);
   const printStyle=JSON.parse(print.result.value);assert(printStyle.hidden);assert.equal(printStyle.background,'rgb(255, 255, 255)');assert.equal(printStyle.aside,'none');
   const pdf=await send('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false},sessionId);const filename=work+'/'+name+'.pdf';fs.writeFileSync(filename,Buffer.from(pdf.data,'base64'));
   const extracted=spawnSync('pdftotext',['-layout',filename,'-'],{encoding:'utf8'});assert.equal(extracted.status,0);const text=extracted.stdout.normalize('NFKC');
   assert(!text.includes('[object'));assert(!/Dashboard chrome|Editor controls|Print action must/.test(text));assert(text.includes('Ahmad 10012'));
   if(kind==='transcript'){assert(text.includes('Course 60'),'Last transcript row did not print');assert(!text.includes('From date'));}else assert(text.includes('Teacher narrative'));
   console.log('PASS: '+name+'; native dates, country fields, theme/direction, clean multipage PDF and complete rows.');
  }
  console.log('Academic print artifacts: '+work);
 }catch(error){console.error(error);console.error('Academic print artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
