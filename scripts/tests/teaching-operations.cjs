const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), Module = require('node:module');
const projects = path.resolve(__dirname, '../../..'), core = projects + '/digitalmaktab-spa-core', country = projects + '/digitalmaktab-spa-country-afghanistan', app = projects + '/digitalmaktab-spa/node_modules';
const { JSDOM } = require(app + '/jsdom'); const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'localStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true; HTMLElement.prototype.scrollIntoView = () => {};
const ts = require(core + '/node_modules/typescript');
require.extensions['.tsx'] = require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText, file);
let mocks; const original = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@digitalmaktab/spa-core' && mocks) return mocks;
  if (/^\.\.\/select\/App(Country|Branch|ClassType|Shift|Teacher|Class)Select$/.test(request)) return { __esModule: true, default: () => null };
  if (['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-i18next', 'react-router-dom', 'i18next', 'formik'].includes(request)) return original.call(this, app + '/' + request, parent, isMain);
  return original.apply(this, arguments);
};
const React = require(app + '/react'), h = React.createElement, { render, fireEvent, waitFor, cleanup, within, act } = require(app + '/@testing-library/react');
const { MemoryRouter, Routes, Route } = require(app + '/react-router-dom'), { I18nextProvider } = require(app + '/react-i18next'), i18n = require(app + '/i18next').createInstance();
const { CalendarProvider } = require(core + '/src/contexts/CalendarContext.tsx'), { AuthContext } = require(core + '/src/helper/auth/AuthProvider.tsx');
const load = file => require(core + '/src/' + file).default;
const Lessons=load('timetables/AppTeachingLessons.tsx'),Cover=load('timetables/AppLeaveCoverDecision.tsx'),LeaveRequest=load('timetables/AppLeaveRequest.tsx');
const api=require(core+'/src/api/client.ts').default;
const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json'))}};
const {LoaderProvider}=require(core+'/src/contexts/LoaderContext.tsx');
const host=component=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:3,user:{role:3,teacher:{id:'teacher',schoolId:'school'}}}},h(LoaderProvider,null,component)))));
(async()=>{
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);const posts=[],gets=[];
  const lesson={lesson:{scheduleId:'schedule',subject:'Math',grade:8,branch:'Main',period:0,teacher:'Primary'},date:'2026-10-20',actualTeacherId:'teacher',actualTeacher:'Actual',canRecord:true,uncovered:false,recordId:null,version:null,topic:'',attendanceCount:0,recordedAt:null,calendarYearId:'year'};
  const roster=Array.from({length:12},(_,index)=>({enrollmentId:'enrollment-'+index,name:'Student '+index,present:null}));
  api.get=async(url,config)=>{gets.push(url);if(url.endsWith('/context'))return {data:{today:'2026-10-20'}};if(url.endsWith('/roster'))return {data:roster};if(url==='/teaching-lessons')return {data:[lesson]};return {data:[],headers:{}};};
  api.post=async(url,dto)=>{posts.push({url,dto});return {data:{id:'record',version:'record-v1'}}};
  let ui=host(h(Lessons));await waitFor(()=>assert(ui.getByText('Math')));
  fireEvent.doubleClick(ui.getByText('Math').closest('tr'));await waitFor(()=>assert(ui.getByRole('dialog')));await waitFor(()=>assert(ui.getAllByText('Student 0').length));
  const save=within(ui.getByRole('dialog')).getByRole('button',{name:i18n.t('teachingOperations.save')});
  fireEvent.click(save);await act(async()=>{});assert.equal(posts.length,0,'No default present/absent marks are fabricated');
  fireEvent.click(ui.getByRole('button',{name:i18n.t('teachingOperations.markAllPresent')}));
  fireEvent.change(document.querySelector('input[name="topic"]'),{target:{value:'Fractions'}});fireEvent.click(save);
  await waitFor(()=>assert.equal(posts.length,1));assert.equal(posts[0].dto.calendarYearId,'year');assert.equal(posts[0].dto.scheduleId,'schedule');assert.equal(posts[0].dto.attendances.length,12);assert(posts[0].dto.attendances.every(m=>m.status===true));assert.equal(posts[0].dto.topic,'Fractions');
  await waitFor(()=>assert(!ui.queryByRole('dialog')));assert.equal(gets.filter(u=>u==='/teaching-lessons').length,2);cleanup();
  const leave={id:'leave',version:'leave-v1',creationDate:'2026-10-20'};
  api.get=async url=>({data:{version:'review-v2',lessons:[{scheduleId:'math',date:'2026-10-20',classId:'class',subject:'Math',grade:8,branch:'Main',period:1,candidates:[{id:'cover',name:'Cover teacher'}],proposedTeacherId:'cover'},{scheduleId:'physics',date:'2026-10-20',classId:'class',subject:'Physics',grade:8,branch:'Main',period:2,candidates:[],proposedTeacherId:null}]}});
  let saved=0;ui=host(h(Cover,{leave,onClose:()=>{},onSaved:async()=>{saved++}}));await waitFor(()=>assert(ui.getByText('Physics')));assert(ui.getByText(i18n.t('teachingOperations.uncoveredNote')));
  const approve=ui.getByRole('button',{name:i18n.t('teacherLeave.decide.approveSubmit')});fireEvent.click(approve);fireEvent.click(approve);
  await waitFor(()=>assert.equal(saved,1));assert.equal(posts.length,2);assert.equal(posts[1].dto.version,'review-v2');assert.deepEqual(posts[1].dto.lessonCovers,[{scheduleId:'math',date:'2026-10-20',teacherId:'cover'},{scheduleId:'physics',date:'2026-10-20',teacherId:null}]);cleanup();
  // The creation form reuses Core's account-scoped editor lifecycle and durable
  // request serializer without fabricating a Revision for the existing Version model.
  localStorage.setItem('user',JSON.stringify({role:3,teacher:{id:'teacher',schoolId:'school'},token:'request-token'}));
  const requests=[];let finishRequest,closed=0,requested=0;
  api.post=async(url,dto,config)=>{requests.push({url,dto,config});if(requests.length===1)throw {response:{status:503,data:{detail:'Try again explicitly'}}};return new Promise(resolve=>{finishRequest=()=>resolve({data:{id:'new-leave',version:'version'}})});};
  ui=host(h(LeaveRequest,{onClose:()=>closed++,onSaved:async()=>requested++}));
  fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText(i18n.t('teacherLeave.validation.reasonRequired'))));assert.equal(requests.length,0);
  const fill=(name,value)=>fireEvent.change(ui.container.querySelector(`[name="${name}"]`),{target:{value}});
  fill('fromDate','2026-05-01');fill('toDate','2027-05-03');fill('reason',' Sick ');fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText(i18n.t('teacherLeave.request.invalidRange'))));assert.equal(requests.length,0);fill('toDate','2026-05-02');
  fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText('Try again explicitly')));
  assert.equal(ui.container.querySelector('[name="reason"]').value,' Sick ');assert.equal(requests.length,1);assert.equal(requests[0].dto.reason,'Sick');assert.equal(requests[0].config.accountToken,'request-token');assert(requests[0].config.signal instanceof AbortSignal);
  const intent=requests[0].config.headers['Idempotency-Key'];assert.match(intent,/^[0-9a-f-]{36}$/);
  localStorage.setItem('user',JSON.stringify({role:3,teacher:{id:'teacher',schoolId:'school'},token:'renewed-token'}));
  fireEvent.click(ui.getByRole('button',{name:i18n.t('teacherLeave.request.submit')}));fireEvent.click(ui.getByRole('button',{name:i18n.t('teacherLeave.request.submit')}));await waitFor(()=>assert.equal(requests.length,2));
  assert.equal(requests[1].config.headers['Idempotency-Key'],intent);assert.equal(requests[1].config.accountToken,'renewed-token');
  fireEvent.keyDown(document,{key:'Escape'});assert.equal(closed,0);
  await act(async()=>{finishRequest()});await waitFor(()=>assert.equal(requested,1));assert.equal(closed,1);cleanup();
  requested=0;closed=0;requests.length=0;
  api.post=async(url,dto,config)=>{requests.push({url,dto,config});return new Promise(resolve=>{finishRequest=()=>resolve({data:{id:'late-leave'}})});};
  ui=host(h(LeaveRequest,{onClose:()=>closed++,onSaved:async()=>requested++}));fill('fromDate','2026-05-03');fill('toDate','2026-05-04');fill('reason','Later');fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(requests.length,1));assert.notEqual(requests[0].config.headers['Idempotency-Key'],intent);ui.unmount();assert(requests[0].config.signal.aborted);await act(async()=>finishRequest());assert.equal(requested,0);assert.equal(closed,0);cleanup();localStorage.removeItem('user');

 }
 console.log('PASS: real shared lesson and leave-cover forms in English/Dari/Pashto; explicit attendance, 12-student payload across pages, recorded year/lesson IDs, bounded requests, fresh review version, preserved uncovered lessons and single-flight approval.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
