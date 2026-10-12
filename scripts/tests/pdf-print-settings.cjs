const assert=require('node:assert/strict');const fs=require('node:fs');const Module=require('node:module');
const path=require('node:path');
const root=process.env.PDF_AUDIT_PROJECTS || path.resolve(__dirname,'../../..');
const app=path.join(root,'digitalmaktab-spa/node_modules');
const artifacts=process.env.PDF_AUDIT_ARTIFACTS;
if(!artifacts) throw new Error('Run through scripts/check-pdf-exports.cjs');
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(path.join(root,'digitalmaktab-spa-core/node_modules/typescript'));
require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const realLoad=Module._load;Module._load=function(request,parent,isMain){if(request==='./AppTableFilter')return {__esModule:true,default:()=>null};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return realLoad.call(this,app+'/'+request,parent,isMain);return realLoad.apply(this,arguments)};
const React=require(app+'/react');const {render,fireEvent,waitFor,cleanup}=require(app+'/@testing-library/react');const {I18nextProvider}=require(app+'/react-i18next');const {MemoryRouter}=require(app+'/react-router-dom');
const i18n=require(app+'/i18next').createInstance();const h=React.createElement;
const AppTable=require(root+'/digitalmaktab-spa-core/src/components/table/AppTable.tsx').default;
const settings=require(root+'/digitalmaktab-spa-core/src/pdf/tableSettings.ts');
const columns=[{header:'name',accessor:'name'},{header:'createdAt',accessor:'createdAt'},{header:'secret',accessor:'secret',hidden:true}];const rows=[{id:'1',name:'Earlier',createdAt:'2026-10-12T23:00:00Z'},{id:'2',name:'Boundary',createdAt:'2026-10-13T00:00:00Z'},{id:'3',name:'Later',createdAt:'2026-10-14T00:00:00Z'},{id:'4',name:'Invalid',createdAt:'invalid'}];
const config=require(root+'/digitalmaktab-spa-core/src/pdf/config.ts');const source=fs.readFileSync(path.join(root,'digitalmaktab-spa/src/config/pdfMakeConfig.ts'),'utf8');config.configureCorePdf({vazirmatnBase64:source.match(/const vazirMatnRegularBase64\s*=\s*"([^"]+)"/)[1]});
let blob,opened=0;URL.createObjectURL=value=>{blob=value;return 'blob:test'};URL.revokeObjectURL=()=>{};window.open=()=>{opened++;return {location:{href:""},close(){}}};global.fetch=async()=>({ok:false});
const realTimer=window.setTimeout.bind(window);window.setTimeout=(callback,delay,...args)=>delay===60000?0:realTimer(callback,delay,...args);
(async()=>{
 const resources={};for(const lng of ['en-US','fa-AF','ps-AF']){const repo=lng==='en-US'?'digitalmaktab-spa-core':'digitalmaktab-spa-country-afghanistan';resources[lng]={translation:{...JSON.parse(fs.readFileSync(root+'/'+repo+'/src/locales/'+lng+'/translation.json')),name:'Name',createdAt:'Created at',secret:'Secret'}};}
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 let fetches=0;const all=async()=>{fetches++;return rows};const view=()=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AppTable,{columns,data:rows.slice(0,1),totalPages:1,fetchAllForExport:all}))));
 for(const lng of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(lng);let ui=view();fireEvent.click(ui.getByRole('button',{name:i18n.t('report.print.tooltip')}));assert.equal(opened,fetches);const dialog=ui.getByRole('dialog');assert(dialog.textContent.includes(i18n.t('report.settings.title')));assert(!dialog.textContent.includes('Secret'));
  fireEvent.change(ui.getByLabelText(i18n.t('report.settings.pageSize')),{target:{value:'letter'}});fireEvent.change(ui.getByLabelText(i18n.t('report.settings.orientation')),{target:{value:'landscape'}});
  fireEvent.click(ui.getByRole('checkbox',{name:'Created at'}));fireEvent.click(ui.getByRole('checkbox',{name:'Name'}));assert(ui.getByRole('button',{name:i18n.t('report.settings.export')}).disabled);fireEvent.click(ui.getByRole('checkbox',{name:'Name'}));
  fireEvent.change(ui.getByLabelText(i18n.t('report.settings.dateField')),{target:{value:'1'}});fireEvent.change(ui.getByLabelText(i18n.t('report.settings.from')),{target:{value:'2026-10-14'}});fireEvent.change(ui.getByLabelText(i18n.t('report.settings.to')),{target:{value:'2026-10-13'}});assert(ui.getByRole('button',{name:i18n.t('report.settings.export')}).disabled);
  fireEvent.change(ui.getByLabelText(i18n.t('report.settings.from')),{target:{value:'2026-10-13'}});fireEvent.click(ui.getByRole('button',{name:i18n.t('report.settings.export')}));await waitFor(()=>assert(!ui.queryByRole('dialog')));assert(blob);assert.equal(opened,fetches);
  fs.writeFileSync(artifacts+'/modal-'+lng+'.pdf',Buffer.from(await blob.arrayBuffer()));cleanup();
 }
 const initial=settings.defaultPdfSettings(columns);assert.deepEqual(initial.selectedColumns,[0,1]);assert.deepEqual(settings.reportDateColumns(columns,rows),[1]);let filtered=settings.prepareTablePdf(columns,rows,{...initial,dateColumn:1,dateFrom:'2026-10-13',dateTo:'2026-10-13'});assert.deepEqual(filtered.rows.map(r=>r.name),['Boundary']);
 let ui=view();fireEvent.click(ui.getByRole('button',{name:i18n.t('report.print.tooltip')}));fireEvent.change(ui.getByLabelText(i18n.t('report.settings.dateField')),{target:{value:'1'}});fireEvent.change(ui.getByLabelText(i18n.t('report.settings.from')),{target:{value:'2030-01-01'}});fireEvent.click(ui.getByRole('button',{name:i18n.t('report.settings.export')}));await waitFor(()=>assert(ui.getByRole('alert').textContent.includes(i18n.t('report.settings.noRows'))));assert(ui.getByRole('dialog'));cleanup();
 console.log('PASS: actual AppTable opens translated shared settings before PDF; paper size/orientation, column selection, hidden-field exclusion, inclusive date filter, invalid-range/no-column validation, all-row fetch, no-match error and real PDF export in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
