const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let data,calls=0,lastSignal;const original=Module._load;
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core')return {};
 if(request==='../api/client'&&parent.filename.endsWith('/AppBreadCrumb.tsx'))return {__esModule:true,default:{get:async(url,config)=>{assert.equal(url,'/main/activeCalendarYear');calls++;lastSignal=config.signal;return {data};}}};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,cleanup,waitFor,act}=require(app+'/@testing-library/react'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{CalendarProvider,gregorianCalendar}=require(core+'/src/contexts/CalendarContext.tsx'),{afghanistanCalendar}=require(country+'/src/calendarModule.ts'),Banner=require(core+'/src/components/AppBreadCrumb.tsx').default,{prioritizeDashboard}=require(core+'/src/modules/definitions.ts');
const view=(calendar,role=0)=>render(h(I18nextProvider,{i18n},h(AuthContext.Provider,{value:{userRole:role,user:{role,school:{id:'school'},teacher:{id:'teacher'},student:{id:'student'},parent:{id:'parent'},staff:{id:'staff'},rootUser:{id:'root'}}}},h(CalendarProvider,{value:calendar},h(Banner)))));
(async()=>{
 const resources={};for(const locale of ['en-US','fa-AF','ps-AF'])resources[locale]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+locale+'/translation.json'))}};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const route of ['/home','/dashboard','/teacher-dashboard','/student-dashboard','/parent-dashboard','/staff-home']){
  const sections=[{title:'General',items:[{label:'AI',link:'/ai-assistant'},{label:'Tickets',link:'/tickets'}]},{title:'Module',items:[{label:'Other',link:'/module'},{label:'Dashboard',link:route}]}];
  const ordered=prioritizeDashboard(sections);assert.equal(ordered[0].items[0].link,route);assert.equal(sections[0].items[0].link,'/ai-assistant');assert.equal(ordered.flatMap(s=>s.items).length,4);
 }
 for(const native of ['1405','۱۴۰۵','١٤٠٥'])assert.equal(afghanistanCalendar.formatAcademicYear(new Date('2026-01-01T12:00:00'),native,'en-US'),'1405');
 assert.equal(afghanistanCalendar.formatAcademicYear(new Date('2026-03-21T12:00:00'),'2026','en-US'),'1405');
 for(const locale of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(locale);
  for(const role of [0,1,2,3,4,5,6,8]){
   data={id:'year',year:'2026-03-21',nativeYear:'1405',academicSummary:{displayName:'School year name',fromDate:'2026-03-21',toDate:'2027-03-20'}};
   const start=calls,ui=view(afghanistanCalendar,role);await waitFor(()=>assert(ui.container.querySelector('section')));
   assert.equal(ui.container.querySelector('bdi').textContent,new Intl.NumberFormat(locale,{useGrouping:false}).format(1405));
   assert(ui.container.textContent.includes(i18n.t('academicYearBanner.system.SOLAR_HIJRI')));assert(ui.container.textContent.includes('School year name'));assert(ui.container.textContent.includes(afghanistanCalendar.formatDate(new Date('2026-03-21T12:00:00'),locale)));assert(ui.container.textContent.includes(afghanistanCalendar.formatDate(new Date('2027-03-20T12:00:00'),locale)));assert(!ui.container.textContent.includes('academicYearBanner.'));assert.equal(ui.container.querySelector('section').dir,i18n.dir());
   await act(async()=>{ui.rerender(h(I18nextProvider,{i18n},h(AuthContext.Provider,{value:{userRole:role,user:{role,school:{id:'school'},teacher:{id:'teacher'},student:{id:'student'},parent:{id:'parent'},staff:{id:'staff'},rootUser:{id:'root'}}}},h(CalendarProvider,{value:afghanistanCalendar},h(Banner)))))});
   assert.equal(calls,start+1);cleanup();assert(lastSignal.aborted);
  }
 }
 await i18n.changeLanguage('en-US');data={year:'2026-01-01',nativeYear:'1405'};
 let ui=view(gregorianCalendar);await waitFor(()=>assert(ui.container.querySelector('bdi')));assert.equal(ui.container.querySelector('bdi').textContent,'2026');assert(ui.container.textContent.includes('Today:'));cleanup();
 const start=calls;ui=view(afghanistanCalendar,9);assert.equal(ui.container.textContent,'');assert.equal(calls,start);cleanup();
 data=null;ui=view(gregorianCalendar);await act(async()=>{});assert.equal(ui.container.textContent,'');cleanup();
 console.log('PASS: dashboard precedence for every dashboard route, Afghan legacy/localized years, Gregorian isolation, three languages, all dashboard roles, configured dates/name, fallback, empty data, cancellation and bounded requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
