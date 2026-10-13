const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const Module=require('node:module');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const core=projects+'/digitalmaktab-spa-core';const app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){if(/^\.\.\/select\/App(Country|Branch|ClassType|Shift|Teacher|Class)Select$/.test(request))return {__esModule:true,default:()=>null};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react');const {render,renderHook,fireEvent,waitFor,act,cleanup,within}=require(app+'/@testing-library/react');const {I18nextProvider}=require(app+'/react-i18next');const {MemoryRouter}=require(app+'/react-router-dom');const i18n=require(app+'/i18next').createInstance();const h=React.createElement;
const AppTable=require(core+'/src/components/table/AppTable.tsx').default;const settings=require(core+'/src/pdf/tableSettings.ts');
const font=fs.readFileSync(projects+'/digitalmaktab-spa/src/config/pdfMakeConfig.ts','utf8').match(/const vazirMatnRegularBase64\s*=\s*"([^"]+)"/)[1];require(core+'/src/pdf/config.ts').configureCorePdf({vazirmatnBase64:font});
const columns=[{header:'Name',accessor:'name'},{header:'Due date',accessor:'dueDate'},{header:'Creation date',accessor:'creationDate',hidden:true}];
const rows=[{id:'one',name:'First',dueDate:'2030-01-01',creationDate:'2026-10-13'},{id:'two',name:'Second',dueDate:'2030-01-01',creationDate:'2026-10-13'}];
let opens=0,urls=0,lastDownload;const blobs=new Map();const revoked=[];
URL.createObjectURL=blob=>{const url='blob:pdf-'+(++urls);blobs.set(url,blob);return url};URL.revokeObjectURL=url=>{revoked.push(url);blobs.delete(url)};
window.open=url=>{assert(blobs.get(url)?.type==='application/pdf');opens++;return {opener:null,location:{href:url}}};
window.HTMLAnchorElement.prototype.click=function(){lastDownload={url:this.href,name:this.download}};global.fetch=async()=>({ok:false});
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,null,children));const view=props=>render(h(wrapper,null,h(AppTable,{columns,data:rows,totalPages:1,printPreferenceKey:'workflow-table',...props})));
const button=(ui,key)=>ui.getAllByRole('button',{name:i18n.t('report.settings.'+key)}).at(-1);const openSettings=ui=>fireEvent.click(ui.getByRole('button',{name:i18n.t('report.print.tooltip')}));
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});localStorage.clear();
 // Persist preferences and cancel a pending record request, including callers that ignore its signal.
 let finish,cancelSignal,fetches=0;const pending=new Promise(resolve=>{finish=resolve});
 let ui=view({fetchAllForExport:(filters,signal)=>{fetches++;cancelSignal=signal;return pending}});openSettings(ui);
 assert(!within(ui.getByRole('dialog')).queryByText(i18n.t('report.settings.recordCount')));
 fireEvent.change(ui.getByLabelText(i18n.t('report.settings.pageSize')),{target:{value:'letter'}});
 fireEvent.change(ui.getByLabelText(i18n.t('report.settings.orientation')),{target:{value:'landscape'}});
 fireEvent.click(ui.getByRole('checkbox',{name:'Due date'}));fireEvent.click(button(ui,'export'));
 assert(ui.getByRole('progressbar',{name:i18n.t('report.settings.loadingRecords')}));assert.equal(opens,0);assert.equal(fetches,1);
 fireEvent.click(button(ui,'cancel'));assert(cancelSignal.aborted);assert(!ui.queryByRole('dialog'));
 await act(async()=>{finish(rows)});assert.equal(opens,0);assert.equal(urls,0);
 openSettings(ui);assert.equal(ui.getByLabelText(i18n.t('report.settings.pageSize')).value,'letter');assert.equal(ui.getByLabelText(i18n.t('report.settings.orientation')).value,'landscape');assert(!ui.getByRole('checkbox',{name:'Due date'}).checked);cleanup();
 // A failed load offers Retry and preserves the preferences; successful generation stays in the modal.
 let attempts=0;ui=view({fetchAllForExport:async()=>{if(++attempts===1)throw new Error('network failure');return rows}});openSettings(ui);fireEvent.click(button(ui,'export'));
 await waitFor(()=>assert(ui.getByText(i18n.t('report.settings.errors.loading'))));assert.equal(ui.getByLabelText(i18n.t('report.settings.pageSize')).value,'letter');fireEvent.click(button(ui,'retry'));
 await waitFor(()=>assert(button(ui,'openPdf')));assert.equal(opens,0);assert.equal(attempts,2);assert(ui.getByRole('progressbar',{name:i18n.t('report.settings.ready')}));assert(ui.getByText(i18n.t('report.settings.readyDetails',{records:'2',pages:'1'})));
 const readyUrl=[...blobs.keys()][0];const readyBlob=blobs.get(readyUrl);assert((await readyBlob.text()).startsWith('%PDF-'));
 // Blocked previews retain the finished artifact and a separate download option.
 window.open=()=>null;fireEvent.click(button(ui,'openPdf'));assert(ui.getByText(i18n.t('report.settings.popupBlocked')));fireEvent.click(button(ui,'downloadPdf'));assert.equal(lastDownload.url,readyUrl);assert(lastDownload.name.endsWith('.pdf'));assert.equal(attempts,2);
 fireEvent.click(button(ui,'close'));assert(revoked.includes(readyUrl));assert.equal(blobs.size,0);cleanup();
 // Preferences remain isolated by table, follow column identities, and tolerate corrupt storage.
 ui=view({printPreferenceKey:'other-table'});openSettings(ui);assert.equal(ui.getByLabelText(i18n.t('report.settings.pageSize')).value,'a4');assert(ui.getByRole('checkbox',{name:'Due date'}).checked);cleanup();
 assert.deepEqual(settings.loadPdfSettings('workflow-table',[columns[1],columns[0],columns[2]]).selectedColumns,[1]);
 localStorage.setItem('dm-pdf-settings:broken','{bad');assert.deepEqual(settings.loadPdfSettings('broken',columns),settings.defaultPdfSettings(columns));
 // Cancel between server pages: no subsequent page request and no mutation of the table's page snapshot.
 const queries=[];let stop;const pageWait=new Promise(resolve=>{stop=resolve});
 ui=view({data:rows,totalPages:3,fetchPageData:async(page,size,filters,signal)=>{
   queries.push({page,size,signal});if(size===50&&page===2)return pageWait;
   return {status:2,data:rows,headers:{pagination:JSON.stringify({totalPages:3,totalItems:6})}};
 }});await waitFor(()=>assert.equal(queries.length,1));openSettings(ui);fireEvent.click(button(ui,'export'));await waitFor(()=>assert(queries.some(query=>query.size===50&&query.page===2)));fireEvent.click(button(ui,'cancel'));
 const pendingPage=queries.at(-1);assert(pendingPage.signal.aborted);await act(async()=>{stop({status:2,data:rows,headers:{pagination:JSON.stringify({totalPages:3})}})});assert(!queries.some(query=>query.size===50&&query.page===3));assert.equal(opens,0);assert(ui.getByText('First'));cleanup();
 // The renderer yields between chunks and can be cancelled before creating a PDF URL.
 const hook=renderHook(()=>require(core+'/src/hooks/useJsPdfExportToPdf.ts').default(),{wrapper});const controller=new AbortController();const beforeUrls=urls;
 const many=Array.from({length:600},(_,index)=>({...rows[index%2],id:String(index),name:'Record '+index}));
 await assert.rejects(hook.result.current(columns,many,'Cancelled PDF','',undefined,undefined,undefined,settings.defaultPdfSettings(columns),undefined,{signal:controller.signal,language:'en-US',onProgress:value=>{if(value.stage==='rendering'&&value.completed===250)controller.abort()}}),error=>error.name==='AbortError');assert.equal(urls,beforeUrls);
 // A complete report spanning several rendering chunks retains every record and valid pages.
 const completed=[];let large;
 await act(async()=>{large=await hook.result.current(columns,many,'Complete report','',undefined,undefined,undefined,settings.defaultPdfSettings(columns),undefined,{signal:new AbortController().signal,language:'en-US',onProgress:value=>{if(value.completed)completed.push(value.completed)}})});
 assert.equal(large.rowCount,600);assert(large.pageCount>2);assert.deepEqual(completed,[250,500,600]);assert.equal(urls,beforeUrls);assert.equal(large.direction,'ltr');
 const largePath=path.join(process.env.PDF_AUDIT_ARTIFACTS||require('node:os').tmpdir(),'pdf-workflow-large.pdf');fs.writeFileSync(largePath,Buffer.from(await large.blob.arrayBuffer()));
 const extracted=require('node:child_process').spawnSync('pdftotext',['-layout',largePath,'-'],{encoding:'utf8'});if(extracted.status===0){assert(extracted.stdout.includes('Record 0'));assert(extracted.stdout.includes('Record 599'))}hook.unmount();
 // Actual Axios GET requests receive AbortSignal without query leakage; unrelated calls do not inherit it.
 const {apiClient,configureApiClient}=require(core+'/src/api/client.ts');const requestOptions=require(core+'/src/api/requestOptions.ts');const axios=require(core+'/node_modules/axios');configureApiClient({apiUrl:'http://test.invalid/api'});
 let seen;apiClient.defaults.adapter=config=>new Promise((resolve,reject)=>{
   if(config.url==='/cancelled') {seen=config;config.signal.addEventListener('abort',()=>reject(new axios.CanceledError('cancelled',config)),{once:true})}
   else resolve({data:rows,status:200,statusText:'OK',headers:{},config});
 });
 const abort=new AbortController();const call=requestOptions.withApiRequestOptions({signal:abort.signal,silent:true},()=>apiClient.get('/cancelled',{params:{creationDateFrom:'2026-10-13'}}));const rejected=assert.rejects(call,error=>axios.isCancel(error));await waitFor(()=>assert(seen));assert.deepEqual(seen.params,{creationDateFrom:'2026-10-13'});abort.abort();await rejected;
 const response=await apiClient.get('/ordinary');assert(!response.config.signal);
 // Export requests leave the shared hook's displayed data and global loader untouched.
 const useApiRequests=require(core+'/src/hooks/useApiRequests.ts').default;const {LoaderContext}=require(core+'/src/contexts/LoaderContext.tsx');let loaderCalls=0;const loader={showLoader:()=>loaderCalls++,hideLoader:()=>loaderCalls++,setError:()=>{},clearError:()=>{}};
 const apiHook=renderHook(()=>useApiRequests(),{wrapper:({children})=>h(wrapper,null,h(LoaderContext.Provider,{value:loader},children))});
 await act(async()=>{await apiHook.result.current.execute(async()=>({data:[rows[0]],headers:{}}))});const loadersBefore=loaderCalls;
 await act(async()=>{await requestOptions.withApiRequestOptions({silent:true},()=>apiHook.result.current.execute(async()=>({data:[rows[1]],headers:{}})))});assert.deepEqual(apiHook.result.current.data,[rows[0]]);assert.equal(loaderCalls,loadersBefore);apiHook.unmount();cleanup();
 console.log('PASS: PDF progress, ready Open/Download, popup-block recovery, cancellation during requests and rendering, retry, per-table preferences, corrupt storage, URL cleanup, isolated transport signals, and preservation of table data/loader state.');
})().catch(error=>{console.error(error);process.exitCode=1});
