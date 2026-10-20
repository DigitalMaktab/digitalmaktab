// Real Chrome regression for sidebar scroll across layout-route remounts.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-sidebar-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json','utf8')),...JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+language+'/translation.json','utf8'))}};}
const country=projects+'/digitalmaktab-spa-country-afghanistan';
fs.writeFileSync(work+'/footer.tsx','export default function Footer(){return null}');
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {MemoryRouter,Routes,Route,useLocation,useNavigate} from 'react-router-dom';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import AppSideBar from ${JSON.stringify(core+'/src/components/AppSideBar.tsx')};
import {AuthContext} from ${JSON.stringify(core+'/src/helper/auth/AuthProvider.tsx')};
import {SidebarExtensionProvider} from ${JSON.stringify(core+'/src/components/sidebar/SidebarExtensionContext.tsx')};
const language=new URLSearchParams(location.search).get('lang')||'fa-AF';document.documentElement.dir=language==='en-US'?'ltr':'rtl';document.documentElement.setAttribute('data-theme',language==='en-US'?'light':'dark');
const account={role:0,school:{id:'first-school'}};const sections=[{title:'Test menus',group:'regression',order:200,items:[...Array.from({length:45},(_,i)=>({label:'Menu '+i,link:(i%2?'/two/':'/one/')+i,roles:[0]})),{label:'Scroll group',roles:[0],subMenu:[{label:'First destination',link:'/one/99',roles:[0]},{label:'Second destination',link:'/two/99',roles:[0]}]}]}];
function First(){return <Shell/>}function Second(){return <Shell/>}function Shell(){const loc=useLocation();return <main className="page-wrapper compact-wrapper"><div className="page-body-wrapper"><AppSideBar isOpen/><output id="current-route" data-location-key={loc.key}>{loc.pathname}</output></div></main>}
function Test(){const [user,setUser]=useState(account),navigate=useNavigate();window.sidebarBack=()=>navigate(-1);window.switchSidebarAccount=()=>setUser({role:0,school:{id:'other-school'}});return <AuthContext.Provider value={{user,userRole:0,isAuthenticated:true}}><SidebarExtensionProvider extraSections={sections}><Routes><Route path="/one/*" element={<First/>}/><Route path="/two/*" element={<Second/>}/></Routes></SidebarExtensionProvider></AuthContext.Provider>}
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={['/one/0']}><Test/></MemoryRouter></I18nextProvider>));
`;
fs.writeFileSync(work+'/entry.tsx',entry);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.NormalModuleReplacementPlugin(/sidebar\/AppSidebarFooter$/,work+'/footer.tsx'),new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
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
   for(let attempt=0;attempt<100;attempt++){if(await evaluate('!!document.querySelector("#simple-bar")'))break;assert(attempt<99,'Sidebar failed to mount');await wait(100)}
   const click=async selector=>{
    const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point},sessionId);
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point},sessionId);await wait(150);
   };
   const initialLocation=await evaluate('document.querySelector("#current-route").dataset.locationKey');
   await click('[data-testid="Scroll group-link"]');
   assert.equal(await evaluate('document.querySelector("#current-route").dataset.locationKey'),initialLocation,'Group toggle must not create a history entry');
   assert.equal(await evaluate('document.querySelector("#current-route").textContent'),'/one/0','Expanding a group must not change the route/hash');
   await evaluate(`document.querySelector('a[href="/two/99"]').scrollIntoView({block:'nearest'});window.originalMenu=document.querySelector('#simple-bar');true`);await wait(100);
   const before=await evaluate('document.querySelector("#simple-bar").scrollTop');assert(before>200,'Fixture sidebar must actually be scrolled');
   await click('a[href="/two/99"]');
   assert.equal(await evaluate('document.querySelector("#current-route").textContent'),'/two/99');
   assert(await evaluate('document.querySelector("#simple-bar")!==window.originalMenu'),'Route must recreate the sidebar to exercise the regression');
   const after=await evaluate('document.querySelector("#simple-bar").scrollTop');assert(Math.abs(before-after)<3,'Sidebar jumped on navigation: '+before+' -> '+after);
   assert(await evaluate('!!document.querySelector(".sidebar-submenu")'),'Expanded group was lost');
   await evaluate('window.sidebarBack()');await wait(150);
   assert.equal(await evaluate('document.querySelector("#current-route").textContent'),'/one/0');
   assert(Math.abs(before-await evaluate('document.querySelector("#simple-bar").scrollTop'))<3,'Browser back reset the sidebar');
   const shot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(shot.data,'base64'));
   await evaluate('window.switchSidebarAccount()');await wait(150);
   assert.equal(await evaluate('document.querySelector("#simple-bar").scrollTop'),0,'Another account inherited the sidebar position');
   console.log('PASS: '+name+'; real mouse navigation and browser back retain scroll/expanded group across layout remounts; group toggle does not navigate and another account starts at the top.');
  }
  console.log('Sidebar browser artifacts: '+work);
 }catch(error){console.error(error);console.error('Sidebar browser artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
