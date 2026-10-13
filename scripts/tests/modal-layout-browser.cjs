// Real Chrome layout regression: CSS geometry cannot be checked by jsdom.
const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const app=projects+'/digitalmaktab-spa/node_modules';const core=projects+'/digitalmaktab-spa-core';const webpack=require(app+'/webpack');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-modal-layout-'));
const chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
const translations={};for(const language of ['en-US','fa-AF','ps-AF']){const repo=language==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';translations[language]={translation:JSON.parse(fs.readFileSync(projects+'/'+repo+'/src/locales/'+language+'/translation.json','utf8'))};}
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';
import Modal from ${JSON.stringify(core+'/src/components/table/AppTablePrintSettings.tsx')};
import AppModal from ${JSON.stringify(core+'/src/components/modal/AppModal.tsx')};import AppButton from ${JSON.stringify(core+'/src/components/AppButton.tsx')};
window.addEventListener('error',event=>{const output=document.createElement('pre');output.id='browser-error';output.textContent=String(event.error?.stack||event.message);document.body.appendChild(output)});
const params=new URLSearchParams(location.search);const language=params.get('lang')||'en-US';const state=params.get('state')||'idle';const generic=state==='generic';
i18n.init({lng:language,resources:${JSON.stringify(translations)},interpolation:{escapeValue:false}}).then(()=>{
 const columns=Array.from({length:90},(_,index)=>({header:language==='en-US'?'Printable column '+index+' with a long descriptive label':'ستون قابل چاپ '+index+' با توضیحات بیشتر',accessor:'column'+index,printByDefault:true}));
 const exportPdf=async(settings,context)=>{context.onProgress({stage:'rendering',completed:90,total:90,records:90});return {blob:new Blob(['test'],{type:'application/pdf'}),fileName:'test.pdf',rowCount:90,pageCount:3,language,direction:i18n.dir(language)};};
 const element=generic?<AppModal isVisible modalHeader title="Long modal" onClose={()=>{}} isFullScreen={params.has('fullscreen')} modalContent={<div>{columns.map((column,index)=><p key={index}>{column.header}</p>)}</div>} modalFooter={<AppButton label="Close modal" onButtonClick={()=>{}} />}/>:<Modal isVisible onClose={()=>{}} columns={columns} preferenceKey="layout-test" allRowsAvailable onExport={exportPdf}/>;
 createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
 setTimeout(()=>{if(state==='ready'){const create=[...document.querySelectorAll('button')].find(button=>button.textContent.includes(i18n.t('report.settings.export')));create.click();}setTimeout(measure,200)},200);
});
function measure(){
 const dialog=document.querySelector('[role=dialog]');const body=dialog.querySelector('.modal-body');const footer=dialog.querySelector('.modal-footer');const header=dialog.querySelector('.modal-header');
 const bounds=element=>{const box=element.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,height:box.height}};
 const before=bounds(footer);body.scrollTop=body.scrollHeight;const after=bounds(footer);const buttons=[...footer.querySelectorAll('button')].map(button=>({...bounds(button),text:button.textContent}));
 const result={viewport:{width:innerWidth,height:innerHeight},body:bounds(body),header:bounds(header),footer:before,after,buttons,scrollable:body.scrollHeight>body.clientHeight,scrolled:body.scrollTop>0,overflow:getComputedStyle(body).overflowY,footerOutsideBody:!body.contains(footer),language,state};
 const output=document.createElement('pre');output.id='layout-result';output.textContent=JSON.stringify(result);document.body.appendChild(output);
}
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
  for(const [width,height,language,state,fullscreen] of [[1280,800,'en-US','idle'],[360,640,'en-US','ready'],[320,480,'fa-AF','ready'],[800,240,'ps-AF','ready'],[800,500,'en-US','generic'],[360,640,'en-US','generic',true]]){
   const name=width+'x'+height+'-'+language+'-'+state+(fullscreen?'-fullscreen':'');
   await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false},sessionId);
   await send('Page.navigate',{url:'file://'+work+'/index.html?lang='+language+'&state='+state+(fullscreen?'&fullscreen=1':'')},sessionId);
   let content;for(let attempt=0;attempt<100;attempt++){const value=await send('Runtime.evaluate',{expression:'document.getElementById("layout-result")?.textContent',returnByValue:true},sessionId);content=value.result.value;if(content)break;await wait(100)}
   const html=await send('Runtime.evaluate',{expression:'document.documentElement.outerHTML',returnByValue:true},sessionId);fs.writeFileSync(work+'/'+name+'.html',html.result.value);
   const screenshot=await send('Page.captureScreenshot',{format:'png'},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(screenshot.data,'base64'));
   assert(content,'No layout result for '+name);const layout=JSON.parse(content);assert.deepEqual(layout.viewport,{width,height});
   fs.writeFileSync(work+'/'+name+'.json',JSON.stringify(layout,null,2));assert(layout.scrollable&&layout.scrolled,'Content should scroll: '+name);assert.equal(layout.overflow,'auto');assert(layout.footerOutsideBody);assert.deepEqual(layout.footer,layout.after,'Footer moved when body scrolled: '+name);
   for(const button of layout.buttons){assert(button.top>=0&&button.bottom<=layout.viewport.height+1,'Button vertically clipped: '+name+' '+button.text+' '+JSON.stringify(layout));assert(button.left>=0&&button.right<=layout.viewport.width+1,'Button horizontally clipped: '+name+' '+button.text);}
   assert(layout.header.top>=0&&layout.header.bottom<=layout.viewport.height+1,'Header is clipped: '+name);console.log('PASS: '+name+'; actual viewport '+layout.viewport.width+'x'+layout.viewport.height+'; content scrolls and all footer buttons remain visible.');
  }
  console.log('Modal layout artifacts: '+work);
 }catch(error){console.error(error);console.error('Modal layout artifacts: '+work);process.exitCode=1;}
 finally {socket?.close();browser?.kill('SIGTERM');}
});
