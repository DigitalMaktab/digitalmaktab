const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),Module=require('module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,waitFor,cleanup}=require(app+'/@testing-library/react'),{MemoryRouter,Route,Outlet}=require(app+'/react-router-dom');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),RoleRoutes=require(core+'/src/helper/auth/AppRoleRoutes.tsx').default,AuthRoute=require(core+'/src/helper/auth/AuthRoute.tsx').default,{UserRole}=require(core+'/src/models/UserRole.ts');
// Read the shell's actual route tree. Stub page contents, retain real route matching and auth guards.
const source=ts.createSourceFile('App.tsx',fs.readFileSync(projects+'/digitalmaktab-spa/src/App.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let routeRoot;function find(node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(source)==='AppRoleRoutes')routeRoot=node;ts.forEachChild(node,find)}find(source);assert(routeRoot);
const opening=node=>ts.isJsxElement(node)?node.openingElement:node;
function attributes(node){const result={};for(const attr of opening(node).attributes.properties){if(!ts.isJsxAttribute(attr))continue;let value=attr.initializer;if(value&&ts.isJsxExpression(value))value=value.expression;result[attr.name.getText(source)]=value}return result}
function convert(node,index){const props=attributes(node),children=ts.isJsxElement(node)?node.children.filter(child=>(ts.isJsxElement(child)||ts.isJsxSelfClosingElement(child))&&opening(child).tagName.getText(source)==='Route'):[];
 const element=props.element,component=element&&opening(element).tagName.getText(source);let content;
 if(component==='AuthRoute'){const required=attributes(element).requiredRole;content=h(AuthRoute,{requiredRole:required?UserRole[required.name.text]:undefined})}
 else content=children.length?h(Outlet):h('p',null,component||'Empty page');
 return h(Route,{key:index,path:props.path?.text,index:props.index?true:undefined,element:content},...children.map(convert));
}
const routes=routeRoot.children.filter(node=>(ts.isJsxElement(node)||ts.isJsxSelfClosingElement(node))&&opening(node).tagName.getText(source)==='Route').map(convert);
const view=(role,url,isAuthenticated=true)=>render(h(MemoryRouter,{initialEntries:[url]},h(AuthContext.Provider,{value:{isAuthenticated,userRole:role,user:role==null?null:{role,staff:{capabilities:[]}}}},h(RoleRoutes,null,routes))));
(async()=>{
 for(const role of [null,0,1,2,3,4,5,6,7,8]){const ui=view(role,'/',role!=null);await waitFor(()=>assert(ui.getByText('PublicScreen'),'root was shadowed for role '+role));cleanup()}
 for(const [role,url,page] of [[0,'/home','SchoolDashboard'],[3,'/teacher-dashboard','TeacherDashboard'],[4,'/student-dashboard','StudentDashboard'],[5,'/dashboard','Dashboard'],[6,'/parent-dashboard','ParentDashboard'],[8,'/staff-home','AppStaffHome']]){const ui=view(role,url);await waitFor(()=>assert(ui.getByText(page)));cleanup()}
 const denied=view(4,'/home');await waitFor(()=>assert(denied.getByText('Unauthorized')));cleanup();
 console.log('PASS: actual shell routes render the public root for visitors and every account type; role dashboards still match and protected routes stay guarded.');
})().catch(error=>{console.error(error);process.exitCode=1});
