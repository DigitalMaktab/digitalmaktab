// Inventory source entry points; an inventory is coverage scope, not proof of working persistence.
const fs=require('node:fs'),path=require('node:path');
const projects=path.resolve(__dirname,'../..'),ts=require(projects+'/digitalmaktab-spa-core/node_modules/typescript');
const packages=['digitalmaktab-spa','digitalmaktab-spa-core',...fs.readdirSync(projects).filter(name=>/^digitalmaktab-spa-(country|school)-/.test(name))];
const forms=[],tables=[],writes=[],effects=[],controlledFields=[];
function files(dir){if(!fs.existsSync(dir))return [];return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(path.join(dir,entry.name)):/\.tsx?$/.test(entry.name)?[path.join(dir,entry.name)]:[]);}
for(const pkg of packages)for(const file of files(projects+'/'+pkg+'/src')){
 const source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true, file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS),relative=path.relative(projects,file);
 const entry=node=>({file:relative,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1});
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(ast),attributes=Object.fromEntries(node.attributes.properties.filter(ts.isJsxAttribute).map(attribute=>[attribute.name.getText(ast),attribute.initializer?.getText(ast)??true]));
   if(/^(AppForm|AppFormCard|AppBaseEditor|AppWizardForm|form)$/.test(tag))forms.push({...entry(node),tag,submit:attributes.onSubmit??null,initialValues:attributes.initialValues??attributes.initialData??null,validation:attributes.validationSchema??attributes.validate??attributes.validationSchemaConfig??null});
   if(/^(AppTable|RoleSpecificTable|StudentTable|TeacherTable|ScheduleTable|AttendanceTable|GradeTable)$/.test(tag))tables.push({...entry(node),tag,data:attributes.data??null,loader:attributes.fetchPageData??attributes.fetchData??null,reload:attributes.reloadKey??null});
   if(['AppFormInput','AppFormSelect'].includes(tag)&&(attributes.value||attributes.onChange))controlledFields.push({...entry(node),tag,name:attributes.name,value:attributes.value,onChange:attributes.onChange});
  }
  if(ts.isCallExpression(node)){
   const expression=node.expression.getText(ast);
   if(/\.(post|put|patch|delete)$/.test(expression))writes.push({...entry(node),call:expression,url:node.arguments[0]?.getText(ast),payload:node.arguments[1]?.getText(ast)});
   if(expression==='useEffect')effects.push({...entry(node),dependencies:node.arguments[1]?.getText(ast)??null,body:node.arguments[0]?.getText(ast)});
  }
  ts.forEachChild(node,visit);
 }visit(ast);
}
const inventory={scope:packages,forms,tables,writes,effects,controlledFields};
const output=process.argv[2];if(output)fs.writeFileSync(output,JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify({packages,formSites:forms.length,formFiles:new Set(forms.map(item=>item.file)).size,tableSites:tables.length,mutationCalls:writes.length,effects:effects.length,controlledFields:controlledFields.length},null,2));
if(!output)console.log('Supply an output JSON path for the detailed audit inventory.');
