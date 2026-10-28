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
  async invoke(method,...args){this.calls.push({method,args});if(this.wait)return this.wait;if(this.fail)throw new Error(this.fail);if(this.bootstrap&&method==='JoinClass'&&this.result?.joined)this.events.get('classroomevent')(this.result.scope,'ClassroomSession',[this.result.scope]);return this.result ?? 'accepted';}
  on(name,callback){this.events.set(name.toLowerCase(),callback);}
  off(name,callback){this.events.delete(name.toLowerCase());}
  onclose(callback){this.closed=callback;}
  onreconnecting(callback){(this.reconnectingCallbacks??=[]).push(callback);this.reconnecting=(error)=>this.reconnectingCallbacks.forEach(handler=>handler(error));}
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
  for(const language of ['en-US','fa-AF','ps-AF']){
    const current={role:4,token:'shared',student:{id:'id',schoolId:'school'}};
    const faults=[],received=[];let reset=0,inactive=0;
    const c=createClassroomConnection('http://fixture/classhub',language,()=>current,e=>faults.push(e),'fallback',()=>inactive++);
    const n=created.at(-1),epoch='11111111-1111-1111-1111-111111111111',other='22222222-2222-2222-2222-222222222222';
    const scope=(roomId,revision,sessionId=epoch)=>({roomId,revision,sessionId});
    const ack=(value,joined=true,events=1)=>({classroomProtocol:1,joined,scope:value,events});
    const emit=(value,name,...args)=>n.events.get('classroomevent')(value,name,args);
    observeClassroomSession(c,()=>{reset++;received.push('reset');});
    c.on('ChatMessage',message=>received.push(message));
    c.on('ExistingUsers',()=>received.push('bootstrap'));
    let finish;n.wait=new Promise(resolve=>finish=resolve);
    const initial=c.invoke('JoinClass','A','Pupil','ATTENDEE');
    await assert.rejects(c.invoke('JoinClass','B','Pupil','ATTENDEE'),/fallback/);assert.equal(n.calls.length,1,'only one in-flight join');
    emit(scope('A',9),'ChatMessage','old-before-ack');
    emit(scope('A',10),'ClassroomSession',{sessionId:epoch,roomId:'A'});
    emit(scope('A',10),'ExistingUsers',[]);emit(scope('A',10),'ChatMessage','current');
    assert.deepEqual(received,[],'bootstrap waits for authoritative completion');
    finish(ack(scope('A',10),true,3));await initial;n.wait=undefined;n.bootstrap=true;
    assert.deepEqual(received,['bootstrap','current']);assert.equal(reset,0,'first join has no prior content');
    emit(scope('A',9),'ClassroomSession',{sessionId:other,roomId:'A'});
    emit(scope('A',9),'ChatMessage','old');emit(scope('B',100),'ChatMessage','other room');emit(scope('A',11,other),'ChatMessage','other epoch');
    n.events.get('chatmessage')('unguarded legacy event');assert.deepEqual(received,['bootstrap','current']);
    n.result=ack(scope('B',2));await c.invoke('JoinClass','B','Pupil','ATTENDEE');
    n.result=ack(scope('A',14));await c.invoke('JoinClass','A','Pupil','ATTENDEE');assert.equal(reset,2);
    emit(scope('A',11),'ChatMessage','late A after A-B-A');emit(scope('A',14),'ChatMessage','fresh A');assert.equal(received.at(-1),'fresh A');
    n.result=ack(scope('A',15));await c.invoke('JoinClass','A','Pupil','ATTENDEE');assert.equal(reset,3,'same-room resync resets before bootstrap');
    n.result=ack(scope('A',16),false);await c.invoke('JoinClass','B','Pupil','ATTENDEE');assert.equal(reset,3,'rejected target cannot clear the retained old room');
    let oldDone;n.wait=new Promise(resolve=>oldDone=resolve);const old=c.invoke('JoinClass','A','Pupil','ATTENDEE');
    n.reconnecting();emit(scope('A',999),'ChatMessage','reconnecting');
    n.wait=undefined;n.result=ack(scope('A',20));await c.invoke('JoinClass','A','Pupil','ATTENDEE');
    oldDone(ack(scope('A',16)));await assert.rejects(old,/fallback/);assert.deepEqual(faults,[],'late completion cannot change/reject the new transport');
    emit(scope('A',19),'ChatMessage','late old transport');emit(scope('A',20),'ChatMessage','reconnected');assert.equal(received.at(-1),'reconnected');
    const before=n.calls.length;n.fail='join acknowledgement lost';await assert.rejects(c.invoke('JoinClass','B','Pupil','ATTENDEE'),/lost/);
    assert.equal(n.calls.length,before+1,'unknown join outcome is never replayed');assert.equal(n.stops,1);assert.equal(inactive,1);
  }
  {
    const current={role:4,token:'delayed-bootstrap',student:{id:'id',schoolId:'school'}};
    const c=createClassroomConnection('http://fixture/classhub','en-US',()=>current,()=>{},'fallback');const n=created.at(-1);
    const scope={roomId:'A',sessionId:'11111111-1111-1111-1111-111111111111',revision:1};
    n.result={classroomProtocol:1,joined:true,scope,events:2};let completed=false;
    const join=c.invoke('JoinClass','A','Pupil','ATTENDEE').then(()=>completed=true);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false,'completion can precede Redis delivery');
    n.events.get('classroomevent')(scope,'ClassroomSession',[scope]);
    await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false,'partial bootstrap stays hidden');
    n.events.get('classroomevent')(scope,'ExistingUsers',[[]]);await join;assert.equal(completed,true);await c.stop();
  }
  {
    const current={role:4,token:'missing-bootstrap',student:{id:'id',schoolId:'school'}};
    const faults=[];let inactive=0;const c=createClassroomConnection('http://fixture/classhub','en-US',()=>current,e=>faults.push(e),'fallback',()=>inactive++);const n=created.at(-1);
    n.result={classroomProtocol:1,joined:true,scope:{roomId:'A',sessionId:'11111111-1111-1111-1111-111111111111',revision:1},events:2};
    await assert.rejects(c.invoke('JoinClass','A','Pupil','ATTENDEE'),/fallback/);assert.equal(n.stops,1);assert.equal(inactive,1);assert.equal(n.calls.length,1);
  }
  {
    const current={role:4,token:'bounded',student:{id:'id',schoolId:'school'}};
    let inactive=0;const errors=[];const c=createClassroomConnection('http://fixture/classhub','en-US',()=>current,e=>errors.push(e),'fallback',()=>inactive++);const n=created.at(-1);
    let finish;n.wait=new Promise(resolve=>finish=resolve);const join=c.invoke('JoinClass','A','Pupil','ATTENDEE');
    const scope={roomId:'A',sessionId:'11111111-1111-1111-1111-111111111111',revision:1};
    for(let i=0;i<16385;i++)n.events.get('classroomevent')(scope,'ChatMessage',['bounded']);
    assert.equal(n.stops,1);assert.equal(inactive,1);assert.deepEqual(errors,['fallback']);
    finish({classroomProtocol:1,joined:true,scope});await assert.rejects(join,/fallback/);
  }
  assert.throws(()=>createClassroomConnection('http://fixture/classhub','en-US',()=>null,()=>{},'fallback'),/fallback/);
  console.log('classroom connection: identity, accepted bootstrap, epoch/revision and A-B-A fences, reconnect/late completion, bounded buffering, no mutation retries and disposal passed in all locales');
})().finally(()=>{Module._load=load;if(extension)Module._extensions['.ts']=extension;else delete Module._extensions['.ts'];}).catch(error=>{console.error(error);process.exitCode=1;});
