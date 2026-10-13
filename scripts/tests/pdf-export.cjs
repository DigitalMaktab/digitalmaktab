const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const projects = process.env.PDF_AUDIT_PROJECTS || path.resolve(__dirname, '../../..');
const root = path.join(projects, 'digitalmaktab-spa-core');
const app = path.join(projects, 'digitalmaktab-spa/node_modules');
const core = path.join(projects, 'digitalmaktab-spa-core/node_modules');
const artifacts = process.env.PDF_AUDIT_ARTIFACTS;
if (!artifacts) throw new Error('Run through scripts/check-pdf-exports.cjs');
const {JSDOM} = require(app+'/jsdom');
const dom = new JSDOM('<html><body></body></html>', {url:'http://localhost'});
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/typescript');
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const React=require(app+'/react');
const i18n=require(app+'/i18next').createInstance();
let options, doc;
const realLoad=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='react'||request.startsWith('react/'))return realLoad.call(this,app+'/'+request,parent,isMain);
 if(request==='./useAppLocalizer')return {useAppLocalizer:()=>({t:i18n.t.bind(i18n),i18n})};
 if(request==='jspdf-autotable') {const original=realLoad.apply(this,arguments);return {__esModule:true,...original,default:(d,o)=>{options=o;doc=d;return original.default(d,o)}};}
 return realLoad.apply(this,arguments);
};
const {renderHook,act,cleanup}=require(app+'/@testing-library/react');
const config=require(root+'/src/pdf/config.ts');
const fontFile=fs.readFileSync(path.join(projects,'digitalmaktab-spa/src/config/pdfMakeConfig.ts'),'utf8');
const regular=fontFile.match(/const vazirMatnRegularBase64\s*=\s*"([^"]+)"/)[1];
const bold=fontFile.match(/const vazirMatnBoldBase64\s*=\s*"([^"]+)"/)[1];
config.configureCorePdf({pdfMake:{vfs:{'VazirMatn-Regular.ttf':regular,'VazirMatn-Bold.ttf':bold}}});
assert.equal(config.getVazirmatnBase64(),regular);assert.equal(config.getVazirmatnBoldBase64(),bold);
let blob;global.URL.createObjectURL=b=>{blob=b;return 'blob:test'};
let opened=0;global.URL.revokeObjectURL=()=>{};window.open=url=>{assert.equal(url,"blob:test");assert(blob&&blob.type==="application/pdf");opened++;return {location:{href:url},close(){}}};window.setTimeout=()=>0;
global.fetch=async()=>{throw new Error('Logo is offline')};
const h=React.createElement;
const circular={name:'Nested entity'};circular.self=circular;
const rows=[{name:'Khair Khana',code:'1002',driver:{firstName:'Ahmad',lastName:'10012'},status:3,hidden:'PRIVATE',notes:'Mixed Ahmad 10012 احمد (1002)',children:['Stop 1',{name:'Stop 2'}]},
 {name:'adsf',code:'2234e',driver:circular,status:0,hidden:'PRIVATE',notes:'ښځینه ښوونځی — څلور 31002',children:[]},
 {name:'Khair Khana',code:'31002',driver:{name:'احمد'},status:0,hidden:'PRIVATE',notes:'شماره تماس 09898989',children:[]}];
const columns=[{header:'route',accessor:'name',render:v=>h('strong',null,v)}, {header:'code',accessor:'code'},
 {header:'driver',accessor:'driver'}, {header:'status',accessor:'status',render:v=>h('span',null,['Count: ',v])},
 {header:'hidden',accessor:'hidden',hidden:true}, {header:'notes',accessor:'notes'}, {header:'stops',accessor:'children'},
 {header:'code',accessor:'code',exportValue:()=>({label:'Explicit export'})}];
