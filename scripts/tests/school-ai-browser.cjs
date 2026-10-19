// Real Chrome regression for shared selects and country date selection.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-school-ai-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json','utf8')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+language+'/translation.json','utf8'))}};}
const country=projects+'/digitalmaktab-spa-country-afghanistan';
const settings={version:'initial',enabled:true,provider:'OPENAI',model:'test-model',hasApiKey:true,allowedRoles:['TEACHER','STAFF'],instructions:'Explain clearly',maxOutputTokens:1024,schoolDailyLimit:500,userDailyLimit:50};
fs.writeFileSync(work+'/api.ts',`let settings=${JSON.stringify(settings)};
let conversation={conversation:{id:'saved-chat',version:'v1',title:'',isPinned:false,turnCount:0,creationDate:'2026-10-19T10:00:00Z',updateDate:'2026-10-19T10:00:00Z'},turns:[]};
export default {get:async(url)=>{window.aiReads=(window.aiReads||0)+1;return {data:url==='/school-ai/conversations'?{items:[conversation.conversation],totalCount:1,pageNumber:1,pageSize:50}:url.startsWith('/school-ai/conversations/')?JSON.parse(JSON.stringify(conversation)):url.endsWith('/status')?{available:true,enabled:true,reason:'',provider:'GROQ',model:'openai/gpt-oss-120b',myRequestsToday:0,schoolRequestsToday:0,schoolDailyLimit:500,userDailyLimit:50}:settings}},put:async(url,dto)=>{window.aiSaved=dto;settings={...dto,version:'next',hasApiKey:true};return {data:settings}},post:async(url,dto)=>{window.aiPosts=(window.aiPosts||0)+1;await new Promise(resolve=>setTimeout(resolve,100));if(dto.prompt?.includes('fail'))throw {response:{status:502,data:{code:'ProviderUnavailable',detail:'Simulated provider unavailable'}}};if(url.endsWith('/messages')){conversation.turns.push({requestId:dto.clientRequestId,prompt:dto.prompt,answer:'A useful answer <script>not executable</script>',state:'SUCCEEDED',errorCode:'',provider:'GROQ',model:'openai/gpt-oss-120b',createdAt:'2026-10-19T10:00:00Z'});conversation.conversation={...conversation.conversation,title:dto.prompt,version:'next',turnCount:conversation.turns.length};}return {data:{text:'A useful answer <script>not executable</script>',requestId:'reply',provider:'GROQ',model:'openai/gpt-oss-120b',truncated:false}}}};`);
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import Settings from ${JSON.stringify(core+'/src/ai/AppSchoolAiSettings.tsx')};
import Chat from ${JSON.stringify(core+'/src/ai/AppSchoolAiAssistant.tsx')};
import {AuthContext} from ${JSON.stringify(core+'/src/helper/auth/AuthProvider.tsx')};
import {MemoryRouter} from 'react-router-dom';
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',dark=params.get('state')==='dark',chat=params.get('screen')==='chat';
document.documentElement.setAttribute('data-theme',dark?'dark':'light');document.documentElement.setAttribute('data-bs-theme',dark?'dark':'light');document.documentElement.dir=language==='en-US'?'ltr':'rtl';
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter><AuthContext.Provider value={{userRole:chat?4:0,user:{role:chat?4:0}}}>
 <div className="m-2">{chat?<Chat/>:<Settings/>}</div></AuthContext.Provider></MemoryRouter></I18nextProvider>);
});
`;
fs.writeFileSync(work+'/entry.tsx',entry);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.NormalModuleReplacementPlugin(/api\/client$/,resource=>{if(resource.context===core+'/src/ai')resource.request=work+'/api.ts'}),new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
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
  for(const [width,height,language,state,screen] of [[1280,1000,'fa-AF','dark','settings'],[320,800,'fa-AF','dark','settings'],[360,800,'ps-AF','dark','chat'],[1280,1000,'en-US','light','chat']]){
   const name=width+'x'+height+'-'+language+'-'+state+'-'+screen;
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state+'&screen='+screen},sessionId);
   const evaluate=async(expression,awaitPromise=false)=>{
    const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise},sessionId);
    if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;
   };
   for(let attempt=0;attempt<100;attempt++){if(await evaluate(screen==='chat'?'!!document.querySelector("textarea")':'!!document.querySelector("form")'))break;assert(attempt<99,'AI form failed to render');await wait(100)}
   const click=async(selector)=>{
    const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing control');e.scrollIntoView({block:'center',behavior:'instant'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},sessionId);await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},sessionId);await wait(150);
   };
   const fill=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${selector.startsWith('textarea')?'HTMLTextAreaElement':'HTMLInputElement'}.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}))})()`);await wait(100)};
   if(screen==='settings'){
    await click('select[name="provider"] + .select2 .select2-selection');
    assert(await evaluate('!!document.querySelector(".select2-container--open .select2-results")'),'Provider select closed on opening');
    await click('.select2-results__option:last-child');
    await fill('input[name="model"]','openai/gpt-oss-120b');await fill('input[name="apiKey"]','fake-new-key');await click('button[type="submit"]');
    assert(await evaluate('!!window.aiSaved && window.aiSaved.provider==="GROQ"'),'Saved provider did not follow the select '+JSON.stringify(await evaluate('({saved:window.aiSaved,values:Array.from(document.querySelectorAll("input,select,textarea")).map(e=>[e.name,e.value]),errors:Array.from(document.querySelectorAll(".invalid-feedback")).map(e=>e.textContent)})')));
    assert.equal(await evaluate('document.querySelector("input[name=apiKey]").value'),'','Secret remained in the form after save');
    assert.equal(await evaluate('window.aiReads'),1,'Settings requests looped');
   }else{
    assert.equal(await evaluate('Array.from(document.querySelectorAll("a")).some(a=>a.getAttribute("href")=="/ai-settings")'),false,'Student sees configuration');
    await fill('textarea','Explain fractions');await click('.ai-composer button[type="submit"]');
    assert.equal(await evaluate('window.aiPosts'),1);
    assert(await evaluate('document.querySelector("section").textContent.includes("A useful answer")'));
    assert.equal(await evaluate('!!document.querySelector("section script")'),false,'AI HTML was executed');
    await fill('textarea','fail request');await click('.ai-composer button[type="submit"]');await wait(200);
    assert(await evaluate('document.body.textContent.includes("Simulated provider unavailable")'),'Usage refresh hid the error');
    assert.equal(await evaluate('document.querySelector("textarea").value'),'fail request');
    assert.equal(await evaluate('window.aiReads'),9,'Conversation or status requests looped');
   }
   const layout=await evaluate('({width:document.documentElement.scrollWidth,background:getComputedStyle(document.querySelector(".card")).backgroundColor,color:getComputedStyle(document.querySelector(".card")).color})');
   assert(layout.width<=width+1,'AI form overflows '+JSON.stringify(layout));
   if(state==='dark'){assert.notEqual(layout.background,'rgb(255, 255, 255)');assert.notEqual(layout.color,'rgb(0, 0, 0)');}
   const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(shot.data,'base64'));
   console.log('PASS: '+name+'; real AI form interaction, bounded requests, safe output, viewport fit and theme.');
  }
  console.log('School AI browser artifacts: '+work);
 }catch(error){console.error(error);console.error('School AI browser artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
