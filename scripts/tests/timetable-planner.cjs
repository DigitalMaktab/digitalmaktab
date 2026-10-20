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
const Planner = load('timetables/AppTimetablePlanner.tsx');
mocks={};
const policyRules = require(country+'/src/academicYears/AfghanAcademicYearPolicyFields.tsx');
const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json'))}};
const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve:value=>resolve(value)}};
(async()=>{
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);let previewCalls=0,publishCalls=0,received;
  const gate=deferred(),publication=deferred();
  const sample={draft:{version:'review-version',outcome:'COMPLETE',exploredNodes:8,placements:[{courseId:'course',day:0,period:7}]},courses:[{id:'course',subject:'Mathematics',grade:8,classType:0,shift:0,teacher:'Teacher 1',branch:'Main'}]};
  const ui=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:0}},h(Planner,{
    preview:async()=>{previewCalls++;return gate.promise},publish:async(version,placements)=>{publishCalls++;received={version,placements};return publication.promise},errorMessage:error=>error.message
  })))));
  const generate=ui.getByRole('button',{name:i18n.t('timetableGenerator.generate')});
  fireEvent.click(generate);fireEvent.click(generate);assert.equal(previewCalls,1);assert(generate.disabled);
  await act(async()=>gate.resolve(sample));await waitFor(()=>assert(ui.getByText('Mathematics')));
  assert(ui.getByText(i18n.t('timetableGenerator.days.0')));assert(ui.getByText('Teacher 1'));
  // The shared table owns filters and exports; no request effect loops during filtering.
  assert.equal(previewCalls,1);
  fireEvent.click(ui.getByRole('button',{name:i18n.t('timetableGenerator.publish')}));assert.equal(publishCalls,0);
  const dialog=ui.getByRole('dialog');const publish=within(dialog).getByRole('button',{name:i18n.t('timetableGenerator.publish')});
  fireEvent.click(publish);fireEvent.click(publish);assert.equal(publishCalls,1);assert(publish.disabled);
  assert.deepEqual(received,{version:'review-version',placements:sample.draft.placements});
  await act(async()=>publication.resolve({}));await waitFor(()=>assert(ui.getByText(i18n.t('timetableGenerator.published'))));assert(!ui.queryByRole('dialog'));assert(!ui.queryByText('Mathematics'));cleanup();
  for(const outcome of ['INFEASIBLE','SEARCH_LIMIT']){
    const failure=render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:0}},h(Planner,{preview:async()=>({...sample,draft:{...sample.draft,outcome,placements:[]}}),publish:async()=>{throw Error('must not publish')},errorMessage:e=>e.message})))));
    fireEvent.click(failure.getByRole('button',{name:i18n.t('timetableGenerator.generate')}));
    await waitFor(()=>assert(failure.getByText(i18n.t('timetableGenerator.outcomes.'+outcome))));
    assert(!failure.queryByRole('button',{name:i18n.t('timetableGenerator.publish')}));cleanup();
  }
 }
 const policy={climate:'UNSPECIFIED',ministryTemplateVersion:'',sourceReference:'',reportingPeriods:[],gradeSubjects:[{grade:'8',subjectId:'math',weeklyPeriods:'6',maximumPerDay:'2',sourceReference:''}]};
 const plan={terms:[]};assert(!policyRules.validAfghanAcademicPolicy(policy,plan));policy.gradeSubjects[0].sourceReference='School-approved curriculum';assert(policyRules.validAfghanAcademicPolicy(policy,plan));
 policy.gradeSubjects.push({...policy.gradeSubjects[0]});assert(!policyRules.validAfghanAcademicPolicy(policy,plan));policy.gradeSubjects[1].grade='9';assert(policyRules.validAfghanAcademicPolicy(policy,plan));policy.gradeSubjects[1].weeklyPeriods='71';assert(!policyRules.validAfghanAcademicPolicy(policy,plan));
 console.log('PASS: shared timetable planner in English, Dari and Pashto; review, guarded publication, exact version payload, no request loops, infeasible/search-limit states and curriculum validation.');
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{cleanup();dom.window.close()});