(async()=>{
 const resources={};for(const lng of ['en-US','fa-AF','ps-AF']){
  const bundleFile=lng==='en-US'?root+'/src/locales/'+lng+'/translation.json':path.join(projects,'digitalmaktab-spa-country-afghanistan/src/locales/')+lng+'/translation.json';
  resources[lng]={translation:{...JSON.parse(fs.readFileSync(bundleFile)),route:lng==='en-US'?'Route':'مسیر',code:lng==='en-US'?'Code':'شماره',driver:lng==='en-US'?'Driver':'راننده',status:lng==='en-US'?'Count':'تعداد',notes:lng==='en-US'?'Notes':'یادداشت',stops:lng==='en-US'?'Stops':'ایستگاه'}};
 }
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 const hook=renderHook(()=>require(root+'/src/hooks/useJsPdfExportToPdf.ts').default());
 for(const lng of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(lng);
  await act(async()=>hook.result.current(columns,rows,lng==='en-US'?'Transport routes':'مسیرهای ترانسپورت'));
  assert(blob);assert.equal(options.head[0].length,7);assert.equal(options.styles.halign,lng==='en-US'?'left':'right');
  assert.equal(options.head[0][lng==='en-US'?0:6],resources[lng].translation.route);
  const all=options.body.flat().join('\n');assert(!all.includes('[object'));assert(!all.includes('PRIVATE'));assert(all.includes('Ahmad 10012'));assert(all.includes('Nested entity'));assert(all.includes('Stop 1, Stop 2'));assert(all.includes('Explicit export'));assert(all.includes('Count: '+new Intl.NumberFormat(lng).format(3)));assert(doc.getFontList().VazirMatn.includes('bold'));
  fs.writeFileSync(artifacts+'/pdf-'+lng+'.pdf',Buffer.from(await blob.arrayBuffer()));
 }
 await act(async()=>hook.result.current(columns,Array.from({length:180},(_,i)=>({...rows[i%3],name:'Route '+i})), 'Multipage report',''));
 assert(doc.getNumberOfPages()>2);fs.writeFileSync(artifacts+'/pdf-multipage.pdf',Buffer.from(await blob.arrayBuffer()));
 // Logo loading is still part of generation; do not open a viewer while it is pending.
 let finishLogo;const pendingLogo=new Promise(resolve=>{finishLogo=resolve});global.fetch=()=>pendingLogo;
 const beforeOpen=opened;let exporting;
 await act(async()=>{exporting=hook.result.current(columns,rows,'Delayed logo','/delayed-logo.png')});
 assert.equal(opened,beforeOpen);
 await act(async()=>{finishLogo({ok:false});await exporting});assert.equal(opened,beforeOpen+1);
 global.fetch=async()=>({ok:false});
 const legacy=renderHook(()=>require(root+'/src/hooks/useExportToPdf.ts').default());assert.equal(typeof legacy.result.current,'function');
 const {reportText}=require(root+'/src/pdf/tableValues.ts');
 const locale={language:'fa-AF',formatNumber:v=>new Intl.NumberFormat('fa-AF').format(v),formatBoolean:v=>v?'بلی':'نخیر'};
 assert.equal(reportText(0,locale),'۰');assert.equal(reportText(false,locale),'نخیر');assert.equal(reportText('[object Object]',locale),'');const cyc={};cyc.self=cyc;assert.equal(reportText(cyc,locale),'');assert.equal(reportText(h('span',null,['Hello ',h('b',{key:'world'},'world')]),locale),'Hello world');
 assert.equal(reportText(h('div',null,[false, h('span',{key:'x'},'Visible')]),locale),'Visible');
 const AppCalendarDate=require(root+'/src/components/AppCalendarDate.tsx').default;
 assert.equal(reportText(h(AppCalendarDate,{date:'2026-10-13'}),{...locale,formatDate:()=> '۱۴۰۵/۷/۲۱'}),'۱۴۰۵/۷/۲۱');
 assert.equal(reportText(h('input',{value:'Edited grade',label:'Grade'}),locale),'Edited grade');
 const before=options.margin.top;
 await act(async()=>hook.result.current(columns,rows,'Very long title '.repeat(25),''));assert(options.margin.top>before);
 const {defaultPdfSettings}=require(root+'/src/pdf/tableSettings.ts');
 for(const [pageSize,dimensions] of Object.entries({a4:[595.28,841.89],a3:[841.89,1190.55],letter:[612,792],legal:[612,1008]})) {
  for(const orientation of ['portrait','landscape']) {
   await act(async()=>hook.result.current(columns,rows,'Page size test','',undefined,undefined,undefined,{...defaultPdfSettings(columns),pageSize,orientation}));
   const expected=orientation==='portrait'?dimensions:[...dimensions].reverse();
   assert(Math.abs(doc.internal.pageSize.getWidth()-expected[0])<0.1);assert(Math.abs(doc.internal.pageSize.getHeight()-expected[1])<0.1);
  }
 }
 cleanup();console.log('PASS: real PDFs in English, Dari, Pashto, mixed names/numbers, VFS regular/bold fonts, hidden columns, React content, entities, arrays, export overrides, circular values, RTL order/alignment, language switches, missing logo and multipage layout.');
})().catch(error=>{console.error(error);process.exitCode=1});
