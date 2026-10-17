// Run against a local development SPA/API with an existing test school. Credentials stay in environment variables.
const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
(async()=>{if(!process.env.LOGIN_TEST_EMAIL||!process.env.LOGIN_TEST_PASSWORD)throw Error('Set LOGIN_TEST_EMAIL and LOGIN_TEST_PASSWORD for a local test account.');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-login-'));const browser=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr.pipe(fs.createWriteStream(work+'/chrome.log'));const sleep=ms=>new Promise(r=>setTimeout(r,ms));let socket;
try{
for(let i=0;!fs.existsSync(work+'/profile/DevToolsActivePort');i++){if(i>100)throw Error('Chrome startup timeout');await sleep(100)}
const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0],version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)}};
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params,sessionId}))});const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
const origin=process.env.LOGIN_TEST_ORIGIN||'http://localhost:3000';await send('Page.navigate',{url:origin+'/login'},sessionId);
for(let i=0;i<150;i++){if(await evaluate('!!document.querySelector("#email")'))break;if(i===149)throw Error('Login did not render');await sleep(100)}
await evaluate(`(()=>{for(const [id,value] of ${JSON.stringify([['email',process.env.LOGIN_TEST_EMAIL],['password',process.env.LOGIN_TEST_PASSWORD]])}){const node=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}})()`);await sleep(200);await evaluate('document.querySelector("form").requestSubmit()');
for(let i=0;i<100;i++){if(await evaluate('!!localStorage.getItem("user")'))break;await sleep(100)}await sleep(1500);
const routes=await evaluate(`Array.from(new Set(Array.from(document.querySelectorAll('aside a')).map(a=>a.getAttribute('href')).filter(path=>path&&path.startsWith('/')&&!path.includes('#')&&!path.includes('logout')&&!path.includes('login'))))`);
const events=[];const previousMessage=socket.onmessage;socket.onmessage=e=>{const message=JSON.parse(e.data);if(message.method==='Network.responseReceived'&&message.sessionId===sessionId&&message.params.response.url.includes('/api/'))events.push({url:message.params.response.url,status:message.params.response.status});previousMessage(e)};await send('Network.enable',{},sessionId);
const results=[];
for(const route of routes.filter(route=>!process.env.AUDIT_ROUTES||process.env.AUDIT_ROUTES.split(',').includes(route))){
 const start=events.length;await send('Page.navigate',{url:origin+route},sessionId);
 await sleep(2000);
 const idleStart=events.length;await sleep(2000);
 const state=await evaluate(`({path:location.pathname,tables:document.querySelectorAll('table').length,forms:document.querySelectorAll('form').length,body:document.body.innerText.slice(-700),errorBoundary:!!document.querySelector('.error-page')})`);
 const requests=events.slice(start),counts={};for(const request of events.slice(idleStart)){const key=request.url;counts[key]=(counts[key]||0)+1}
 const looping=Object.entries(counts).filter(([url,count])=>count>1&&!url.includes('notificationhub'));
 const failures=requests.filter(request=>request.status>=400);
 const result={route,path:state.path,tables:state.tables,forms:state.forms,requests:requests.length,looping,failures,errorBoundary:state.errorBoundary,redirected:state.path!==route};results.push(result);console.log(JSON.stringify(result));
}
fs.writeFileSync(process.env.AUDIT_BROWSER_OUTPUT||work+'/routes.json',JSON.stringify(results,null,2));
if(results.some(result=>result.looping.length||result.errorBoundary||result.redirected))throw Error('A route redirected, rendered an error or repeated API requests during idle');
console.log('PASS: '+results.length+' sidebar routes rendered without an error boundary or continuous idle requests. HTTP failures remain explicitly listed for investigation.');
}catch(e){console.error(e);process.exitCode=1}finally{socket?.close();browser.kill('SIGTERM')}})();
