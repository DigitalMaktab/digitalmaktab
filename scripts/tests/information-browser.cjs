// Run against a local development SPA/API with an existing test school. Credentials stay in environment variables.
const fs=require('fs'),os=require('os'),path=require('path'),{spawn}=require('child_process');
(async()=>{if(!process.env.LOGIN_TEST_EMAIL||!process.env.LOGIN_TEST_PASSWORD)throw Error('Set LOGIN_TEST_EMAIL and LOGIN_TEST_PASSWORD for a local test account.');const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-login-'));const browser=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr.pipe(fs.createWriteStream(work+'/chrome.log'));const sleep=ms=>new Promise(r=>setTimeout(r,ms));let socket;
try{
for(let i=0;!fs.existsSync(work+'/profile/DevToolsActivePort');i++){if(i>100)throw Error('Chrome startup timeout');await sleep(100)}
const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0],version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});let id=0;const pending=new Map();socket.onmessage=e=>{const m=JSON.parse(e.data);if(pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result)}};
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params,sessionId}))});const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false},sessionId);const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value};
const origin=process.env.LOGIN_TEST_ORIGIN||'http://localhost:3000';await send('Page.navigate',{url:origin+'/login'},sessionId);
for(let i=0;i<150;i++){if(await evaluate('!!document.querySelector("#email")'))break;if(i===149)throw Error('Login did not render');await sleep(100)}
await evaluate(`(()=>{for(const [id,value] of ${JSON.stringify([['email',process.env.LOGIN_TEST_EMAIL],['password',process.env.LOGIN_TEST_PASSWORD]])}){const node=document.getElementById(id);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}})()`);await sleep(200);await evaluate('document.querySelector("form").requestSubmit()');
for(let i=0;i<100;i++){if(await evaluate('!!localStorage.getItem("user")'))break;await sleep(100)}await sleep(1500);
const country=process.env.LOGIN_TEST_COUNTRY||'AT';
if(country==='AF')await evaluate(`(()=>{const user=JSON.parse(localStorage.getItem('user'));user.school.preferredLanguageCode='fa-AF';localStorage.setItem('user',JSON.stringify(user));localStorage.setItem('i18nextLng','fa-AF')})()`);
await send('Page.navigate',{url:origin+'/privacy-policy'},sessionId);
for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector(".app-information-page article")'))break;if(i===99)throw Error('Privacy did not render');await sleep(100)}
for(const theme of ['light','dark']){
 await evaluate(`document.documentElement.setAttribute('data-theme','${theme}');document.documentElement.setAttribute('data-bs-theme','${theme}')`);await sleep(750);
 const colors=await evaluate(`(()=>{const card=document.querySelector('.app-information-page'),p=card.querySelector('section p');return {background:getComputedStyle(card).backgroundColor,text:getComputedStyle(p).color,sections:card.querySelectorAll('section').length,dir:card.querySelector('article').dir,body:card.innerText}})()`);
 const rgb=value=>value.match(/[\d.]+/g).slice(0,3).map(Number),luminance=value=>rgb(value).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const alpha=colors.text.startsWith('rgba')?Number(colors.text.match(/[\d.]+/g)[3]):1,composite=rgb(colors.text).map((v,i)=>v*alpha+rgb(colors.background)[i]*(1-alpha));
 const bg=luminance(colors.background),fg=luminance('rgb('+composite.join(',')+')'),contrast=(Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
 if(contrast<4.5||theme==='dark'&&bg>.2||theme==='light'&&bg<.8)throw Error('Theme contrast failed '+JSON.stringify({theme,...colors,contrast}));
 if(country==='AF'&&colors.dir!=='rtl')throw Error('Dari direction missing');
 if(country==='AT'&&/Tazkira|Asas|تذکره/.test(colors.body))throw Error('Inactive country leaked into privacy');
 const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false},sessionId);fs.writeFileSync(work+'/'+country+'-privacy-'+theme+'.png',Buffer.from(screenshot.data,'base64'));

 console.log(JSON.stringify({country,theme,background:colors.background,text:colors.text,contrast,dir:colors.dir,sections:colors.sections}));
}
for(const route of ['guide','faq','terms-of-service','about','resources']){
 await send('Page.navigate',{url:origin+'/'+route},sessionId);
 for(let i=0;i<100;i++){if(await evaluate('!!document.querySelector(".app-information-page article section p")'))break;if(i===99)throw Error(route+' is empty');await sleep(100)}
 const state=await evaluate(`({path:location.pathname,links:Array.from(document.querySelectorAll('.app-information-page a')).map(a=>a.href),text:document.querySelector('.app-information-page').innerText})`);
 if(state.path!== '/'+route||state.text.includes('information.content.'))throw Error('Broken information route '+route);
 if(country==='AT'&&state.links.some(link=>link.includes('afghanistan/')||link.includes('moe.gov.af')))throw Error('AF links leaked into AT');
 if(country==='AF'&&state.links.some(link=>link.includes('dsb.gv.at')))throw Error('AT links leaked into AF');
}
await evaluate(`document.querySelector('.sidebar-footer button[aria-controls]').click()`);await sleep(100);
const menu=await evaluate(`Array.from(document.querySelectorAll('.vertical-menu a')).map(a=>({label:a.textContent.trim(),path:a.getAttribute('href')}))`);
if(menu.length!==11||new Set(menu.map(item=>item.path)).size!==11)throw Error('Incomplete footer menu '+JSON.stringify(menu));
const widths=await evaluate(`(()=>{const selectors=['aside.page-sidebar','.sidebar-footer-container','.sidebar-footer','.vertical-menu'];return Object.fromEntries(selectors.map(selector=>[selector,document.querySelector(selector).getBoundingClientRect().width]))})()`);
for(const [selector,width] of Object.entries(widths))if(Math.abs(width-widths['aside.page-sidebar'])>1)throw Error('Footer width differs from sidebar: '+JSON.stringify(widths));
console.log('PASS: icons and information menu match sidebar width: '+JSON.stringify(widths));

console.log('PASS: real '+country+' login, Privacy Policy light/dark contrast, country isolation, complete information routes and eleven footer links. Screenshots: '+work);
}catch(e){console.error(e);process.exitCode=1}finally{socket?.close();browser.kill('SIGTERM')}})();
