const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');
const projects=process.env.PDF_AUDIT_PROJECTS || path.resolve(__dirname,'../../..');
const core=path.join(projects,'digitalmaktab-spa-core/src');const app=path.join(projects,'digitalmaktab-spa/node_modules');
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};let runtimeError=null;window.addEventListener("error",event=>{runtimeError=event.error});
const ts=require(path.join(projects,'digitalmaktab-spa-core/node_modules/typescript'));
require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){if(/^\.\.\/select\/App(Country|Branch|ClassType|Shift|Teacher|Class)Select$/.test(request))return {__esModule:true,default:()=>null};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react');const {render,fireEvent,waitFor,cleanup,act}=require(app+'/@testing-library/react');const {I18nextProvider}=require(app+'/react-i18next');const {MemoryRouter}=require(app+'/react-router-dom');const i18n=require(app+'/i18next').createInstance();const AppTable=require(core+'/components/table/AppTable.tsx').default;const h=React.createElement;
const columns=[{header:'Name',accessor:'name'}];const earlier={id:'earlier',name:'Outside',creationDate:'2026-10-12T00:00:00Z'};const matching=Array.from({length:12},(_,index)=>({id:'match-'+index,name:'Match '+index,creationDate:'2026-10-13T23:59:59Z'}));
const view=props=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AppTable,{columns,totalPages:1,...props}))));
const change=(ui,from,to)=>{fireEvent.change(ui.getByLabelText(i18n.t('dateRange.from')),{target:{value:from}});fireEvent.change(ui.getByLabelText(i18n.t('dateRange.to')),{target:{value:to}});fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}))};
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 const all=[earlier,...matching];
 let ui=view({data:all,showExport:false,showPagination:false,showPageSizer:false});
 assert(ui.getByLabelText(i18n.t('dateRange.from')));assert(!ui.queryByText(i18n.t('table.creationDateRange.label')));
 change(ui,'2026-10-13','2026-10-13');assert(!ui.queryByText('Outside'));assert.equal(ui.container.querySelectorAll('tbody tr').length,12);
 fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset')})[0]);assert(ui.getByText('Outside'));cleanup();
 const queries=[];
 const records=all.map(row=>({...row,title:row.name}));
 const fetchPageData=async(page,size,filters)=>{
   queries.push({page,size,filters:{...filters}});
   const matches=records.filter(row=>(!filters.creationDateFrom||row.creationDate.slice(0,10)>=filters.creationDateFrom)&&(!filters.creationDateTo||row.creationDate.slice(0,10)<=filters.creationDateTo)&&(!filters.searchTerm||row.title.includes(filters.searchTerm)));
   return {status:2,data:matches.slice((page-1)*size,page*size),headers:{pagination:JSON.stringify({totalPages:Math.ceil(matches.length/size),totalCount:matches.length})}};
 };
 ui=view({data:records,totalPages:2,fetchPageData,showExport:false,columns:[{header:'Name',accessor:'name'},{header:'Title',accessor:'title',filter:{type:'text'},hidden:true}]});
 await waitFor(()=>assert(ui.getByText('Outside')));assert.equal(queries.length,1);
 fireEvent.change(ui.getByLabelText(i18n.t('dateRange.from')),{target:{value:'2026-10-13'}});
 fireEvent.change(ui.getByLabelText(i18n.t('dateRange.to')),{target:{value:'2026-10-13'}});
 assert(ui.getByText('Outside'));assert.equal(queries.length,1);
 fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));
 await waitFor(()=>assert(!ui.queryByText('Outside')));assert.equal(queries.length,2);
 assert.deepEqual(queries.at(-1),{page:1,size:10,filters:{creationDateFrom:'2026-10-13',creationDateTo:'2026-10-13'}});
 assert(!queries.some(query=>query.size===50));
 fireEvent.click(ui.getByRole('button',{name:'Go to page 2'}));await waitFor(()=>assert(ui.getByText('Match 11')));assert.equal(queries.length,3);assert.equal(queries.at(-1).page,2);assert.equal(queries.at(-1).filters.creationDateFrom,'2026-10-13');
 fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.hide.label')+' (1)'}));assert(!ui.queryByLabelText(i18n.t('dateRange.from')));
 fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.show.label')+' (1)'}));assert.equal(ui.getByLabelText(i18n.t('dateRange.from')).value,'2026-10-13');
 const beforeTyping=queries.length;fireEvent.change(ui.getByLabelText('Title'),{target:{value:'11'}});assert.equal(queries.length,beforeTyping);
 fireEvent.keyDown(ui.getByLabelText('Title'),{key:'Enter'});await waitFor(()=>assert(ui.getByText('Match 11')));
 await waitFor(()=>assert.equal(queries.length,beforeTyping+1));assert.equal(queries.at(-1).page,1);assert.deepEqual(queries.at(-1).filters,{creationDateFrom:'2026-10-13',creationDateTo:'2026-10-13',searchTerm:'11'});
 assert(ui.getByRole('button',{name:i18n.t('filters.hide.label')+' (2)'}));
 // Changing callback identity and parent data must not start another request.
 ui.rerender(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AppTable,{data:[earlier],columns:[{header:'Name',accessor:'name'},{header:'Title',accessor:'title',filter:{type:'text'},hidden:true}],totalPages:2,showExport:false,fetchPageData:(...args)=>fetchPageData(...args)}))));
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30))});assert.equal(queries.length,beforeTyping+1);assert(ui.getByText('Match 11'));assert(!ui.queryByText('Outside'));
 fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset')})[0]);await waitFor(()=>assert(ui.getByText('Outside')));assert.equal(ui.getByLabelText('Title').value,'');assert.equal(ui.getByLabelText(i18n.t('dateRange.from')).value,'');assert.deepEqual(queries.at(-1).filters,{});cleanup();
 // Local tables combine dates, text and dropdown criteria without network scans.
 ui=view({data:[{id:'a',name:'Alpha',email:'Match@example.test',joiningClass:{id:'class-a'},creationDate:'2026-10-13'},{id:'b',name:'Beta',email:'other@example.test',joiningClass:{id:'class-a'},creationDate:'2026-10-13'},{id:'c',name:'Earlier',email:'match@example.test',joiningClass:{id:'class-a'},creationDate:'2026-10-12'}],showExport:false,showPagination:false,columns:[{header:'Name',accessor:'name'},{header:'Email',accessor:'email',filter:{type:'text'},hidden:true}]});
 fireEvent.change(ui.getByLabelText('Email'),{target:{value:'MATCH'}});change(ui,'2026-10-13','2026-10-13');assert(ui.getByText('Alpha'));assert(!ui.queryByText('Beta'));assert(!ui.queryByText('Earlier'));cleanup();
 const {filterTableRecords}=require(core+'/helper/tableFilters.ts');assert.equal(filterTableRecords([{joiningClass:{id:'class-a'}},{joiningClass:{id:'class-b'}}],[{accessor:'joiningClass',filter:{type:'dropdown'}}],{classId:'class-a'}).length,1);
 // Obsolete responses must not replace results from the latest applied filters.
 let finish;const delayed=new Promise(resolve=>{finish=resolve});let calls=0;
 ui=view({data:[],showExport:false,fetchPageData:async()=>++calls===1?delayed:{status:2,data:[earlier],headers:{pagination:JSON.stringify({totalPages:1})}}});
 change(ui,'2026-10-13','2026-10-13');await waitFor(()=>assert(ui.getByText('Outside')));await act(async()=>{finish({status:2,data:matching,headers:{pagination:JSON.stringify({totalPages:2})}})});assert(ui.getByText('Outside'));assert(!ui.queryByText('Match 0'));cleanup();
 // Local legacy placeholders preserve already-loaded rows.
 ui=view({data:all,showExport:false,showPagination:false,fetchPageData:async()=>({status:0,data:[]})});change(ui,'2026-10-13','2026-10-13');await waitFor(()=>assert(ui.getByText('Match 11')));assert(!ui.queryByText('Outside'));cleanup();
 // Shared request hooks accept replacement criteria and suppress stale data/pagination status.
 const useApiRequests=require(core+'/hooks/useApiRequests.ts').default;
 const {LoaderContext}=require(core+'/contexts/LoaderContext.tsx');
 const {renderHook}=require(app+'/@testing-library/react');
 const loader={showLoader:()=>{},hideLoader:()=>{},setError:()=>{},clearError:()=>{}};
 const hook=renderHook(()=>useApiRequests(),{wrapper:({children})=>h(I18nextProvider,{i18n},h(LoaderContext.Provider,{value:loader},children))});
 let finishOld,oldResult;const old=new Promise(resolve=>{finishOld=resolve});
 await act(async()=>{oldResult=hook.result.current.execute(()=>old)});
 await act(async()=>{const newest=await hook.result.current.execute(async()=>({data:[matching[0]],headers:{}}));assert.equal(newest.status,2)});
 await act(async()=>{finishOld({data:[earlier],headers:{}});assert.equal((await oldResult).status,0)});
 assert.deepEqual(hook.result.current.data,[matching[0]]);hook.unmount();
 const {buildParams}=require(core+'/api/properties/pagintation.ts');
 assert.deepEqual(buildParams({pageNumber:4,pageSize:20},{creationDateFrom:'2026-10-13',creationDateTo:'2026-10-13',email:'school',classId:'abc',unused:'',other:null}),{pageNumber:4,pageSize:20,creationDateFrom:'2026-10-13',creationDateTo:'2026-10-13',email:'school',classId:'abc'});
 assert.equal(runtimeError,null);
 console.log('PASS: all shared tables combine applied dates and column filters; one request per page with complete query criteria; draft edits and callback/parent changes cause no extra requests; Apply/Enter, hide/show, reset, local filters and stale-response protection work.');
})().catch(error=>{console.error(error);process.exitCode=1});
