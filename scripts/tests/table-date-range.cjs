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
 let ui=view({data:[earlier,...matching],showExport:false,showPagination:false,showPageSizer:false});assert(ui.getByLabelText(i18n.t('dateRange.from')));assert(!ui.queryByRole('button',{name:i18n.t('report.print.tooltip')}));change(ui,'2026-10-13','2026-10-13');await waitFor(()=>assert(!ui.queryByText('Outside')));assert.equal(ui.container.querySelectorAll('tbody tr').length,12);fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset')})[0]);assert(ui.getByText('Outside'));cleanup();
 const calls=[];const pageRows=[[earlier,...matching.slice(0,6)],matching.slice(6)];
 const fetchPageData=async(page,size)=>{calls.push([page,size]);return {status:2,data:pageRows[page-1],headers:{pagination:JSON.stringify({totalPages:2})}}};
 ui=view({data:pageRows[0],totalPages:2,fetchPageData,showExport:false});await waitFor(()=>assert(ui.getByText('Outside')));change(ui,'2026-10-13','2026-10-13');await waitFor(()=>assert(ui.getByText('Match 9')));assert(!ui.queryByText('Outside'));assert(!ui.queryByText('Match 10'));assert(calls.some(([page,size])=>page===2&&size===50));const count=calls.length;
 fireEvent.click(ui.getByRole('button',{name:'Go to page 2'}));await waitFor(()=>assert(ui.getByText('Match 11')));assert(!ui.queryByText('Match 0'));assert.equal(calls.length,count);cleanup();
 // Dates share the actual panel, apply state, count and reset with mapped text criteria.
 const queries=[];const searchLoader=async(page,size,filters)=>{
   queries.push({page,size,filters});
   const records=[earlier,...matching].filter(row=>!filters.searchTerm||row.name.includes(filters.searchTerm));
   return {status:2,data:records,headers:{pagination:JSON.stringify({totalPages:1})}};
 };
 ui=view({data:[earlier,...matching],showExport:false,fetchPageData:searchLoader,
   columns:[{header:'Name',accessor:'name'},{header:'Title',accessor:'title',filter:{type:'text'}}]});
 await waitFor(()=>assert(ui.getByText('Outside')));
 assert(ui.getByLabelText(i18n.t('dateRange.from')).closest('.filter-form'));
 const initialQueries=queries.length;
 fireEvent.change(ui.getByLabelText(i18n.t('dateRange.from')),{target:{value:'2026-10-13'}});
 fireEvent.change(ui.getByLabelText(i18n.t('dateRange.to')),{target:{value:'2026-10-13'}});
 assert(ui.getByText('Outside'));assert.equal(queries.length,initialQueries);
 fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.button.label')}));
 await waitFor(()=>assert(!ui.queryByText('Outside')));
 const hideDateLabel=i18n.t('filters.hide.label')+' (1)';fireEvent.click(ui.getByRole('button',{name:hideDateLabel}));
 assert(!ui.queryByLabelText(i18n.t('dateRange.from')));assert(ui.getByText('Match 0'));
 fireEvent.click(ui.getByRole('button',{name:i18n.t('filters.show.label')+' (1)'}));
 assert.equal(ui.getByLabelText(i18n.t('dateRange.from')).value,'2026-10-13');
 const beforeTyping=queries.length;fireEvent.change(ui.getByLabelText('Title'),{target:{value:'11'}});
 assert.equal(ui.getByLabelText('Title').value,'11');assert.equal(queries.length,beforeTyping);
 fireEvent.keyDown(ui.getByLabelText('Title'),{key:'Enter'});
 await waitFor(()=>assert(!ui.queryByText('Match 0')));assert(ui.getByText('Match 11'));
 assert.equal(queries.at(-1).filters.searchTerm,'11');assert(!('creationDateFrom' in queries.at(-1).filters));
 assert(!('creationDateTo' in queries.at(-1).filters));
 assert(ui.getByRole('button',{name:i18n.t('filters.hide.label')+' (2)'}));
 fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset')})[0]);
 await waitFor(()=>assert(ui.getByText('Outside')));
 assert.equal(ui.getByLabelText('Title').value,'');assert.equal(ui.getByLabelText(i18n.t('dateRange.from')).value,'');
 assert(ui.getByRole('button',{name:i18n.t('filters.hide.label')}));cleanup();
 // An obsolete full-data response must not replace a newly cleared filter.
 let finish;const pending=new Promise(resolve=>{finish=resolve});
 ui=view({data:[earlier],showExport:false,fetchAllForExport:()=>pending});change(ui,'2026-10-13','2026-10-13');fireEvent.click(ui.getAllByRole('button',{name:i18n.t('filters.button.reset')})[0]);await act(async()=>{finish(matching)});assert(ui.getByText('Outside'));assert(!ui.queryByText('Match 0'));cleanup();
 // Local legacy placeholders do not discard the already-loaded rows.
 ui=view({data:[earlier,...matching],showExport:false,showPagination:false,fetchPageData:async()=>({status:0,data:[]})});change(ui,'2026-10-13','2026-10-13');await waitFor(()=>assert(ui.getByText('Match 11')));assert(!ui.queryByText('Outside'));cleanup();
 assert.equal(runtimeError,null);
 console.log('PASS: creation-date range uses the real shared filter panel on every table; draft edits, Apply/Enter, accessor mappings, hide/show, active counts and unified Reset work; all API pages are filtered and re-paginated without repeat fetching; reset, stale-load protection and legacy local loaders work.');
})().catch(error=>{console.error(error);process.exitCode=1});
