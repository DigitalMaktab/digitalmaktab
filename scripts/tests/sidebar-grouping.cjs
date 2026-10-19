const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',country=projects+'/digitalmaktab-spa-country-afghanistan',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load,counts={admissionsPendingConversion:3,gradeAppealsStale:2,inventoryLowStock:1};
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/spa-core')return {UserRole:require(core+'/src/models/UserRole.ts').UserRole};
 if(request==='./automation/AutomationQueueContext'&&parent.filename.endsWith('/AppSideBar.tsx'))return {useAutomationQueue:()=>({counts})};
 if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 return original.apply(this,arguments);
};
const React=require(app+'/react'),h=React.createElement,{render,cleanup,fireEvent}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts'),{createCoreSidebarSections}=require(core+'/src/components/sidebar/coreSections.tsx'),{ApplicationModuleContextProvider,composeModuleSidebar}=require(core+'/src/modules/ModuleContext.tsx'),Sidebar=require(core+'/src/components/AppSideBar.tsx').default,{afghanSidebarSections}=require(country+'/src/AfghanSidebarSections.tsx');
const baseline=require('./sidebar-access-baseline.json');
(async()=>{
 const resources={};for(const locale of ['en-US','fa-AF','ps-AF']){const base=JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),countryLocale=JSON.parse(fs.readFileSync(country+'/src/locales/'+locale+'/translation.json'));resources[locale]={translation:locale==='en-US'?base:countryLocale};}
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const locale of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(locale);
  for(const [roleName,expected] of Object.entries(baseline)){
   const role=UserRole[roleName],sections=createCoreSidebarSections(i18n.t.bind(i18n),counts,role);
   const paths=sections.flatMap(section=>section.items.flatMap(item=>item.subMenu?.length?item.subMenu.filter(child=>(child.roles??item.roles).includes(role)).map(child=>child.link):item.roles.includes(role)?[item.link]:[])).sort();
   assert.deepEqual(paths,expected,roleName+' route access changed');
   for(const af of [false,true]){
    const modules=af?[{id:'af',scope:{countryCode:'AF'},sidebar:{sections:t=>afghanSidebarSections(t,{admin:0})}}]:[];
    const ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:role,user:{role}}},h(ApplicationModuleContextProvider,{modules,scope:{countryCode:af?'AF':'AT',role:roleName}},h(Sidebar,{isOpen:true}))))));
    const headings=[...ui.container.querySelectorAll('.sidebar-main-title[aria-label]')].map(e=>e.textContent);assert.equal(headings.length,new Set(headings).size,'Duplicate groups');assert(!ui.container.textContent.includes('sidebar.groups.'));
    const first=ui.container.querySelector('a.sidebar-link');if(!['PRINCIPAL','HEAD_MASTER','SUPPORT_AGENT'].includes(roleName))assert(['\/home','/dashboard','/teacher-dashboard','/student-dashboard','/parent-dashboard'].includes(first.getAttribute('href')),roleName+' dashboard not first');
    if(roleName==='ROOT_USER'||roleName==='SUPPORT_AGENT'){const links=[...ui.container.querySelectorAll('a.sidebar-link')];assert(links.slice(0,2).some(a=>a.getAttribute('href')==='/tickets'));}
    if(roleName==='ADMIN'){
     fireEvent.click(ui.getByText(i18n.t('sidebar.students.label'),{selector:'.sidebar-link span'}));assert(ui.container.querySelector('a[href="/admissions"] .badge').textContent==='3');
     assert.equal(headings[1],i18n.t('sidebar.groups.daily'));assert(headings.indexOf(i18n.t('sidebar.groups.finance'))<headings.indexOf(i18n.t('sidebar.groups.administration')));
     if(af){const people=composeModuleSidebar(sections,modules,i18n.t.bind(i18n)).find(s=>s.group==='people');assert(people.items.some(item=>item.link==='/afghanistan/student-register'));}
    }
    if(!af)assert(!ui.container.querySelector('a[href^="/afghanistan/"]'));cleanup();
   }
  }
 }
 await i18n.changeLanguage('en-US');
 const role=8,user={role,staff:{id:'staff',capabilities:['students.read']}};
 const ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:role,user}},h(Sidebar,{isOpen:true})))));
 assert.equal(ui.container.querySelector('a.sidebar-link').getAttribute('href'),'/staff-home');
 fireEvent.click(ui.getByText(i18n.t('sidebar.students.label'),{selector:'.sidebar-link span'}));assert(ui.container.querySelector('a[href="/student-list"]'));assert(!ui.container.querySelector('a[href="/admissions"]'));assert(!ui.container.querySelector('.sidebar-list .badge'));assert(!ui.container.querySelector('a[href="/teacher-list"]'));cleanup();
 const base=[{group:'daily',order:10,title:'Daily',items:[{label:'Core tool',link:'/core-tool',icon:null,roles:[0]}]},{group:'settings',order:100,title:'Settings',items:[]}];
 const module={id:'school',scope:{schoolId:'one'},sidebar:{sections:()=>[{group:'daily',title:'Daily school',items:[{label:'School tool',link:'/school-tool',icon:null,roles:[0]}]}]}};
 assert(composeModuleSidebar(base,[module],k=>k)[0].items.some(item=>item.link==='/school-tool'));assert.equal(composeModuleSidebar(base,[module],k=>k)[0].title,'Daily');
 console.log('PASS: every existing route and role retained, dashboard first, daily work prioritized, coherent Afghan module groups, three translations, live queue badges, staff capabilities and module grouping.');
})().catch(error=>{console.error(error);process.exitCode=1});
