const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../../..', 'digitalmaktab-spa-core');
const ts = require(path.join(root, 'node_modules/typescript'));
const load = Module._load, extension = Module._extensions['.ts'];
const created = [];
class Connection {
  constructor(url, options) { this.url=url;this.options=options;this.calls=[];this.events=new Map();this.stops=0; }
  async stop(){this.stops++;}
  async invoke(method,...args){this.calls.push({method,args});if(this.wait)return this.wait;if(this.fail)throw new Error(this.fail);return 'accepted';}
  on(name,callback){this.events.set(name.toLowerCase(),callback);}
  off(name,callback){this.events.delete(name.toLowerCase());}
  onclose(callback){this.closed=callback;}
  onreconnecting(callback){this.reconnecting=callback;}
  onreconnected(callback){this.reconnected=callback;}
}
class Builder {
  withUrl(url, options){this.url=url;this.options=options;return this;}
  withAutomaticReconnect(){return this;}
  build(){const c=new Connection(this.url,this.options);created.push(c);return c;}
}
Module._extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
Module._load=function(request,parent,main){if(request==='@microsoft/signalr')return{HubConnectionBuilder:Builder,HttpTransportType:{WebSockets:1}};return load.call(this,request,parent,main);};
const {createClassroomConnection,observeClassroomSession}=require(path.join(root,'src/helper/classroom/connection.ts'));
(async()=>{
  for(const language of ['en-US','fa-AF','ps-AF']){
    let user={role:4,token:'first',student:{id:'same-guid',schoolId:'school-a'}};
    const errors=[],events=[];
    const connection=createClassroomConnection('http://fixture/classhub',language,()=>user,message=>errors.push(message),'localized fallback');
    const native=created.at(-1);
    assert.equal(native.options.accessTokenFactory(),'first');assert.equal(new URL(native.url).searchParams.get('culture'),language);
    user={...user,token:'renewed'};assert.equal(native.options.accessTokenFactory(),'renewed');
    connection.on('ChatMessage',message=>events.push(message));native.events.get('chatmessage')('valid');assert.deepEqual(events,['valid']);
    const removed=()=>events.push('removed');connection.on('Removed',removed);connection.off('Removed',removed);assert.equal(native.events.has('removed'),false);
    native.fail='localized content limit';await assert.rejects(connection.invoke('SendChatMessage','room','draft'),/localized content limit/);
    assert.deepEqual(errors,['localized content limit']);assert.equal(native.calls.length,1,'no automatic mutation retry');native.fail=undefined;
    assert.equal(await connection.invoke('SetMic','room',true),'accepted');
    user={role:3,token:'teacher-token',teacher:{id:'same-guid',schoolId:'school-a'}};
    native.events.get('chatmessage')('wrong role');assert.deepEqual(events,['valid']);assert.equal(native.options.accessTokenFactory(),'');
    await assert.rejects(connection.invoke('SendChatMessage','room','wrong identity'),/localized fallback/);assert.equal(native.calls.length,2);
    await Promise.all([connection.stop(),connection.stop()]);assert.equal(native.stops,1);
  }
  let user={role:4,token:'a',student:{id:'id',schoolId:'school-a'}};
  const errors=[];const c=createClassroomConnection('http://fixture/classhub?x=1','en-US',()=>user,e=>errors.push(e),'fallback');const native=created.at(-1);
  let reject;native.wait=new Promise((resolve,no)=>{reject=no;});const pending=c.invoke('SendChatMessage','room','pending');
  user={...user,token:'b',student:{id:'id',schoolId:'school-b'}};
  reject(new Error('late old-account error'));await assert.rejects(pending,/late old-account error/);assert.deepEqual(errors,[]);assert.equal(native.stops,1);
  const jwt=payload=>'header.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.signature';
  for(const change of ['stamp','actor']){
    let stopped=0;let live={role:4,token:jwt({staff_security_stamp:'one',exp:1}),student:{id:'id',schoolId:'school'}};
    const connection=createClassroomConnection('http://fixture/classhub','en-US',()=>live,()=>{},'fallback',()=>stopped++);
    const underlying=created.at(-1);
    live={...live,token:jwt({staff_security_stamp:'one',exp:2})};assert.equal(underlying.options.accessTokenFactory(),live.token);
    live={...live,token:jwt(change==='stamp'?{staff_security_stamp:'two'}:{staff_security_stamp:'one',imp_by:'root',imp_security_stamp:'root-stamp'})};
    assert.equal(underlying.options.accessTokenFactory(),'');assert.equal(stopped,1);assert.equal(underlying.stops,1);
  }
  let changes=0;const scopedUser={role:4,token:'scope-token',student:{id:'id',schoolId:'school'}};
  const scoped=createClassroomConnection('http://fixture/classhub','en-US',()=>scopedUser,()=>{},'fallback');const scopeNative=created.at(-1);
  const detach=observeClassroomSession(scoped,()=>changes++);const session=scopeNative.events.get('classroomsession');
  session({sessionId:'first',roomId:'main'});session({sessionId:'first',roomId:'main'});assert.equal(changes,0);
  session({sessionId:'first',roomId:'child'});assert.equal(changes,1);session({sessionId:'new',roomId:'child'});assert.equal(changes,2);
  session({sessionId:null,roomId:'main'});assert.equal(changes,2);detach();assert.equal(scopeNative.events.has('classroomsession'),false);await scoped.stop();
  assert.throws(()=>createClassroomConnection('http://fixture/classhub','en-US',()=>null,()=>{},'fallback'),/fallback/);
  console.log('classroom connection: authenticated renewal, identity isolation, visible errors, no mutation retries and idempotent disposal passed in all locales');
})().finally(()=>{Module._load=load;if(extension)Module._extensions['.ts']=extension;else delete Module._extensions['.ts'];}).catch(error=>{console.error(error);process.exitCode=1;});
