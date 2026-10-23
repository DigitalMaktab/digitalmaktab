// Actual Core hooks/auth/API modules with controllable HTTP and SignalR transports.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const connections=[];let nextStart;
class Connection {
 constructor(options){this.options=options;this.handlers={};this.invocations=[];this.state='Disconnected';this.starts=0;this.stops=0;this.startGate=nextStart;nextStart=undefined;connections.push(this);}
 on(name,callback){this.handlers[name]=callback;}onreconnected(callback){this.reconnected=callback;}
 async start(){this.starts++;this.state='Connecting';if(this.startGate)await this.startGate.promise;this.state='Connected';}
 async invoke(name,...args){this.invocations.push({name,args});}async stop(){this.stops++;this.state='Disconnected';}
 emit(name,payload){this.handlers[name]?.(payload);}
}
class Builder {withUrl(url,options){this.options=options;return this;}withAutomaticReconnect(policy){this.policy=policy;return this;}build(){return new Connection(this.options);}}
const original=Module._load;Module._load=function(request,parent,isMain){if(request==='@microsoft/signalr')return{HubConnectionBuilder:Builder,HttpTransportType:{WebSockets:1},HubConnectionState:{Connected:'Connected'}};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,waitFor,act,cleanup,fireEvent}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const get=file=>require(core+'/src/'+file),apiModule=get('api/client.ts'),api=apiModule.default,originalGet=api.get,originalPut=api.put,originalDelete=api.delete;
const useNotifications=get('hooks/useNotifications.ts').default,useMessages=get('hooks/useMessageStream.ts').default,{AuthContext,AuthProvider}=get('helper/auth/AuthProvider.tsx'),helper=get('helper/helper.ts');
const row=id=>({id,title:id,body:id,notificationType:0,isRead:false});
const data=new Map();let requests=[],writes=[],readGate,writeGate,live,lastOne,lastTwo,received=[];
api.get=async(url,config)=>{const request={url,config};requests.push(request);if(url==='/notification'&&readGate){request.gate=readGate;const gate=readGate;readGate=undefined;await gate.promise;}const model=data.get(config?.accountToken)??{items:[],unread:0};return{data:url==='/notification'?model.items:{count:model.unread},headers:url==='/notification'?{'x-notification-unread-count':String(model.unread)}:{}};};
api.put=async(url,body,config)=>{writes.push({url,body,config});if(writeGate){const gate=writeGate;writeGate=undefined;await gate.promise;}return{data:{count:1}};};api.delete=async(url,config)=>{writes.push({url,config});return{data:{count:1}};};
const notices=[];class Native {static permission='granted';constructor(title){this.title=title;this.closed=false;notices.push(this);}close(){this.closed=true;}}window.Notification=Native;Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});
function Probe(){lastOne=useNotifications();lastTwo=useNotifications({pageSize:10});useMessages(message=>received.push(message));return h('output',null,JSON.stringify({items:lastOne.items.map(x=>x.id),unread:lastOne.unread}));}
const parent=()=>h(I18nextProvider,{i18n},h(AuthContext.Provider,{value:{user:live}},h(Probe)));
const tick=async(ms=110)=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,ms));});
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:{}},'fa-AF':{translation:{}},'ps-AF':{translation:{}}},interpolation:{escapeValue:false}});
 helper.removeUser();apiModule.configureApiClient({apiUrl:'http://fixture/api/',signalRUrl:'http://fixture/'});
 const a={role:4,token:'a1',student:{id:'same-id',schoolId:'one'}},b={role:3,token:'b1',teacher:{id:'same-id',schoolId:'one'}};
 live=a;data.set('a1',{items:[row('a')],unread:1});data.set('a2',{items:[row('a')],unread:1});data.set('b1',{items:[row('b')],unread:7});
 let ui=render(parent());await waitFor(()=>assert.equal(lastOne.items[0]?.id,'a'));await waitFor(()=>assert.equal(connections.length,1));await waitFor(()=>assert(connections[0].invocations.some(x=>x.name==='Subscribe')));await tick();
 assert.equal(lastOne.unread,1);assert.equal(requests.filter(r=>r.url.includes('unread-count')).length,0);assert.equal(connections.length,1,'inbox/bell/message consumers share one connection');
 const connection=connections[0],baseline=requests.length;live={...a,student:{...a.student,lastName:'metadata'}};ui.rerender(parent());await tick();assert.equal(requests.length,baseline);assert.equal(connections.length,1);
 live={...a,token:'a2'};ui.rerender(parent());await waitFor(()=>assert.equal(lastOne.items[0]?.id,'a'));await tick();assert.equal(connections.length,1);assert.equal(connection.options.accessTokenFactory(),'a2');
 data.set('a2',{items:[row('new'),row('a')],unread:2});const beforeBurst=requests.length;
 await act(async()=>{for(let i=0;i<25;i++)connection.emit('ReceiveNotification',row('new'));});await tick();await waitFor(()=>assert.equal(lastOne.unread,2));assert.equal(requests.length-beforeBurst,2,'one coalesced refresh per consumer');assert.equal(notices.length,1,'one native notice across both inbox consumers');
 connection.emit('ReceiveMessage',{id:'m',body:'message'});connection.emit('ReceiveMessage',{id:'m',body:'message'});assert.equal(received.length,1);
 const joined=connection.invocations.length;await act(async()=>connection.reconnected());await tick();assert.equal(connection.invocations.length,joined+1);
 readGate=defer();const oldRead=readGate;await act(async()=>{void lastOne.refresh();});await waitFor(()=>assert(requests.at(-1).gate));const canceledRead=requests.at(-1);
 writeGate=defer();const oldWrite=writeGate;const heldRead=lastOne.markAsRead;let mutation;await act(async()=>{mutation=lastOne.markAsRead('a');});await waitFor(()=>assert.equal(writes.length,1));assert.equal(lastOne.markAsRead('a'),mutation,'duplicate pending markers share one write');
 live=b;ui.rerender(parent());await waitFor(()=>assert.equal(lastOne.items[0]?.id,'b'));await waitFor(()=>assert.equal(connections.length,2));await waitFor(()=>assert(connection.stops>0));await tick();assert(canceledRead.config.signal.aborted);assert(notices.every(n=>n.closed));
 const afterSwitch=requests.length;connection.emit('ReceiveNotification',row('PRIVATE OLD ACCOUNT'));connection.emit('ReceiveMessage',{id:'PRIVATE'});await act(async()=>{oldRead.resolve();oldWrite.resolve();await mutation;});await tick();assert.equal(lastOne.items[0]?.id,'b');assert.equal(lastOne.unread,7);assert.equal(requests.length,afterSwitch);assert.equal(received.length,1);assert.equal(notices.length,1);assert.equal(writes[0].config.accountToken,'a2');await heldRead('old');assert.equal(writes.length,1);
 nextStart=defer();const oldStart=nextStart;live={role:6,token:'c1',parent:{id:'same-id',schoolId:'two'}};ui.rerender(parent());await waitFor(()=>assert.equal(connections.length,3));await tick(5);const abandoned=connections[2];live={role:0,token:'d1',school:{id:'four'}};ui.rerender(parent());await waitFor(()=>assert.equal(connections.length,4));await act(async()=>oldStart.resolve());await waitFor(()=>assert.equal(abandoned.state,'Disconnected'));assert.equal(abandoned.invocations.length,0);cleanup();
 // The real auth boundary clears every child draft only on immutable account changes.
 let auth;function Draft(){auth=React.useContext(AuthContext);return h('input',{'aria-label':'Draft',defaultValue:''});}
 ui=render(h(I18nextProvider,{i18n},h(AuthProvider,null,h(Draft))));await act(async()=>auth.login(a));fireEvent.change(ui.getByLabelText('Draft'),{target:{value:'half filled'}});await act(async()=>auth.login({...a,token:'renewed'}));assert.equal(ui.getByLabelText('Draft').value,'half filled');await act(async()=>auth.login(b));assert.equal(ui.getByLabelText('Draft').value,'');cleanup();helper.removeUser();
 // Actual Axios interception must honor a caller's captured token after a switch.
 api.get=originalGet;api.put=originalPut;api.delete=originalDelete;let captured;
 api.defaults.adapter=async config=>{captured=config;return{status:200,statusText:'OK',headers:{},config,data:{}};};
 const notification=get('api/notification.ts').default;const oldRequest=notification.markAsRead('one',{token:'original-account'});helper.saveUser(b);await oldRequest;assert.equal(captured.headers.Authorization,'Bearer original-account');assert.equal(captured.headers['Cache-Control'],'no-store');
 // Rejected old-account tokens must not clear a newer login; a current 401 does.
 ui=render(h(I18nextProvider,{i18n},h(AuthProvider,null,h(Draft))));await act(async()=>auth.login(b));
 api.defaults.adapter=async config=>{throw{config,response:{status:401,config}};};
 await act(async()=>{await assert.rejects(notification.markAsRead('old',{token:'original-account'}));});assert.equal(auth.user.token,'b1');assert.equal(helper.getUser().token,'b1');
 await act(async()=>{await assert.rejects(notification.markAsRead('current',{token:'b1'}));});assert.equal(auth.user,null);assert.equal(auth.isAuthenticated,false);assert.equal(helper.getUser(),null);
 await act(async()=>auth.login(b));await act(async()=>{await assert.rejects(api.post('/auth',{email:'wrong',password:'wrong'}));});assert.equal(auth.user.token,'b1');cleanup();
 // Push SDK callbacks pin their accepted login and keep long tokens out of URLs.
 const push=get('api/push.ts').default;api.defaults.adapter=async config=>{captured=config;return{status:200,statusText:'OK',headers:{},config,data:{}};};
 helper.saveUser(a);const longToken='x'.repeat(8000),unregister=push.unregisterDevice(longToken);helper.saveUser(b);await unregister;
 assert.equal(captured.headers.Authorization,'Bearer a1');assert.equal(captured.params,undefined);assert.equal(JSON.parse(captured.data).token,longToken);
 const registration=push.registerDevice(0,'physical-token',{token:'captured-login'});helper.saveUser(a);await registration;assert.equal(captured.headers.Authorization,'Bearer captured-login');
 helper.removeUser();console.log('Notification scope/lifecycle: shared connection, coalesced reads, deduplication, reconnect, cancellation, token renewal, pinned writes, stale guards and draft isolation passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
