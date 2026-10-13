const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const Module=require('node:module');
const projects=process.env.PDF_AUDIT_PROJECTS||path.resolve(__dirname,'../../..');const core=projects+'/digitalmaktab-spa-core';const app=projects+'/digitalmaktab-spa/node_modules';
const {JSDOM}=require(app+'/jsdom');const dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,file);
const original=Module._load;Module._load=function(request,parent,isMain){if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react');const {render,fireEvent,cleanup,act}=require(app+'/@testing-library/react');const {I18nextProvider}=require(app+'/react-i18next');const i18n=require(app+'/i18next').createInstance();const h=React.createElement;
const preferences=require(core+'/src/pdf/tableSettings.ts');const Modal=require(core+'/src/components/table/AppTablePrintSettings.tsx').default;
const columns=[{header:'Name',accessor:'name',printByDefault:true},{header:'Photo',accessor:'photoPath',printByDefault:false},{header:'Actions',accessor:'id',printByDefault:false},{header:'Date',accessor:'creationDate',printByDefault:true},{header:'Hidden',accessor:'secret',hidden:true,printByDefault:true}];
const signIn=(id,role=3)=>localStorage.setItem('user',JSON.stringify({role,teacher:{id,email:id+'@example.test'},token:'session-'+id}));
(async()=>{
 await i18n.init({lng:'en-US',resources:{'en-US':{translation:JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json'))}},interpolation:{escapeValue:false}});
 localStorage.clear();signIn('alice');const alice=preferences.getPdfPreferenceUserKey();assert(alice);
 assert.deepEqual(preferences.defaultPdfSettings(columns).selectedColumns,[0,3]);assert.deepEqual(preferences.defaultPdfSettings([{header:'Old table',accessor:'name'}]).selectedColumns,[0]);
 preferences.savePdfSettings('roster',columns,{pageSize:'letter',orientation:'landscape',selectedColumns:[0,1,3,4]});
 assert.deepEqual(preferences.loadPdfSettings('roster',columns).selectedColumns,[0,1,3]);
 // Another account starts with table defaults, not Alice's choices or legacy shared settings.
 localStorage.setItem('dm-pdf-settings:roster',JSON.stringify({version:1,pageSize:'legal',orientation:'landscape',columns:[':photoPath:Photo']}));signIn('bob');
 assert.deepEqual(preferences.loadPdfSettings('roster',columns),preferences.defaultPdfSettings(columns));
 preferences.savePdfSettings('roster',columns,{pageSize:'legal',orientation:'portrait',selectedColumns:[3]});
 signIn('alice');assert.equal(preferences.getPdfPreferenceUserKey(),alice);assert.equal(preferences.loadPdfSettings('roster',columns).pageSize,'letter');
 const user=JSON.parse(localStorage.getItem('user'));user.token='renewed-session';localStorage.setItem('user',JSON.stringify(user));assert.equal(preferences.getPdfPreferenceUserKey(),alice);
 assert.deepEqual(preferences.loadPdfSettings('other-table',columns),preferences.defaultPdfSettings(columns));
 // Preferences survive translated headings and column reordering.
 assert.deepEqual(preferences.loadPdfSettings('roster',[columns[3],{...columns[0],header:'نام'},columns[1],columns[2]]).selectedColumns,[0,1,2]);
 localStorage.removeItem('user');const count=localStorage.length;preferences.savePdfSettings('anonymous',columns,{pageSize:'legal',orientation:'portrait',selectedColumns:[1]});assert.equal(localStorage.length,count);assert.deepEqual(preferences.loadPdfSettings('roster',columns),preferences.defaultPdfSettings(columns));
 localStorage.setItem('user','invalid');assert.equal(preferences.getPdfPreferenceUserKey(),null);
 localStorage.setItem('user',JSON.stringify({role:5,rootUser:{email:'Root@Example.test'}}));const root=preferences.getPdfPreferenceUserKey();assert(root);localStorage.setItem('user',JSON.stringify({role:5,rootUser:{email:'root@example.test'}}));assert.equal(preferences.getPdfPreferenceUserKey(),root);
 // The real modal restores only the current user's defaults and preserves the screen's columns.
 signIn('alice');const view=()=>h(I18nextProvider,{i18n},h(Modal,{isVisible:true,onClose:()=>{},columns,preferenceKey:'roster',onExport:async()=>{throw new Error('not needed')}}));
 const ui=render(view());assert(ui.getByRole('checkbox',{name:'Photo'}).checked);assert(!ui.getByRole('checkbox',{name:'Actions'}).checked);assert(!ui.queryByRole('checkbox',{name:'Hidden'}));
 fireEvent.click(ui.getByRole('button',{name:i18n.t('report.settings.resetPreferences')}));assert(ui.getByRole('checkbox',{name:'Name'}).checked);assert(ui.getByRole('checkbox',{name:'Date'}).checked);assert(!ui.getByRole('checkbox',{name:'Photo'}).checked);assert.equal(preferences.loadPdfSettings('roster',columns).pageSize,'a4');
 signIn('bob');await act(async()=>ui.rerender(view()));assert.equal(ui.getByLabelText(i18n.t('report.settings.pageSize')).value,'legal');assert(!ui.getByRole('checkbox',{name:'Name'}).checked);assert(ui.getByRole('checkbox',{name:'Date'}).checked);cleanup();
 // Record routes share a table preference instead of requiring a new selection for each record.
 signIn('alice');const {MemoryRouter,Routes,Route,Link}=require(app+'/react-router-dom');const AppTable=require(core+'/src/components/table/AppTable.tsx').default;
 const routeUi=render(h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:['/students/first']},h(Routes,null,h(Route,{path:'/students/:studentId',element:h(React.Fragment,null,h(AppTable,{columns,data:[{id:'first',name:'Alice',creationDate:'2026-10-13'}],totalPages:1}),h(Link,{to:'/students/second'},'Next record'))})))));
 const show=()=>fireEvent.click(routeUi.getByRole('button',{name:i18n.t('report.print.tooltip')}));show();assert(!routeUi.getByRole('checkbox',{name:'Photo'}).checked);fireEvent.click(routeUi.getByRole('checkbox',{name:'Photo'}));fireEvent.click(routeUi.getByRole('button',{name:i18n.t('report.settings.cancel')}));
 fireEvent.click(routeUi.getByRole('link',{name:'Next record'}));show();assert(routeUi.getByRole('checkbox',{name:'Photo'}).checked);cleanup();
 // Representative actual app schemas use reviewed defaults: student names/classes, rendered statuses, no action/photo columns.
 const readColumns=file=>{const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);const result=[];const visit=node=>{if(ts.isObjectLiteralExpression(node)){const props=Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).map(property=>[property.name.getText(source).replace(/['"]/g,''),property.initializer]));if(props.header&&props.accessor&&ts.isStringLiteral(props.accessor))result.push({header:props.header.getText(source),accessor:props.accessor.text,printByDefault:props.printByDefault?.kind===ts.SyntaxKind.TrueKeyword})}ts.forEachChild(node,visit)};visit(source);return result};
 const student=readColumns(projects+'/digitalmaktab-spa/src/screens/school/student/StudentList.tsx');assert.deepEqual(student.filter(column=>column.printByDefault).map(column=>column.accessor),['firstNameNative','lastNameNative','fatherNameNative','grandFatherNameNative','asasNumber','joiningClass']);
 const fees=readColumns(projects+'/digitalmaktab-spa/src/screens/student/StudentFees.tsx');assert(fees.find(column=>column.accessor==='id').printByDefault);
 console.log('PASS: predefined print columns, optional photos/actions, hidden-field exclusion, manual overrides, Restore defaults, account/table isolation, logout/login/token renewal, legacy shared preference exclusion, translated/reordered columns, root account fallback, and actual student/fee table presets.');
})().catch(error=>{console.error(error);process.exitCode=1});
