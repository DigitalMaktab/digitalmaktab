// Render actual country forms beside Core controls and compare real Chrome styles.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const projects=path.resolve(__dirname,'../../..'),app=projects+'/digitalmaktab-spa/node_modules',core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',webpack=require(app+'/webpack');
const work=fs.mkdtempSync(path.join(os.tmpdir(),'digitalmaktab-afghan-forms-')),chrome=process.env.MODAL_TEST_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json'))}};
const components={AppBaseEditor:'AppBaseEditor',AppFormInput:'form/AppFormInput',AppEnumSelect:'form/AppEnumSelect',AppFormSectionContainer:'form/AppFormSectionContainer',AppFormLocalDatePicker:'form/AppFormLocalDatePicker',AppAlert:'AppAlert',AppButton:'AppButton',AppCard:'card/AppCard',AppStandaloneInput:'input/AppStandaloneInput',AppCalendarGrid:'calendar/AppCalendarGrid'};
fs.writeFileSync(work+'/core-boundary.tsx',Object.entries(components).map(([name,file])=>`export {default as ${name}} from ${JSON.stringify(core+'/src/components/'+file+'.tsx')};`).join('\n')+`
export {useAppLocalizer} from ${JSON.stringify(core+'/src/hooks/useAppLocalizer.ts')};
const year={id:'year',solarHijriYear:1405,fromDate:'2026-03-21',toDate:'2027-03-20',isActive:true};
export const apiClient={get:async(url,config)=>{window.reads=(window.reads||0)+1;return {data:url.includes('academic-years')?[year]:url.includes('teacher-details')?{teacherId:'teacher',firstNameNative:'معلم',maritalStatus:1,hireDate:'2025-03-21T00:00:00Z'}:{studentId:'student',firstNameNative:'احمد',bloodGroup:0,asasNumber:7}}},put:async()=>{window.saves=(window.saves||0)+1;return {data:{}}},post:async()=>{window.saves=(window.saves||0)+1;return {data:{}}}};
`);
fs.writeFileSync(work+'/entry.tsx',`
import React from 'react';import {createRoot} from 'react-dom/client';import {I18nextProvider} from 'react-i18next';import i18n from 'i18next';import {MemoryRouter} from 'react-router-dom';
import {AppBaseEditor,AppFormInput,AppEnumSelect} from './core-boundary';
import Student from ${JSON.stringify(country+'/src/AfghanStudentDetailsEditor.tsx')};import Teacher from ${JSON.stringify(country+'/src/AfghanTeacherDetailsEditor.tsx')};
import Year from ${JSON.stringify(country+'/src/academicYears/AfghanAcademicYearEditor.tsx')};import Exam from ${JSON.stringify(country+'/src/examPeriods/AfghanExamPeriodEditor.tsx')};
import {CalendarProvider} from ${JSON.stringify(core+'/src/contexts/CalendarContext.tsx')};import {afghanistanCalendar} from ${JSON.stringify(country+'/src/calendarModule.ts')};
const params=new URLSearchParams(location.search),language=params.get('lang')||'fa-AF',kind=params.get('kind')||'student',dark=params.get('theme')==='dark';
document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.bsTheme=dark?'dark':'light';document.documentElement.dir=language==='en-US'?'ltr':'rtl';document.documentElement.lang=language;
const app=kind==='student'?<Student studentId="student"/>:kind==='teacher'?<Teacher teacherId="teacher"/>:kind==='year'?<Year/>:<Exam/>;
i18n.init({lng:language,resources:${JSON.stringify(resources)},interpolation:{escapeValue:false}}).then(()=>{
createRoot(document.getElementById('root')).render(<I18nextProvider i18n={i18n}><MemoryRouter><CalendarProvider value={afghanistanCalendar}><main className="container-fluid">
<section id="core-probe"><AppBaseEditor initialData={{}} initialFormData={{coreInput:'',coreSelect:''}} validationSchemaConfig={{coreInput:{label:'Core input'},coreSelect:{label:'Core select'}}} title={()=>'Core reference controls'} onSubmit={async()=>{}}><div className="row"><div className="col-md-6"><AppFormInput name="coreInput" label="Core input"/></div><div className="col-md-6"><AppEnumSelect name="coreSelect" label="Core select" options={['A_PLUS','B_MINUS']} renderLabel={value=>value}/></div></div></AppBaseEditor></section>
<section id="country-form">{app}</section></main></CalendarProvider></MemoryRouter></I18nextProvider>);
window.afKind=kind;
window.controlState=()=>{const field=(kind==='student'||kind==='teacher')?'firstNameNative':kind==='year'?'solarHijriYear':'fromDate';const actual=document.querySelector('#country-form #'+field),probe=document.getElementById('coreInput');if(!actual)return null;
const properties=['height','fontSize','fontFamily','fontWeight','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','borderRadius','borderTopWidth','backgroundColor','color'];
const style=node=>{if(!node)return null;const css=getComputedStyle(node);return Object.fromEntries(properties.map(key=>[key,css[key]]));};
const select=kind==='student'?'bloodGroup':kind==='teacher'?'maritalStatus':kind==='exam'?'examType':null;
const invalid=kind==='student'?'asasNumber':kind==='teacher'?'bast':kind==='year'?'solarHijriYear':'toDate';
return {kind,dir:document.documentElement.dir,lang:document.documentElement.lang,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,input:style(actual),reference:style(probe),select:select?style(document.querySelector('#'+select+' + .select2 .select2-selection')):null,referenceSelect:style(document.querySelector('#coreSelect + .select2 .select2-selection')),hasSelect:!!select,nativeSelectHidden:select?getComputedStyle(document.getElementById(select)).position==='absolute':true,invalid:document.getElementById(invalid)?.getAttribute('aria-invalid'),error:!!document.getElementById(invalid+'-error'),probeError:!!document.getElementById('coreInput-error'),probeSelectError:document.querySelector('#coreSelect + .select2 .select2-selection')?.getAttribute('aria-invalid'),inputBorder:getComputedStyle(probe).borderTopColor,selectBorder:getComputedStyle(document.querySelector('#coreSelect + .select2 .select2-selection')).borderTopColor,reads:window.reads||0,saves:window.saves||0};};
window.validateForm=async()=>{const field=kind==='student'?'asasNumber':kind==='teacher'?'bast':kind==='year'?'solarHijriYear':null;if(field){const node=document.getElementById(field);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(node,kind==='year'?'999':'12abc');node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));}await new Promise(resolve=>setTimeout(resolve,50));for(const form of document.querySelectorAll('form'))form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));};
});
`);
const config={mode:'development',entry:work+'/entry.tsx',output:{path:work,filename:'bundle.js'},devtool:false,resolve:{extensions:['.ts','.tsx','.js','.jsx'],modules:[app,core+'/node_modules','node_modules'],alias:{'@digitalmaktab/spa-core$':work+'/core-boundary.tsx',react:app+'/react','react-dom':app+'/react-dom','react-i18next':app+'/react-i18next',i18next:app+'/i18next',formik:app+'/formik',jquery:core+'/node_modules/jquery'}},module:{rules:[{test:/\.[jt]sx?$/,exclude:/node_modules/,use:{loader:app+'/babel-loader',options:{presets:[[app+'/@babel/preset-env',{targets:{chrome:'100'}}],[app+'/@babel/preset-react',{runtime:'automatic'}],[app+'/@babel/preset-typescript',{allExtensions:true,isTSX:true}]]}}}]},plugins:[new webpack.DefinePlugin({'process.env.PUBLIC_URL':JSON.stringify('')})]};
webpack(config,async(error,stats)=>{
let browser,socket;
try{
if(error)throw error;assert(!stats.hasErrors(),stats.toString({all:false,errors:true}));
fs.writeFileSync(work+'/index.html','<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+fs.readFileSync(projects+'/digitalmaktab-spa/node_modules/select2/dist/css/select2.min.css','utf8') + fs.readFileSync(projects+'/digitalmaktab-spa/src/App.css','utf8').replace(/@import[^;]+;/g,'')+'</style></head><body><div id="root"></div><script src="bundle.js"></script></body></html>');
browser=spawn(chrome,['--headless','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--remote-debugging-port=0','--user-data-dir='+work+'/profile','about:blank'],{stdio:['ignore','ignore','pipe']});browser.stderr.pipe(fs.createWriteStream(work+'/chrome.log'));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));for(let attempt=0;!fs.existsSync(work+'/profile/DevToolsActivePort');attempt++){assert(attempt<100,'Chrome did not start');await wait(100)}
const port=fs.readFileSync(work+'/profile/DevToolsActivePort','utf8').split('\n')[0],version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();socket=new WebSocket(version.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
let sequence=0;const pending=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){const {resolve,reject}=pending.get(message.id);pending.delete(message.id);message.error?reject(new Error(JSON.stringify(message.error))):resolve(message.result)}});
const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,sessionId}))});
const {targetId}=await send('Target.createTarget',{url:'about:blank'}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});await send('Page.enable',{},sessionId);
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId)).result.value;
for(const kind of ['student','teacher','year','exam'])for(const [language,theme,width] of [['en-US','light',1280],['fa-AF','dark',1280],['ps-AF','dark',360]]){
const name=kind+'-'+language+'-'+theme+'-'+width;await send('Emulation.setDeviceMetricsOverride',{width,height:800,deviceScaleFactor:1,mobile:false},sessionId);await send('Page.navigate',{url:'file://'+work+'/index.html?kind='+kind+'&lang='+language+'&theme='+theme},sessionId);
let state;for(let attempt=0;attempt<100;attempt++){state=await evaluate('window.controlState?.()');if(state)break;await wait(100)}
assert(state,'No form rendered: '+name);assert.deepEqual(state.input,state.reference,'Input differs from Core: '+name);if(state.hasSelect){assert(state.select,'Select2 missing: '+name);assert(state.nativeSelectHidden,'Native select should be hidden: '+name);assert.deepEqual(state.select,state.referenceSelect,'Select differs from Core: '+name)}
assert.equal(state.dir,language==='en-US'?'ltr':'rtl');assert(state.scrollWidth<=width+1,'Form overflow: '+JSON.stringify(state));
const reads=state.reads;await evaluate('window.validateForm()');for(let attempt=0;attempt<50;attempt++){state=await evaluate('window.controlState()');if(state.error)break;await wait(50)}
await wait(250);state=await evaluate('window.controlState()');
assert.equal(state.invalid,'true','Missing invalid field styling: '+name);assert(state.error&&state.probeError,'Field errors missing: '+name);assert.equal(state.probeSelectError,'true');assert.equal(state.inputBorder,state.selectBorder,'Validation borders differ: '+name);assert.equal(state.saves,0,'Invalid values were saved: '+name);assert.equal(state.reads,reads,'Validation caused extra reads: '+name);
fs.writeFileSync(work+'/'+name+'.json',JSON.stringify(state,null,2));const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},sessionId);fs.writeFileSync(work+'/'+name+'.png',Buffer.from(shot.data,'base64'));
console.log('PASS: '+name+'; inputs/selects match Core styles, field errors block saving, no repeated reads.');
}
console.log('Form comparison artifacts: '+work);
}catch(error){console.error(error);console.error('Form comparison artifacts: '+work);process.exitCode=1}finally{socket?.close();browser?.kill('SIGTERM')}
});
