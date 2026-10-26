// Actual Core selector, Axios transport and paged reader under controlled session races.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.getComputedStyle=dom.window.getComputedStyle;global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;Module._load=function(request,parent,isMain){if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const get=file=>require(core+'/src/'+file).default,Select=get('components/input/AppAsyncSelect.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts');
const {getApiRequestOptions,withApiRequestOptions}=require(core+'/src/api/requestOptions.ts'),{readAllPages}=require(core+'/src/helper/readAllPages.ts');
const wrap=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,children));
const pause=ms=>act(async()=>new Promise(resolve=>setTimeout(resolve,ms)));
const task=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const staff=(id,token)=>({role:UserRole.STAFF,token,staff:{id,schoolId:'school'}});
(async()=>{
 const resources={'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}};
 for(const lang of ['fa-AF','ps-AF'])resources[lang]={translation:JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/'+lang+'/translation.json'))};await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const lang of Object.keys(resources)){
  await act(async()=>i18n.changeLanguage(lang));let account=staff('first','first-token'),calls=[],resolves=[],changes=[],paint=[];
  const load=async input=>{const next={...getApiRequestOptions(),input,...task()};calls.push(next);return next.promise};
  const resolve=async id=>{const next={...getApiRequestOptions(),id,...task()};resolves.push(next);return next.promise};
  function Scene({resource='one'}){React.useLayoutEffect(()=>{paint.push(document.body.textContent)});return h(AuthContext.Provider,{value:{user:account,userRole:account.role}},h(Select,{name:'teacher',label:'Teacher',value:'saved',onChange:value=>changes.push(value),optionsKey:resource,loadOptions:load,resolveOption:resolve}))}
  const ui=render(h(Scene),{wrapper:wrap});await waitFor(()=>assert.equal(calls.length,1));assert.equal(calls[0].token,'first-token');assert.equal(calls[0].silent,true);
  account=staff('first','renewed-token');ui.rerender(h(Scene));await waitFor(()=>assert.equal(calls.length,2));assert(calls[0].signal.aborted);assert.equal(calls[1].token,'renewed-token');
  await act(async()=>calls[1].resolve([{id:'saved',label:'Renewed private label'}]));await waitFor(()=>assert(ui.getByText('Renewed private label')));
  await act(async()=>calls[0].resolve([{id:'saved',label:'Obsolete token label'}]));assert(!ui.queryByText('Obsolete token label'));
  // Same token/role/school metadata still needs the immutable staff identity.
  account=staff('second','renewed-token');ui.rerender(h(Scene));assert(!paint.at(-1).includes('Renewed private label'),'old selected text hidden before passive cleanup');await waitFor(()=>assert.equal(calls.length,3));
  await act(async()=>calls[2].resolve([]));await waitFor(()=>assert.equal(resolves.length,1));assert.equal(resolves[0].token,'renewed-token');
  account=staff('third','third-token');ui.rerender(h(Scene));await waitFor(()=>assert.equal(calls.length,4));assert(resolves[0].signal.aborted);
  await act(async()=>resolves[0].resolve({id:'saved',label:'Old staff resolution'}));assert(!ui.queryByText('Old staff resolution'));
  await act(async()=>calls[3].resolve([{id:'saved',label:'Current private label'}]));await waitFor(()=>assert(ui.getByText('Current private label')));
  const input=ui.getByRole('combobox');fireEvent.change(input,{target:{value:'obsolete search'}});await pause(550);await waitFor(()=>assert.equal(calls.length,5));
  ui.rerender(h(Scene,{resource:'two'}));assert(!paint.at(-1).includes('Current private label'));await waitFor(()=>assert.equal(calls.length,6));assert(calls[4].signal.aborted);
  await act(async()=>calls[4].resolve([{id:'other',label:'Old resource result'}]));assert(!ui.queryByText('Old resource result'));
  await act(async()=>calls[5].resolve([{id:'saved',label:'New resource label'}]));await waitFor(()=>assert(ui.getByText('New resource label')));assert.equal(changes.length,0,'background hydration never changes the form value');
  const before=calls.length;ui.rerender(h(Scene,{resource:'two'}));await pause(20);assert.equal(calls.length,before,'inline callback identities settle');
  await act(async()=>i18n.changeLanguage(lang==='en-US'?'fa-AF':'en-US'));await waitFor(()=>assert.equal(calls.length,7));assert(!ui.queryByText('New resource label'));await act(async()=>calls[6].resolve([{id:'saved',label:'Current locale label'}]));await waitFor(()=>assert(ui.getByText('Current locale label')));cleanup();
 }
 // A bounded option memo preserves selection and re-resolves an evicted ID.
 let resolved=[];const many=Array.from({length:600},(_,id)=>({id:String(id),label:'Option '+id}));const props={name:'bounded',label:'Bounded',value:'0',onChange:()=>{},loadOptions:async()=>many,resolveOption:async id=>{resolved.push(id);return{id,label:'Resolved '+id}}};
 let ui=render(h(Select,props),{wrapper:wrap});await waitFor(()=>assert(ui.getByText('Option 0')));assert.equal(resolved.length,0);ui.rerender(h(Select,{...props,value:'1'}));await waitFor(()=>assert(ui.getByText('Resolved 1')));assert.deepEqual(resolved,['1']);cleanup();
 const {apiClient,configureApiClient}=require(core+'/src/api/client.ts'),{AxiosHeaders}=require(core+'/node_modules/axios/dist/node/axios.cjs');configureApiClient({apiUrl:'http://lookup.invalid/api'});
 let wire=[];apiClient.defaults.adapter=async config=>{wire.push(config);return{data:[],status:200,statusText:'OK',headers:{},config}};
 localStorage.setItem('user',JSON.stringify(staff('first','stored-first')));const originalHeaders=new AxiosHeaders({'X-Caller':'kept','Cache-Control':'max-age=60'});const abort=new AbortController();
 const pending=withApiRequestOptions({token:'captured-token',signal:abort.signal},()=>apiClient.get('/lookup-probe',{headers:originalHeaders}));localStorage.setItem('user',JSON.stringify(staff('second','stored-second')));await pending;
 assert.equal(wire[0].headers.Authorization,'Bearer captured-token');assert.equal(wire[0].accountToken,'captured-token');assert.equal(wire[0].headers['Cache-Control'],'no-store');assert.equal(wire[0].headers['X-Caller'],'kept');assert.equal(originalHeaders.get('Cache-Control'),'max-age=60');assert.equal(wire[0].signal,abort.signal);
 await withApiRequestOptions({token:'ambient'},()=>apiClient.get('/explicit',{accountToken:'explicit'}));assert.equal(wire.at(-1).headers.Authorization,'Bearer explicit');
 await withApiRequestOptions({token:'ambient'},()=>apiClient.get('/anonymous',{accountToken:''}));assert(!wire.at(-1).headers.Authorization);
 // Every page pins the original invocation credentials even across storage/token changes.
 wire=[];localStorage.setItem('user',JSON.stringify(staff('first','paged-first')));
 apiClient.defaults.adapter=async config=>{wire.push(config);localStorage.setItem('user',JSON.stringify(staff('second','paged-second')));return{data:[{id:config.params.pageNumber}],status:200,statusText:'OK',headers:{pagination:JSON.stringify({totalPages:3})},config}};
 const pages=await readAllPages(pagination=>apiClient.get('/paged',{params:pagination}),abort.signal);assert.deepEqual(pages.map(row=>row.id),[1,2,3]);assert.equal(wire.length,3);assert(wire.every(config=>config.accountToken==='paged-first'&&config.headers.Authorization==='Bearer paged-first'&&config.headers['Cache-Control']==='no-store'&&config.signal===abort.signal));
 let reads=0;await assert.rejects(()=>readAllPages(async()=>{reads++;return{status:200,data:[{}],headers:{pagination:'{"totalPages":201}'}}}));assert.equal(reads,1);
 await assert.rejects(()=>readAllPages(async()=>({status:200,data:Array.from({length:10001},()=>({})),headers:{pagination:'{"totalPages":1}'}})));
 let ambient=[];await withApiRequestOptions({token:'outer',silent:true},()=>readAllPages(async()=>{ambient.push({...getApiRequestOptions()});return{status:200,data:[{}],headers:{pagination:'{"totalPages":2}'}}}));assert.equal(ambient.length,2);assert(ambient.every(options=>options.token==='outer'&&options.silent===true));
 console.log('PASS: actual Core lookups isolate staff/token/resource scopes before effects, pin Axios and multi-page credentials, cancel old defaults/search/resolution, retain form IDs, bound option history and reject excessive pagination in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
