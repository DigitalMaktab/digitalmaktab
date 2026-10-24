// Actual grade editors and Core comparison/forms. PostgreSQL races are covered separately.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-spa-core',shell=projects+'/digitalmaktab-spa',app=shell+'/node_modules';
const {JSDOM}=require(app+'/jsdom'),dom=new JSDOM('<html><body></body></html>',{url:'http://localhost'});
for(const key of ['window','document','navigator','HTMLElement','HTMLButtonElement','localStorage'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;global.crypto=require('node:crypto').webcrypto;HTMLElement.prototype.scrollIntoView=()=>{};
const ts=require(core+'/node_modules/typescript');require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const original=Module._load;let coreExports;
Module._load=function(request,parent,isMain){if(request==='@digitalmaktab/spa-core')return coreExports;if(['react','react/jsx-runtime','react-dom','react-dom/client','react-i18next','react-router-dom','i18next','formik'].includes(request))return original.call(this,app+'/'+request,parent,isMain);return original.apply(this,arguments)};
const React=require(app+'/react'),h=React.createElement,{render,fireEvent,waitFor,cleanup,act,within}=require(app+'/@testing-library/react'),{MemoryRouter,Routes,Route}=require(app+'/react-router-dom'),{I18nextProvider}=require(app+'/react-i18next'),i18n=require(app+'/i18next').createInstance();
const load=f=>require(core+'/src/'+f).default,{LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx'),{ResponseResult}=require(core+'/src/dtos/ResultEnum.ts');
const client=load('api/client.ts'),teacher=load('api/teacher.ts'),gradeApi=load('api/grade.ts'),appealApi=load('api/gradeAppeal.ts');
const {AuthContext}=require(core+'/src/helper/auth/AuthProvider.tsx'),{UserRole}=require(core+'/src/models/UserRole.ts');
const {getApiRequestOptions}=require(core+'/src/api/requestOptions.ts');
const clone=value=>JSON.parse(JSON.stringify(value)),deferred=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return{promise,resolve}};
const r1='11111111-1111-1111-1111-111111111111',r2='22222222-2222-2222-2222-222222222222',r3='33333333-3333-3333-3333-333333333333';
const classId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',courseId='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',enrollmentId='cccccccc-cccc-cccc-cccc-cccccccccccc';
const year={id:'dddddddd-dddd-dddd-dddd-dddddddddddd'};
let remote,writes=[],reads=[],fail=true,readBlock,writeBlock,success=0;
client.get=async(url,config)=>{
  const signal=config?.signal ?? getApiRequestOptions()?.signal;
  reads.push({url,signal,id:config?.params?.id});if(readBlock)await readBlock.promise;
  const data=url.startsWith('/teacher/classStudents/')?[clone(remote.enrollment)]:url==='/grade-appeals'?[clone(remote.appeal)]:[clone(remote.grade)];
  return{status:200,data,headers:{pagination:JSON.stringify({totalPages:1})}};
};
client.post=async(url,dto,config)=>{
  writes.push({url,dto:clone(dto),token:config?.accountToken,cache:config?.headers?.["Cache-Control"]});if(writeBlock)await writeBlock.promise;
  if(fail)throw{response:{status:409,data:{code:'record_edit_conflict',detail:'Review this saved record'}}};
  if(url==='/teacher/addGrades'){
    remote.grade={...remote.grade,...dto.grades[0],revision:r3};
    return{status:200,data:{grades:dto.grades.map(item=>({...item,revision:r3}))},headers:{}};
  }
  return{status:200,data:{...remote.appeal,revision:r3},headers:{}};
};
const paths={AppAlert:'components/AppAlert.tsx',AppCard:'components/card/AppCard.tsx',AppButton:'components/AppButton.tsx',AppModal:'components/modal/AppModal.tsx',AppStandaloneInput:'components/input/AppStandaloneInput.tsx'};
coreExports=Object.fromEntries(Object.entries(paths).map(([name,file])=>[name,load(file)]));
const Comparison=require(core+'/src/components/form/AppRecordConflictReview.tsx').AppRecordConflictComparison;
Object.assign(coreExports,{ResponseResult,teacher,AppRecordConflictComparison:Comparison,isRecordEditConflict:require(core+'/src/helper/recordConflict.ts').isRecordEditConflict,
  getPersonFirstName:p=>p?.firstName,getPersonLastName:p=>p?.lastName,tableScopeId:require(core+'/src/helper/tableScope.ts').tableScopeId,
  useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useTeacherOperations:load('hooks/useTeacherOperations.ts'),
  readAllPages:require(core+'/src/helper/readAllPages.ts').readAllPages,getGradingScheme:require(core+'/src/config/grading.ts').getGradingScheme,
  useMainOperations:()=>({data:year,fetchActiveCalendarYear:async()=>{}}),ExamType:require(core+'/src/models/ExamType.ts').ExamType,
  AppClassSelect:()=>null,AppCourseSelect:()=>null,AppEnumFilterSelect:()=>null,BulkImportModal:()=>null,
  AppTable:props=>h('div',null,(props.data??[]).map(row=>h('div',{key:row.id},props.columns.map(column=>h('div',{key:column.accessor},column.render?column.render(row[column.accessor],row):row[column.accessor])))))
});
const Entry=require(shell+'/src/screens/teacher/grades/TeacherGradeEntry.tsx').default;
const Proposal=load('components/grade/AppGradeAppealForm.tsx'),Decision=load('components/grade/AppGradeAppealDecisionForm.tsx');
const account={role:UserRole.TEACHER,token:'grade-token',teacher:{id:'teacher-one',schoolId:'school-one'}};
const wrapper=({children})=>h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:[`/grades?classId=${classId}&courseId=${courseId}`]},h(LoaderProvider,null,h(AuthContext.Provider,{value:{user:account,userRole:account.role,isAuthenticated:true}},children))));
const button=(ui,key)=>ui.getByRole('button',{name:i18n.t(key),exact:true});
const input=ui=>ui.container.querySelector(`[name="grade-${enrollmentId}"]`);
const submit=async ui=>{await act(async()=>fireEvent.submit(ui.container.querySelector('form')))};
function reset(){
  const enrollment={id:enrollmentId,studentId:'student-one',student:{id:'student-one',firstName:'Pupil',lastName:'One',schoolId:'school-one'}};
  const grade={id:'grade-one',revision:r1,enrollmentId,courseId,examType:0,examTypeValue:'Mid-term',score:20,comment:'Saved comment',enrollment,course:{subject:{subjectName:'Math'}},status:true};
  remote={enrollment,grade,appeal:{id:'appeal-one',revision:r1,gradeId:grade.id,grade,appealStatus:0,decisionNote:null}};
  writes=[];reads=[];fail=true;readBlock=undefined;writeBlock=undefined;success=0;localStorage.setItem('user',JSON.stringify(account));
}
(async()=>{
  const country=projects+'/digitalmaktab-spa-country-afghanistan/src/locales';
  const resources=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(lang=>[lang,{translation:JSON.parse(fs.readFileSync(lang==='en-US'?core+'/src/locales/en-US/translation.json':country+'/'+lang+'/translation.json'))}]));
  await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
  for(const language of Object.keys(resources)){
    await i18n.changeLanguage(language);reset();const ui=render(h(Entry),{wrapper});
    await waitFor(()=>assert.equal(input(ui)?.value,'20'));
    fireEvent.change(input(ui),{target:{value:'27'}});fireEvent.change(ui.container.querySelector(`[name="comment-${enrollmentId}"]`),{target:{value:'My comment'}});
    remote.grade={...remote.grade,revision:r2,score:24,comment:'Other teacher'};
    fireEvent.click(button(ui,'teacherGrades.submit'));await waitFor(()=>button(ui,'recordConflict.review'));
    assert.equal(writes[0].dto.grades[0].revision,r1);assert.equal(writes[0].token,account.token);assert.equal(writes[0].cache,'no-store');assert.equal(input(ui).value,'27');
    fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>ui.getByText('Other teacher'));assert.equal(writes.length,1);
    fireEvent.click(button(ui,'recordConflict.keep'));assert.equal(input(ui).value,'27');
    readBlock=deferred();fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>assert(ui.getByRole('dialog')));
    const pending=reads.at(-1);fireEvent.click(button(ui,'recordConflict.keep'));assert(pending.signal.aborted);const blocked=readBlock;readBlock=undefined;await act(async()=>blocked.resolve());assert.equal(input(ui).value,'27');
    fireEvent.click(button(ui,'recordConflict.review'));await waitFor(()=>ui.getByText('Other teacher'));fireEvent.click(button(ui,'recordConflict.useSaved'));await waitFor(()=>assert.equal(input(ui).value,'24'));
    fireEvent.change(input(ui),{target:{value:'29'}});fail=false;fireEvent.click(button(ui,'teacherGrades.submit'));await waitFor(()=>assert.equal(writes.length,2));assert.equal(writes[1].dto.grades[0].revision,r2);
    await waitFor(()=>assert(!button(ui,'teacherGrades.submit').disabled));fireEvent.change(input(ui),{target:{value:'30'}});
    const count=reads.length;await act(async()=>i18n.changeLanguage(language==='en-US'?'fa-AF':'en-US'));assert.equal(input(ui).value,'30');assert.equal(reads.length,count,'language changes keep drafts without refetching');
    writeBlock=deferred();fireEvent.click(button(ui,'teacherGrades.submit'));await waitFor(()=>assert.equal(writes.length,3));assert.equal(writes[2].dto.grades[0].revision,r3);assert(button(ui,'teacherGrades.submit').disabled);
    fireEvent.click(button(ui,'teacherGrades.submit'));assert.equal(writes.length,3);ui.unmount();localStorage.setItem('user',JSON.stringify({...account,token:'other-account-token',teacher:{id:'other-teacher',schoolId:'other-school'}}));assert.equal(writes[2].token,account.token);const finishing=writeBlock;writeBlock=undefined;await act(async()=>finishing.resolve());cleanup();

    await i18n.changeLanguage(language);reset();const originalGrade=clone(remote.grade);
    const proposal=render(h(Proposal,{grades:[originalGrade],loadLatest:async(id,signal)=>(await gradeApi.mine(signal)).data.find(g=>g.id===id),onSuccess:()=>success++}),{wrapper});
    fireEvent.change(proposal.container.querySelector('[name="gradeId"]'),{target:{value:originalGrade.id}});
    fireEvent.change(proposal.container.querySelector('[name="reason"]'),{target:{value:'My appeal reason'}});
    remote.grade={...remote.grade,score:24,revision:r2};await submit(proposal);await waitFor(()=>button(proposal,'recordConflict.review'));assert.equal(writes[0].dto.revision,r1);
    fireEvent.click(button(proposal,'recordConflict.review'));await waitFor(()=>assert.equal(button(proposal,'recordConflict.useSaved').disabled,false));fireEvent.click(button(proposal,'recordConflict.useSaved'));
    await waitFor(()=>assert.equal(proposal.container.querySelector('[name="reason"]').value,'My appeal reason'));assert.equal(writes.length,1);
    fail=false;await submit(proposal);await waitFor(()=>assert.equal(success,1));assert.equal(writes[1].dto.revision,r2);assert.equal(writes[1].dto.reasonText,'My appeal reason');cleanup();

    reset();const decision=render(h(Decision,{appeal:clone(remote.appeal),revise:true,onSuccess:()=>success++,onResolved:()=>{}}),{wrapper});
    fireEvent.change(decision.container.querySelector('[name="revisedScore"]'),{target:{value:'32'}});fireEvent.change(decision.container.querySelector('[name="decisionNote"]'),{target:{value:'My decision'}});
    remote.appeal={...remote.appeal,grade:{...remote.grade,revision:r2,score:25,comment:'New feedback'}};
    await submit(decision);await waitFor(()=>button(decision,'recordConflict.review'));assert.equal(writes[0].dto.revision,r1);assert.equal(writes[0].dto.gradeRevision,r1);
    assert.equal(decision.container.querySelector('[name="revisedScore"]').value,'32');fireEvent.click(button(decision,'recordConflict.review'));await waitFor(()=>decision.getByText('New feedback'));
    fireEvent.click(button(decision,'recordConflict.keep'));assert.equal(decision.container.querySelector('[name="decisionNote"]').value,'My decision');
    fireEvent.click(button(decision,'recordConflict.review'));await waitFor(()=>decision.getByText('New feedback'));fireEvent.click(button(decision,'recordConflict.useSaved'));
    await waitFor(()=>assert.equal(decision.container.querySelector('[name="revisedScore"]').value,'25'));assert.equal(writes.length,1);
    fireEvent.change(decision.container.querySelector('[name="revisedScore"]'),{target:{value:'31'}});fail=false;await submit(decision);await waitFor(()=>assert.equal(success,1));assert.equal(writes[1].dto.gradeRevision,r2);assert.equal(writes[1].dto.revision,r1);assert(reads.filter(r=>r.url==='/grade-appeals').every(r=>r.id==='appeal-one'&&r.signal));cleanup();
  }
  console.log('PASS: grade rows and Core proposal/decision forms preserve expected versions and drafts, compare/reload explicitly, cancel review reads, isolate late completions, keep locale changes safe and never retry writes in en/fa/ps.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
