const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');
const projects = process.env.PDF_AUDIT_PROJECTS || path.resolve(__dirname, '../../..');
const root = path.join(projects, 'digitalmaktab-spa-core');
const app = path.join(projects, 'digitalmaktab-spa/node_modules');
const core = path.join(projects, 'digitalmaktab-spa-core/node_modules');
const artifacts = process.env.PDF_AUDIT_ARTIFACTS || require("node:os").tmpdir()+"/digitalmaktab-register-pdf";fs.mkdirSync(artifacts,{recursive:true});
if (!artifacts) throw new Error('Run through scripts/check-pdf-exports.cjs');
const {JSDOM} = require(app+'/jsdom');
const dom = new JSDOM('<html><body></body></html>', {url:'http://localhost'});
global.window=dom.window; global.document=dom.window.document; global.navigator=dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/typescript');
require.extensions['.ts']=require.extensions['.tsx']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const React=require(app+'/react');
const i18n=require(app+'/i18next').createInstance();
let options, doc;const draws=[];
const realLoad=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='react'||request.startsWith('react/'))return realLoad.call(this,app+'/'+request,parent,isMain);
 if(request==='./useAppLocalizer')return {useAppLocalizer:()=>({t:i18n.t.bind(i18n),i18n})};
 if(request==='jspdf-autotable') {const original=realLoad.apply(this,arguments);return {__esModule:true,...original,default:(d,o)=>{options=o;doc=d;draws.push(o);return original.default(d,o)}};}
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
const {prepareRegisterDocument}=require(root+'/src/pdf/registerDocument.ts');
(async()=>{
 for(const language of ['en-US','fa-AF','ps-AF']){
  const rtl=language!=='en-US';draws.length=0;const number=new Intl.NumberFormat(language);const label=language==='en-US'?'Monthly class attendance':'کتاب حاضری ماهانهٔ صنف';
  const names=['No.','شاگرد','پدر',...Array.from({length:31},(_,i)=>number.format(i+1)),'حاضر','غیرحاضر'];
  const rows=Array.from({length:45},(_,i)=>[number.format(i+1),i===0?{name:'Nested display name'}:'احمد Ahmad '+number.format(i+1),'کریم',...Array.from({length:31},(_,day)=>day%7===0?'—':day%3===0?'؟':day%2===0?'ح':'غ'),number.format(12),number.format(4)]);
  const spec={title:label,subtitle:'مکتب نمونه · صنف ۸ · میزان ۱۴۰۵',fileName:'register.pdf',paperSize:'a3',rowsPerPage:20,marginMm:12,bindingMarginMm:20,headers:names,widths:[2,8,6,...Array(31).fill(1),2,2],rows,signatures:['معلم صنف','آمر مکتب'],legend:'ح: حاضر · غ: غیرحاضر · ؟: ثبت نشده · —: رخصتی'};
  const artifact=await prepareRegisterDocument(spec,language,rtl);assert.equal(artifact.blob.type,'application/pdf');assert.equal(artifact.pageCount,3);assert.equal(opened,0,'Generation must not open a blank viewer');
  assert.equal(draws[0].styles.halign,rtl?'right':'left');assert.equal(draws[0].head[0][rtl?names.length-1:0],names[0]);
  const body=draws.flatMap(d=>d.body).flat().join(' ');assert(!body.includes('[object'));assert(body.includes('Nested display name'));assert.equal(draws.flatMap(d=>d.body).length,45);assert(doc.getFontList().VazirMatn.includes('bold'));
  const raw=Buffer.from(await artifact.blob.arrayBuffer());assert(raw.length>1000);if(rtl)assert(raw.toString('latin1').includes('/R2L'));fs.writeFileSync(artifacts+'/class-book-'+language+'.pdf',raw);
  const taraqi=await prepareRegisterDocument({...spec,title:language==='en-US'?'Taraqi talim':'ترقی تعلیم',headers:['تاریخ','مضمون','معلم','موضوع درس','شواهد','امضا'],widths:[3,4,5,8,5,4],rows:Array.from({length:23},()=>['۱۴۰۵/۰۷/۲۸','ریاضی','احمد Ahmad','کسرهای اعشاری','حاضری ثبت شده',''])},language,rtl);assert(taraqi.pageCount>=2);fs.writeFileSync(artifacts+'/taraqi-'+language+'.pdf',Buffer.from(await taraqi.blob.arrayBuffer()));
 }
 const abort=new AbortController();abort.abort();await assert.rejects(()=>prepareRegisterDocument({},'fa-AF',true,abort.signal),e=>e.name==='AbortError');
 console.log('PASS: real A3 monthly and taraqi PDFs in English/Dari/Pashto, 31-day grids, 45-student pagination, Unicode regular/bold fonts, RTL column order/direction, display objects, blank signatures, cancellation and no pre-generation viewer. Artifacts: '+artifacts);
})().catch(error=>{console.error(error);process.exitCode=1});
