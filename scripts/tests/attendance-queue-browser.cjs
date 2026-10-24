// Real browser IndexedDB: migration, atomic deduplication, limits and concurrent discard/drain.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const projects=path.resolve(__dirname,'../../..'),app=projects+'/digitalmaktab-spa/node_modules',core=projects+'/digitalmaktab-spa-core',webpack=require(app+'/webpack');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'dm-attendance-queue-')),chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if(!fs.existsSync(chrome))throw new Error('Set MODAL_TEST_CHROME to a headless Chrome executable');
fs.writeFileSync(work+'/entry.ts',`
import {openDB} from 'idb';
import {enqueueOffline,listOffline,removeOffline,bumpRetries,drainOffline,countOffline,OFFLINE_QUEUE_CHANGED} from ${JSON.stringify(core+'/src/cache/offlineQueue.ts')};
const check=(condition,message)=>{if(!condition)throw new Error(message)};
(async()=>{
 const legacy=await openDB('offline-queue',1,{upgrade(db){db.createObjectStore('writes',{keyPath:'id',autoIncrement:true})}});
 await legacy.add('writes',{kind:'legacy',payload:{date:'2026-04-01'},createdAt:1,retries:0});
 check(await enqueueOffline('blocked',{a:1},'blocked-request')===null,'Blocked upgrade did not return a bounded failure');legacy.close();
 let changes=0;window.addEventListener(OFFLINE_QUEUE_CHANGED,()=>changes++);
 const command={date:'2026-04-01',values:[true,false]};
 for(let attempt=0;await enqueueOffline('actor-A',command,'request-one')===null;attempt++){check(attempt<100,'Blocked open did not recover');await new Promise(resolve=>setTimeout(resolve,25));}
 const ids=await Promise.all(Array.from({length:16},()=>enqueueOffline('actor-A',command,'request-one')));
 check(ids.every(id=>id===ids[0]&&id!==null),'Duplicate request allocated multiple rows');check(await countOffline('actor-A')===1,'Duplicate count');
 check(await enqueueOffline('actor-A',{...command,values:[false]},'request-one')===null,'Changed intent reused');
 const other=await enqueueOffline('actor-B',command,'request-one');check(other!==null&&other!==ids[0],'Actor scopes collide');
 check(!await removeOffline(other,'actor-A'),'Cross-scope discard');check(await countOffline('actor-B')===1,'Cross-scope delete changed data');
 check((await listOffline('legacy')).length===1,'Upgrade lost legacy draft');
 let calls=0;const stopped=await drainOffline('actor-A',async()=>{calls++;return false});check(calls===1&&stopped.failed===1,'Failure drain did not stop');
 const next=await enqueueOffline('actor-A',{next:true},'request-two');
 const drained=await drainOffline('actor-A',async()=>{await removeOffline(next,'actor-A');return true});check(drained.flushed===1,'Discarded later row was sent');check(await countOffline('actor-A')===0,'Drain left rows');
 await Promise.all([bumpRetries(other),removeOffline(other,'actor-B')]);check(await countOffline('actor-B')===0,'Retry resurrected discarded draft');
 check(await enqueueOffline('large',{value:'x'.repeat(131073)},'oversized')===null,'Payload bound missing');
 for(let i=0;i<100;i++)check(await enqueueOffline('limit',{i},'id-'+i)!==null,'Premature kind cap');
 check(await enqueueOffline('limit',{i:100},'overflow')===null,'Kind cap missing');
 let added=0;
 for(let kind=0;kind<10;kind++)for(let i=0;i<100;i++)if(await enqueueOffline('limit-'+kind,{i},'id-'+i)!==null)added++;
 check((await listOffline()).length===1000,'Global cap missing');check(added===899,'Global cap accounting');check(changes>100,'Queue change events missing');
 window.queueResult={ok:true,rows:(await listOffline()).length,changes};
})().catch(error=>window.queueResult={ok:false,error:String(error.stack||error)});
`);
const config={mode:'development',entry:work+'/entry.ts',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.js'],modules:[app,core+'/node_modules','node_modules']},module:{rules:[{test:/\.ts$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-typescript']]}}}]}};
webpack(config,async(error,stats)=>{
 let browser,socket,passed=false;
 try{
  if(error)throw error;assert(!stats.hasErrors(),stats.toString({all:false,errors:true}));fs.writeFileSync(work+'/index.html','<!doctype html><html><body><script src="bundle.js"></script></body></html>');
  browser=spawn(chrome,['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe'],detached:true});browser.stderr.pipe(fs.createWriteStream(work+'/chrome.log'));
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));for(let i=0;!fs.existsSync(work+'/profile/DevToolsActivePort');i++){assert(i<100,'Chrome did not start');await wait(100)}
  const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0],version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result)}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}))});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);await send('Page.navigate',{url:'file://'+work+'/index.html'},sessionId);
  let result;for(let i=0;i<300;i++){const response=await send('Runtime.evaluate',{expression:'window.queueResult',returnByValue:true},sessionId);result=response.result.value;if(result)break;await wait(100)}
  assert(result?.ok,result?.error||'Queue test timed out');console.log('PASS: real IndexedDB legacy upgrade, atomic same-intent deduplication, payload/per-account/global caps, actor isolation, failed-drain ordering, canceled later rows, no retry resurrection and change notifications. '+JSON.stringify(result));passed=true;
 }catch(error){console.error(error);process.exitCode=1;console.error('Failure artifacts: '+work)}finally{
  if(socket?.readyState===WebSocket.OPEN){try{socket.send(JSON.stringify({id:999999,method:'Browser.close'}));}catch{}}
  socket?.close();
  if(browser&&browser.exitCode===null){const exited=new Promise(resolve=>browser.once('exit',resolve));try{process.kill(-browser.pid,'SIGTERM');}catch{}await Promise.race([exited,new Promise(resolve=>setTimeout(resolve,5000))]);if(browser.exitCode===null&&browser.signalCode===null){try{process.kill(-browser.pid,'SIGKILL');}catch{}await exited;}}
  let groupExited=!browser;
  for(let i=0;browser&&i<50;i++){
   try{process.kill(-browser.pid,0);}catch(error){if(error.code==='ESRCH'){groupExited=true;break;}throw error;}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(passed&&groupExited)fs.rmSync(work,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  else if(passed){process.exitCode=1;console.error('Owned browser group still active; retained artifacts: '+work);}
 }
});
