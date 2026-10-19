const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),Module=require('module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let calls=[], requests=[], writes=0;
let activities=[];
const supportApi={get:async(url,options)=>{
 calls.push({url,options});
 if(url==='/support-requests')return {data:requests,headers:{pagination:JSON.stringify({totalPages:1,totalCount:requests.length})}};
 if(url.startsWith('/support-requests/'))return {data:{ticket:requests[0],activities,allowedActions:['COMMENT']}};
 return {data:{schoolName:'School contact',email:'admin@school.invalid',phoneNumber:'123'}};
},post:async(url,payload)=>{
 writes++;
 if(url.endsWith('/actions')){activities.push({id:'comment',actorEmail:'teacher@school.invalid',action:payload.action,message:payload.message});requests=[{...requests[0],version:'second'}];return {data:{ticket:requests[0],activities,allowedActions:['COMMENT']}};}
 requests=[{...payload,id:'request',version:'first',submittedByEmail:'teacher@school.invalid',state:0,reviewNote:'',creationDate:new Date().toISOString()}];return {data:requests[0]};
}};const original=Module._load;Module._load=function(request,parent,isMain){if(request==='../api/client'&&parent.filename.includes('/information/'))return {__esModule:true,default:supportApi};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,cleanup,waitFor}=require(app+'/@testing-library/react'),{MemoryRouter}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {selectModules}=require(core+'/src/modules/definitions.ts'),{composeInformationMenu,composeInformationSections,safeInformationHref,informationPages}=require(core+'/src/information/registry.ts'),{ApplicationModuleContextProvider}=require(core+'/src/modules/ModuleContext.tsx'),{AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),Footer=require(core+'/src/components/sidebar/AppSidebarFooter.tsx').default,Page=require(core+'/src/information/AppInformationPage.tsx').default;
const af=require(projects+'/digitalmaktab-spa-country-afghanistan/src/information.ts').afghanInformation,at=require(projects+'/digitalmaktab-spa-country-austria/src/index.ts').austriaApplicationModule,afModule={id:'afghanistan',scope:{countryCode:'AF'},information:af};
const renderPage=(component,modules=[],role='ADMIN')=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:role==='ADMIN'?0:3,logout:()=>{},isAuthenticated:true}},h(ApplicationModuleContextProvider,{modules,scope:{countryCode:modules[0]?.scope.countryCode,schoolId:'one',role}},component)))));
(async()=>{
const resources={'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))},'fa-AF':{translation:JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/fa-AF/translation.json'))}};
for(const locale of Object.keys(resources)){Object.assign(resources[locale].translation,at.translations[locale]);if(locale==='en-US')Object.assign(resources[locale].translation,JSON.parse(fs.readFileSync(projects+'/digitalmaktab-spa-country-afghanistan/src/locales/en-US/translation.json')));}
await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
assert.equal(selectModules([afModule,at],{countryCode:'AT'}).length,1);
assert(!safeInformationHref('javascript:alert(1)'));assert(!safeInformationHref('//other.example'));assert(!safeInformationHref('/\\other'));assert(safeInformationHref('https://dsb.gv.at/rechte'));
const base=[{id:'one',titleKey:'base',bodyKeys:['base']}],country={id:'country',scope:{countryCode:'AF'},information:{labelKey:'country',sections:{privacy:[{id:'one',titleKey:'country',bodyKeys:[]}]}}},school={id:'school',scope:{schoolId:'one'},information:{labelKey:'school',sections:{privacy:[{id:'one',titleKey:'school',bodyKeys:[]}]},removeMenuIds:['terms']}};
assert.equal(composeInformationSections('privacy',base,[country,school],'ADMIN')[0].titleKey,'school');assert(!composeInformationMenu([school],'ADMIN').some(item=>item.id==='terms'));
for(const [modules,name] of [[[afModule],'Afghanistan'],[[at],'Austria'],[[],'Core']]){
 const menu=composeInformationMenu(modules,'ADMIN');assert(menu.some(item=>item.path==='/guide'));assert(menu.some(item=>item.path==='/faq'));assert(menu.every(item=>item.path));
 for(const locale of ['en-US','fa-AF']){await i18n.changeLanguage(locale);for(const page of Object.keys(informationPages).filter(page=>page!=='resources'||modules.length)){
  const ui=renderPage(h(Page,{page}),modules);await waitFor(()=>assert(ui.container.querySelector('article')));
  assert(ui.container.querySelectorAll('section').length>0,`${name} ${page}`);assert(!ui.container.textContent.includes('information.content.'));assert.equal(ui.container.querySelector('article').dir,locale==='fa-AF'?'rtl':'ltr');
  if(page==='privacy'&&name==='Austria')assert(ui.container.querySelector('a[href^="https://dsb.gv.at"]'));
  if(name==='Austria')assert(!ui.container.querySelector('a[href*="moe.gov.af"]'));if(name==='Afghanistan')assert(!ui.container.querySelector('a[href*="dsb.gv.at"]'));cleanup();
 }}
}
await i18n.changeLanguage('en-US');let ui=renderPage(h(Footer,{isOpen:true}),[at]);fireEvent.click(ui.getByRole('button',{name:'Information'}));assert.equal(ui.getAllByRole('navigation')[0].querySelectorAll('a').length,12);assert.equal(ui.getByRole('link',{name:i18n.t('tickets.title')}).getAttribute('href'),'/tickets');assert(ui.getByRole('link',{name:i18n.t('sidebar.footer.menu.faq')}));fireEvent.keyDown(document,{key:'Escape'});assert(!ui.queryByRole('navigation'));assert.equal(document.activeElement.getAttribute('aria-label'),'Information');fireEvent.click(ui.getByRole('button',{name:'Information'}));fireEvent.pointerDown(document.body);assert(!ui.queryByRole('navigation'));cleanup();
ui=renderPage(h(Footer,{isOpen:true}),[], 'TEACHER');assert.equal(ui.getByRole('link',{name:'Profile'}).getAttribute('href'),'/my-profile');cleanup();
assert(calls.every(call=>call.options.headers['Cache-Control']==='no-store'));
const Support=require(core+'/src/information/AppSupportRequests.tsx').default;
ui=renderPage(h(Support,{kind:1}),[at]);await waitFor(()=>assert(calls.some(call=>call.url==='/support-requests')));
fireEvent.click(ui.getByRole('button',{name:i18n.t('tickets.create')}));
fireEvent.submit(ui.getByRole('dialog').querySelector('form'));await waitFor(()=>assert(ui.container.querySelector('.is-invalid')));assert.equal(writes,0);
fireEvent.change(ui.getByRole('dialog').querySelector('[name="subject"]'),{target:{value:'Print issue'}});fireEvent.change(ui.getByRole('dialog').querySelector('[name="message"]'),{target:{value:'Steps to reproduce'}});fireEvent.submit(ui.getByRole('dialog').querySelector('form'));
await waitFor(()=>assert.equal(writes,1));await waitFor(()=>assert(ui.getByRole('dialog').textContent.includes('Steps to reproduce')));
fireEvent.change(ui.getByRole('dialog').querySelector('[name="message"]'),{target:{value:'Still happens in dark mode'}});fireEvent.submit(ui.getByRole('dialog').querySelector('form'));
await waitFor(()=>assert.equal(writes,2));await waitFor(()=>assert(ui.getByText('Still happens in dark mode')));assert(calls.some(call=>call.url==='/support-requests/request'));cleanup();
console.log('PASS: complete information pages in English/Dari, RTL, active-country resources, school overrides, roles, safe links, every footer link, Escape/outside focus behavior and bounded school contact requests.');
})().catch(error=>{console.error(error);process.exitCode=1});
