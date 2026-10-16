const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
let wireUser;const original=Module._load;Module._load=function(request,parent,isMain){if(request==='./client'&&parent.filename===core+'/src/api/auth.ts')return {__esModule:true,default:{post:async()=>({status:200,headers:{},data:wireUser})}};if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup}=require(app+'/@testing-library/react'),{MemoryRouter,Routes,Route}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const {normalizeUserRole}=require(core+'/src/helper/auth/normalizeUser.ts'),{getUser,saveUser}=require(core+'/src/helper/helper.ts'),auth=require(core+'/src/api/auth.ts').default,{AuthContext,AuthProvider}=require(core+'/src/helper/auth/AuthProvider.tsx'),AuthRoute=require(core+'/src/helper/auth/AuthRoute.tsx').default,Sidebar=require(core+'/src/components/AppSideBar.tsx').default,Provider=require(core+'/src/modules/ApplicationModuleProvider.tsx').default;
const country={id:'AF',scope:{countryCode:'AF'},sidebar:{sections:()=>[{title:'Afghanistan',items:[{label:'Afghan register',link:'/afghanistan/student-register',roles:[0],icon:null}]}]}};
const probe=()=>{const value=React.useContext(AuthContext);return h(React.Fragment,null,h('p',null,'Role '+value.userRole),h('button',{onClick:()=>value.login(wireUser)},'Sign in'),h('button',{onClick:value.logout},'Sign out'))};
const tree=()=>h(I18nextProvider,{i18n},
 h(MemoryRouter,{initialEntries:['/home']},
  h(AuthProvider,null,
   h(Provider,{modules:[country]},h(probe),h(Sidebar,{isOpen:true}),
    h(Routes,null,
     h(Route,{element:h(AuthRoute,{requiredRole:0})},h(Route,{path:'/home',element:h('p',null,'Admin page')})),
     h(Route,{path:'/unauthorized',element:h('p',null,'Denied')}),
     h(Route,{path:'/login',element:h('p',null,'Login page')}))))));
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 const roles=['ADMIN','PRINCIPAL','HEAD_MASTER','TEACHER','STUDENT','ROOT_USER','PARENT','UNKNOWN'];for(const [value,name] of roles.entries()){assert.equal(normalizeUserRole(name),value);assert.equal(normalizeUserRole(value),value);assert.equal(normalizeUserRole(String(value)),value)}for(const value of [-1,8,1.2,NaN,null,undefined,'','OWNER','__proto__'])assert.equal(normalizeUserRole(value),7);
 wireUser={token:'test',role:'ADMIN',school:{id:'austria',countryCode:'AT'}};const response=await auth.login('admin.at@demo.local','test');assert.equal(response.data.role,0);assert.equal(wireUser.role,'ADMIN');
 // Repair an existing named-role session on reload; no country module is needed for Core menus.
 localStorage.setItem('user',JSON.stringify(wireUser));assert.equal(getUser().role,0);let ui=render(tree());await waitFor(()=>assert(ui.getByText('Admin page')));assert(ui.container.querySelector('aside a[href="/home"]'));assert(!ui.container.querySelector('aside a[href^="/afghanistan/"]'));assert(ui.getByText('Role 0'));cleanup();
 // The shared provider normalizes alternate login paths as well as API logins.
 saveUser({...wireUser,role:0});ui=render(tree());await waitFor(()=>assert(ui.getByText('Admin page')));fireEvent.click(ui.getByRole('button',{name:'Sign out'}));wireUser={...wireUser,school:{id:'afghan',countryCode:'AF'}};fireEvent.click(ui.getByRole('button',{name:'Sign in'}));await waitFor(()=>assert(ui.container.querySelector('aside a[href="/afghanistan/student-register"]')));assert.equal(JSON.parse(localStorage.getItem('user')).role,0);assert(ui.container.querySelector('aside a[href="/home"]'));cleanup();
 // ADMIN is enum zero: it must still protect admin routes against every other role.
 for(const role of ['TEACHER','UNKNOWN','invalid']){localStorage.setItem('user',JSON.stringify({...wireUser,role,school:{id:'at',countryCode:'AT'}}));ui=render(tree());await waitFor(()=>assert(ui.getByText('Denied')));assert(!ui.queryByText('Admin page'));cleanup()}
 localStorage.setItem('user','{bad');assert.equal(getUser(),null);localStorage.setItem('user','null');assert.equal(getUser(),null);localStorage.clear();
 console.log('PASS: named/numeric API roles, saved sessions, alternate logins and all role values normalize consistently; Austria retains Core menus, Afghanistan adds its own, and enum-zero admin routes reject other roles.');
})().catch(error=>{console.error(error);process.exitCode=1});
