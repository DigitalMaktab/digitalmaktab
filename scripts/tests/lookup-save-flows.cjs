// Render the real assignment screen, AppTable and modal controls. The repository is in memory;
// backend database persistence is covered separately by the PostgreSQL suite.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.getComputedStyle=dom.window.getComputedStyle;global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;let exportsForScreen;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return exportsForScreen;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const get=p=>require(core+'/src/'+p).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const AsyncSelect=get('components/input/AppAsyncSelect.tsx');
const {getApiRequestOptions}=require(core+'/src/api/requestOptions.ts');
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}};
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(LoaderProvider,null,children)));
const pause=async ms=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,ms))});
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 let loads=[],resolutions=[],changes=[];
 const pendingSearches=new Map(),pendingResolutions=new Map();
 const loadOptions=async input=>{const signal=getApiRequestOptions()?.signal;loads.push({input,signal});if(!input)return [{id:'first',label:'First page option'}];const task=deferred();pendingSearches.set(input,task);return task.promise};
 const resolveOption=async id=>{const signal=getApiRequestOptions()?.signal;const task=deferred();resolutions.push({id,signal,...task});pendingResolutions.set(id,task);return task.promise};
 const props={name:'lookup',label:'Lookup',loadOptions,resolveOption,onChange:value=>changes.push(value),value:'saved'};
 let ui=render(h(AsyncSelect,props),{wrapper});await waitFor(()=>assert.equal(resolutions.length,1));assert.equal(loads.length,1);assert.equal(resolutions[0].id,'saved');
 ui.rerender(h(AsyncSelect,{...props,loadOptions:input=>loadOptions(input),resolveOption:id=>resolveOption(id)}));await pause(40);assert.equal(loads.length,1);assert.equal(resolutions.length,1,'inline callbacks do not refetch');
 await act(async()=>pendingResolutions.get('saved').resolve({id:'saved',label:'Saved beyond first page'}));await waitFor(()=>assert(ui.getByText('Saved beyond first page')));
 const input=ui.getByRole('combobox');fireEvent.focus(input);fireEvent.change(input,{target:{value:'older'}});await pause(550);await waitFor(()=>assert(pendingSearches.has('older')));
 fireEvent.change(input,{target:{value:'newer'}});assert(loads.find(row=>row.input==='older').signal.aborted);await pause(550);await waitFor(()=>assert(pendingSearches.has('newer')));
 await act(async()=>pendingSearches.get('newer').resolve([{id:'new',label:'Newest result'}]));await waitFor(()=>assert(ui.getByText('Newest result')));await act(async()=>pendingSearches.get('older').resolve([{id:'old',label:'Outdated result'}]));assert(!ui.queryByText('Outdated result'));assert.equal(ui.container.querySelector('input[type=hidden][name=lookup]').value,'saved','search preserves selected ID');
 fireEvent.change(input,{target:{value:''}});fireEvent.keyDown(input,{key:'ArrowDown'});await waitFor(()=>assert(ui.getByText('First page option')));assert(!ui.queryByText('Newest result'),'clearing search restores initial choices');assert(ui.getByText('Saved beyond first page'),'clearing search restores saved label');
 fireEvent.change(input,{target:{value:'failed'}});await pause(550);await act(async()=>pendingSearches.get('failed').reject(new Error('Offline')));await waitFor(()=>assert(ui.getByText(i18n.t('apiResponse.error'))));
 ui.rerender(h(AsyncSelect,{...props,value:''}));assert(!ui.queryByText('Saved beyond first page'));assert.equal(changes.length,0,'hydration and external clearing never write to form');
 fireEvent.change(ui.getByRole('combobox'),{target:{value:''}});ui.rerender(h(AsyncSelect,{...props,value:'c'}));await waitFor(()=>assert(pendingResolutions.has('c')));ui.rerender(h(AsyncSelect,{...props,value:'d'}));await waitFor(()=>assert(pendingResolutions.has('d')));assert(resolutions.find(row=>row.id==='c').signal.aborted);
 await act(async()=>pendingResolutions.get('d').resolve({id:'d',label:'Current external selection'}));await act(async()=>pendingResolutions.get('c').resolve({id:'c',label:'Old external selection'}));assert(ui.getByText('Current external selection'));assert(!ui.queryByText('Old external selection'));
 const before=loads.length;fireEvent.change(ui.getByRole('combobox'),{target:{value:'unmounted'}});cleanup();await pause(550);assert.equal(loads.length,before,'pending debounce canceled on unmount');
 let scopeReads=0;
 const ScopedLookup=({schoolId})=>h(AuthContext.Provider,{value:{user:{role:UserRole.ADMIN,school:{id:schoolId}},userRole:UserRole.ADMIN,isAuthenticated:true}},h(AsyncSelect,{name:'scoped',label:'Scoped lookup',value:'shared-id',onChange:()=>{},loadOptions:async()=>{scopeReads++;return [{id:'shared-id',label:schoolId+' selected name'}]}}));
 ui=render(h(ScopedLookup,{schoolId:'school-one'}),{wrapper});await waitFor(()=>assert(ui.getByText('school-one selected name')));ui.rerender(h(ScopedLookup,{schoolId:'school-two'}));await waitFor(()=>assert(ui.getByText('school-two selected name')));assert(!ui.queryByText('school-one selected name'));assert.equal(scopeReads,2,'account scope resets cached labels once');cleanup();
 // Exercise every real domain selector and its real API client, using an in-memory HTTP adapter.
 const {apiClient,configureApiClient}=require(core+'/src/api/client.ts');configureApiClient({apiUrl:'http://lookup.invalid/api'});
 const apiCalls=[];
 apiClient.defaults.adapter=async config=>{apiCalls.push(config.url);const id=config.url.split('/').pop();let data;
   if(config.url==='/lookups/teachers')data=config.params?.id?[{id:config.params.id,firstName:'Saved',lastName:'Teacher'}]:[];
   else if(config.url.endsWith('/saved-student'))data={id,firstName:'Saved',lastName:'Student'};
   else if(config.url.endsWith('/saved-teacher'))data={id,firstName:'Saved',lastName:'Teacher'};
   else if(config.url.endsWith('/saved-class'))data={id,classNameValue:'Saved class',branch:null};
   else if(config.url.endsWith('/saved-course'))data={id,class:{classNameValue:'Saved course',branch:null},subject:{subjectName:'Math'}};
   else if(config.url.endsWith('/saved-subject'))data={id,subjectName:'Saved subject'};
   else if(config.url.endsWith('/saved-book'))data={id,bookTitle:'Saved book'};
   else data=[];
   return {data,status:200,statusText:'OK',headers:{},config};
 };
 const controls=['Student','Teacher','Class','Course','Subject','Book'].map(name=>h(get('components/select/App'+name+'Select.tsx'),{key:name,name:name.toLowerCase(),value:'saved-'+name.toLowerCase(),onChange:()=>{}}));
 ui=render(h(AuthContext.Provider,{value:{user:null,userRole:UserRole.ADMIN,isAuthenticated:true}},controls),{wrapper});
 for(const label of ['Saved Student','Saved Teacher','Saved class','Saved course Math','Saved subject','Saved book'])await waitFor(()=>assert(ui.getByText(label)));
 const count=apiCalls.length;ui.rerender(h(AuthContext.Provider,{value:{user:null,userRole:UserRole.ADMIN,isAuthenticated:true}},controls));await pause(80);assert.equal(apiCalls.length,count,'domain hydration settles after one resolution');assert.equal(apiCalls.filter(url=>url.endsWith('/saved-student')).length,1);
 cleanup();apiCalls.length=0;
 apiClient.defaults.adapter=async config=>{apiCalls.push(config.url);const pagination={totalPages:2};let data=[];
   if(config.url==='/teacher/students')data=[];
   else if(config.url==='/teacher/student/saved-student')data={id:'saved-student',firstName:'Saved',lastName:'Student'};
   else if(config.url==='/teacher/classes')data=config.params.classId==='saved-class'?[{id:'saved-class',classNameValue:'Saved class',branch:null}]:[{id:'first-class',classNameValue:'First class',branch:null}];
   else if(config.url==='/teacher/courses')data=[{id:'first-course',class:{classNameValue:'First course',branch:null},subject:{subjectName:'Math'}}];
   else if(config.url==='/teacher/all-courses')data=[{id:'saved-course',class:{classNameValue:'Saved course',branch:null},subject:{subjectName:'Math'}}];
   else throw Error('Teacher lookup used unexpected endpoint '+config.url);
   return {data,status:200,statusText:'OK',headers:{pagination:JSON.stringify(pagination)},config};
 };
 const teacherControls=['Student','Class','Course'].map(name=>h(get('components/select/App'+name+'Select.tsx'),{key:name,name:'teacher-'+name.toLowerCase(),value:'saved-'+name.toLowerCase(),onChange:()=>{}}));
 ui=render(h(AuthContext.Provider,{value:{user:{role:UserRole.TEACHER,teacher:{id:'teacher-one',schoolId:'school-one'}},userRole:UserRole.TEACHER,isAuthenticated:true}},teacherControls),{wrapper});
 for(const label of ['Saved Student','Saved class','Saved course Math'])await waitFor(()=>assert(ui.getByText(label)));
 assert(!apiCalls.some(url=>url.startsWith('/school/')),'teacher selectors never call admin endpoints');const teacherCount=apiCalls.length;await pause(60);assert.equal(apiCalls.length,teacherCount);cleanup();
 // Real course tables tolerate omitted foreign reference details and reuse Core labels.
 const course={id:'course',class:{classNameValue:'Grade 8',branch:null},subject:{subjectName:'Math'},teacher:null};
 exportsForScreen={getPersonName:require(core+'/src/helper/personNames.ts').getPersonName,getClassLabel:require(core+'/src/helper/classLabels.ts').getClassLabel,
  useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useTableColumns:require(core+'/src/hooks/useTableColumns.ts').useTableColumns,useTableActions:require(core+'/src/hooks/useTableActions.ts').useTableActions,
  AppCard:({children})=>h('div',null,children),AppTable:({data,columns})=>h('div',null,data.flatMap(row=>columns.map((column,index)=>h('span',{key:index},column.render?.(row[column.accessor],row)??'')))),
  useSchoolOperations:()=>({courseList:async()=>({data:[course]}),data:[course],totalPages:1})};
 for(const [file,props] of [['screens/course/CourseList.tsx',{titleKey:'course.list.label',data:[course],totalPages:1}],['screens/school/class/subject/SchoolCourseList.tsx',{}]]){
  const Screen=require(shell+'/src/'+file).default;ui=render(h(Screen,props),{wrapper});assert(ui.getByText('Grade 8'));assert(ui.getByText('Math'));assert(ui.getByText('—'));cleanup();
 }
 const room={id:'room',classNameValue:'Grade 8',branch:null,teacher:null,enrollments:[{status:false},{status:true}],courses:[course],studentCapacity:40};
 exportsForScreen={...exportsForScreen,AppButtonLink:({children})=>h('span',null,children),useSchoolOperations:()=>({classList:async()=>({data:[room]}),data:[room],totalPages:1})};
 const ClassList=require(shell+'/src/screens/school/class/ClassList.tsx').default;ui=render(h(ClassList),{wrapper});assert(ui.getByText('—'));assert(!ui.container.textContent.includes('undefined'));cleanup();
 console.log('PASS: real async lookup and all six domain selectors hydrate saved IDs beyond the first page, retain selected labels during search, ignore stale responses, settle failed searches, preserve cleared values and cancel abandoned work without request loops. Teacher reference controls use teacher-scoped APIs.');
})().catch(error=>{console.error(error);process.exitCode=1});
