const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return {};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const {gregorianCalendar}=require(core+'/src/contexts/CalendarContext.tsx'),{afghanistanCalendar}=require(projects+'/digitalmaktab-spa-country-afghanistan/src/calendarModule.ts'),mobile=require(projects+'/digitalmaktab-mobile-country-afghanistan/src/calendar/solarHijriAdapter.ts').afghanistanCalendar;
const instant=new Date('2026-10-19T21:00:00Z');
for(const locale of ['en-US','fa-AF','ps-AF'])for(const timeZone of ['Asia/Kabul','Europe/Vienna','UTC']){
 const opts={dateStyle:'short',timeStyle:'short',timeZone};
 assert.equal(gregorianCalendar.formatDate(instant,locale,opts),new Intl.DateTimeFormat(locale,{...opts,calendar:'gregory'}).format(instant));
 const time=new Intl.DateTimeFormat(locale,{timeStyle:'short',timeZone}).format(instant);
 for(const calendar of [afghanistanCalendar,mobile]){
  assert.equal(calendar.formatDate(instant,locale,{timeStyle:'short',timeZone}),time);
  const output=calendar.formatDate(instant,locale,opts);assert(output.endsWith(time));
  const nf=new Intl.NumberFormat(locale,{useGrouping:false,numberingSystem:locale.startsWith('en')?'latn':'arabext'});
  assert(output.startsWith(nf.format(timeZone==='Asia/Kabul'?28:27)+' '),'Native date did not follow timezone: '+output);
  assert(output.includes(nf.format(1405)));
 }
}
console.log('PASS: Gregorian and Solar Hijri SPA/mobile timestamps, three languages, explicit zones, time-only formatting and crossing midnight.');
