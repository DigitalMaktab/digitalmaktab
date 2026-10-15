const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), Module = require('node:module');
const projects = path.resolve(__dirname, '../../..'), core = projects + '/digitalmaktab-spa-core', country = projects + '/digitalmaktab-spa-country-afghanistan', app = projects + '/digitalmaktab-spa/node_modules';
const { JSDOM } = require(app + '/jsdom'); const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'localStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true; HTMLElement.prototype.scrollIntoView = () => {};
const ts = require(core + '/node_modules/typescript');
require.extensions['.tsx'] = require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText, file);
let mocks; const original = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@digitalmaktab/spa-core' && mocks) return mocks;
  if (/^\.\.\/select\/App(Country|Branch|ClassType|Shift|Teacher|Class)Select$/.test(request)) return { __esModule: true, default: () => null };
  if (['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-i18next', 'react-router-dom', 'i18next', 'formik'].includes(request)) return original.call(this, app + '/' + request, parent, isMain);
  return original.apply(this, arguments);
};
const React = require(app + '/react'), h = React.createElement, { render, fireEvent, waitFor, cleanup, within, act } = require(app + '/@testing-library/react');
const { MemoryRouter } = require(app + '/react-router-dom'), { I18nextProvider } = require(app + '/react-i18next'), i18n = require(app + '/i18next').createInstance();
const { CalendarProvider } = require(core + '/src/contexts/CalendarContext.tsx');
const load = file => require(core + '/src/' + file).default;
let saves = [], gets = [], failLoad = false, failSave = false, pending;
const student = { studentId: 'student-id', firstNameNative: 'احمد', fatherNameNative: 'پدر', asasNumber: 7, bloodGroup: 0, disabilityType: 0, motherTongue: 0, isOrphan: 0, studentStatus: 0 };
const teacher = { teacherId: 'teacher-id', firstNameNative: 'معلم', maritalStatus: 1, employmentType: 1, educationLevel: 7, hireDate: '2024-03-20T00:00:00Z', bast: 2, step: 1 };
mocks = { AppBaseEditor: load('components/AppBaseEditor.tsx'), AppEnumSelect: load('components/form/AppEnumSelect.tsx'), AppFormInput: load('components/form/AppFormInput.tsx'),
  AppFormSectionContainer: load('components/form/AppFormSectionContainer.tsx'), AppFormLocalDatePicker: load('components/form/AppFormLocalDatePicker.tsx'),
  AppAlert: load('components/AppAlert.tsx'), AppCard: load('components/card/AppCard.tsx'), AppButton: load('components/AppButton.tsx'),
  AppStandaloneInput: load('components/input/AppStandaloneInput.tsx'), AppCalendarGrid: load('components/calendar/AppCalendarGrid.tsx'),
  useAppLocalizer: require(core + '/src/hooks/useAppLocalizer.ts').useAppLocalizer,
  apiClient: { get: async (url, config = {}) => { gets.push({url, ...config}); if (pending) return pending; if (failLoad) throw {response: {data: {detail: 'Could not load record'}}}; return {data: url.includes('teacher') ? teacher : student}; },
    put: async (url, dto) => { if (failSave) throw {response: {data: {detail: 'Profile save failed'}}}; saves.push({url, dto}); return {data: dto}; } }
};
const { afghanistanCalendar } = require(country + '/src/calendarModule.ts');
const Student = require(country + '/src/AfghanStudentDetailsEditor.tsx').default, Teacher = require(country + '/src/AfghanTeacherDetailsEditor.tsx').default;
const validators = require(country + '/src/personDetails/validation.ts');
const view = component => render(h(I18nextProvider, {i18n}, h(MemoryRouter, null, h(CalendarProvider, {value: afghanistanCalendar}, component))));
const input = (ui, key) => ui.getByLabelText(i18n.t(key), { selector: 'input,select' });
const change = (ui, key, value) => fireEvent.change(input(ui, key), {target: {value}});
const submit = ui => fireEvent.submit(ui.container.querySelector('form'));
(async () => {
  const resources = {}; for (const language of ['en-US', 'fa-AF', 'ps-AF']) resources[language] = {translation: {...JSON.parse(fs.readFileSync(core + '/src/locales/en-US/translation.json')), ...JSON.parse(fs.readFileSync(country + '/src/locales/' + language + '/translation.json'))}};
  await i18n.init({lng: 'fa-AF', resources, interpolation: {escapeValue: false}});
  for (const language of ['en-US', 'fa-AF', 'ps-AF']) {
    await i18n.changeLanguage(language);
    let ui = view(h(Student, {studentId: 'student-id', embedded: true}));
    await waitFor(() => assert.equal(input(ui, 'afghanStudentDetails.firstNameNative').value, 'احمد'));
    assert.equal(input(ui, 'afghanStudentDetails.bloodGroup').value, 'A_PLUS');
    assert(input(ui, 'afghanStudentDetails.bloodGroup').classList.contains('select2-hidden-accessible'));
    assert(ui.getByRole('combobox', {name: i18n.t('afghanStudentDetails.bloodGroup')}));
    assert(input(ui, 'afghanStudentDetails.asasNumber').classList.contains('form-control'));
    const before = saves.length;
    change(ui, 'afghanStudentDetails.asasNumber', '7.5'); fireEvent.blur(input(ui, 'afghanStudentDetails.asasNumber'));
    await waitFor(() => assert.equal(input(ui, 'afghanStudentDetails.asasNumber').getAttribute('aria-invalid'), 'true'));
    assert(ui.getByText(i18n.t('afghanDetailsForm.validation.positiveInteger'))); submit(ui); await act(async () => {}); assert.equal(saves.length, before);
    change(ui, 'afghanStudentDetails.asasNumber', '۷۷');
    change(ui, 'afghanStudentDetails.relativeContactPhone', 'not phone'); submit(ui); await act(async () => {}); assert.equal(saves.length, before);
    assert(ui.getByText(i18n.t('afghanDetailsForm.validation.phone')));
    change(ui, 'afghanStudentDetails.relativeContactPhone', '+۹۳ ۷۰ ۱۲۳ ۴۵۶۷');
    change(ui, 'afghanStudentDetails.electronicNationalIdNumber', '۰۰۰-۱۲۳');
    change(ui, 'afghanStudentDetails.bloodGroup', 'B_MINUS');
    submit(ui); await waitFor(() => assert.equal(saves.length, before + 1));
    assert.equal(saves.at(-1).dto.asasNumber, 77); assert.equal(saves.at(-1).dto.bloodGroup, 3); assert.equal(saves.at(-1).dto.motherTongue, 0);
    assert.equal(saves.at(-1).dto.nationalIdNumber, null); assert.equal(saves.at(-1).dto.electronicNationalIdNumber, '۰۰۰-۱۲۳');
    assert(ui.getByText(i18n.t('afghanStudentDetails.saved')));
    change(ui, 'afghanStudentDetails.bloodGroup', ''); submit(ui); await waitFor(() => assert.equal(saves.length, before + 2));
    assert.equal(saves.at(-1).dto.bloodGroup, null); cleanup();
    ui = view(h(Teacher, {teacherId: 'teacher-id'}));
    await waitFor(() => assert.equal(input(ui, 'afghanTeacherDetails.educationLevel').value, 'BACHELOR'));
    const hire = input(ui, 'afghanTeacherDetails.hireDate'); assert(hire.readOnly); assert.equal(hire.id, 'hireDate');
    assert(!hire.getAttribute('aria-describedby'));
    change(ui, 'afghanTeacherDetails.firstNameNative', 'Updated teacher');
    fireEvent.click(hire);
    const nativeYear = new Intl.NumberFormat(language, {useGrouping:false, numberingSystem: language.startsWith('en') ? 'latn' : 'arabext'}).format(1403);
    assert(ui.getByRole('group', {name: i18n.t('calendar.month.hamal') + ' ' + nativeYear}));
    fireEvent.click(ui.getByRole('button', {name: i18n.t('afghanDatePicker.today')}));
    assert.equal(input(ui, 'afghanTeacherDetails.firstNameNative').value, 'Updated teacher');
    const saved = saves.length; submit(ui); await waitFor(() => assert.equal(saves.length, saved + 1));
    assert.equal(saves.at(-1).dto.firstNameNative, 'Updated teacher'); assert.equal(saves.at(-1).dto.educationLevel, 7); assert.equal(saves.at(-1).dto.employmentType, 1);
    assert.equal(saves.at(-1).dto.secondaryDistrictId, null); assert.equal(saves.at(-1).dto.hireDate, new Date().toISOString().slice(0,10) + 'T00:00:00Z');
    failSave = true; submit(ui); await waitFor(() => assert(ui.getByText('Profile save failed'))); failSave = false; cleanup();
  }
  let ui = view(h(Student)); assert(ui.getByText(i18n.t('afghanStudentDetails.saveProfileFirst'))); assert(!ui.container.querySelector('form')); cleanup();
  failLoad = true; ui = view(h(Student, {studentId: 'student-id'})); await waitFor(() => assert(ui.getByText('Could not load record')));
  assert(!ui.container.querySelector('form')); failLoad = false; fireEvent.click(ui.getByRole('button', {name: i18n.t('afghanDetailsForm.retry')}));
  await waitFor(() => assert(input(ui, 'afghanStudentDetails.firstNameNative'))); cleanup();
  let finish; pending = new Promise(resolve => {finish = resolve;}); ui = view(h(Teacher, {teacherId: 'teacher-id'})); assert(!ui.container.querySelector('form'));
  const last = gets.at(-1); cleanup(); assert(last.signal.aborted); finish({data: teacher}); pending = null; await act(async () => {});
  let submitted = 0;
  ui = view(h(mocks.AppBaseEditor, {initialData:{}, initialFormData:{choice:''}, validationSchemaConfig:{choice:{label:'Choice'}}, title:()=>'', onSubmit:async()=>{submitted++;}}, h(mocks.AppEnumSelect, {name:'choice',label:'Choice',options:['one'],required:true})));
  submit(ui); await waitFor(() => assert(ui.getByRole('combobox', {name:'Choice'}).classList.contains('is-invalid')));
  const combobox = ui.getByRole('combobox', {name:'Choice'}); assert.equal(combobox.getAttribute('aria-invalid'),'true'); assert.equal(combobox.getAttribute('aria-describedby'),'choice-error'); assert.equal(submitted,0);
  fireEvent.change(ui.getByLabelText('Choice', {exact:false,selector:'select'}), {target:{value:'one'}}); submit(ui); await waitFor(() => assert.equal(submitted,1)); cleanup();
  const errors = validators.validatePersonDetails({asasNumber: '12abc', hireDate: '2026-02-30', electronicNationalIdNumber: 'abc', bloodGroup: 'MISSING'}, i18n.t.bind(i18n), ['asasNumber'], {bloodGroup: ['A_PLUS']});
  assert.deepEqual(Object.keys(errors).sort(), ['asasNumber','bloodGroup','electronicNationalIdNumber','hireDate'].sort());
  assert.deepEqual(validators.validatePersonDetails({}, i18n.t.bind(i18n), ['asasNumber'], {bloodGroup: ['A_PLUS']}), {});
  console.log('PASS: real Core inputs and Select2 controls in Afghanistan student/teacher forms, translated field validation, optional clears, native integer input, correct numeric enums, Formik Hijri dates without lost edits, save/load failures, retry and aborts.');
})().catch(error => {console.error(error); process.exitCode = 1;});
