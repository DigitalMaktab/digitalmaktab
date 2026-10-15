const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), Module = require('node:module');
const projects = path.resolve(__dirname, '../../..'), core = projects + '/digitalmaktab-spa-core', country = projects + '/digitalmaktab-spa-country-afghanistan', app = projects + '/digitalmaktab-spa/node_modules';
const { JSDOM } = require(app + '/jsdom'); const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'localStorage']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true; HTMLElement.prototype.scrollIntoView = () => {};
const ts = require(core + '/node_modules/typescript');
require.extensions['.tsx'] = require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 } }).outputText, file);
let mocks, pdfRows, csvBlob;
const original = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '@digitalmaktab/spa-core' && mocks) return mocks;
  if (request.endsWith('/useJsPdfExportToPdf')) return { __esModule: true, default: () => async (_columns, rows) => { pdfRows = rows; return { blob: new Blob(['%PDF-']), rowCount: rows.length, pageCount: 1, direction: 'rtl', language: 'fa-AF' }; } };
  if (/^\.\.\/select\/App(Country|Branch|ClassType|Shift|Teacher|Class)Select$/.test(request)) return { __esModule: true, default: () => null };
  if (['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-i18next', 'react-router-dom', 'i18next', 'formik'].includes(request)) return original.call(this, app + '/' + request, parent, isMain);
  return original.apply(this, arguments);
};
const React = require(app + '/react'), h = React.createElement, { render, fireEvent, waitFor, cleanup, within, act } = require(app + '/@testing-library/react');
const { MemoryRouter } = require(app + '/react-router-dom'), { I18nextProvider } = require(app + '/react-i18next'), i18n = require(app + '/i18next').createInstance();
const { CalendarProvider } = require(core + '/src/contexts/CalendarContext.tsx'), { AuthContext } = require(core + '/src/helper/auth/AuthProvider.tsx');
const load = file => require(core + '/src/' + file).default;
let rows = [], requests = [], failure = false, pending;
mocks = {
  AppTable: load('components/table/AppTable.tsx'), AppCard: load('components/card/AppCard.tsx'), AppAlert: load('components/AppAlert.tsx'),
  AppButton: load('components/AppButton.tsx'), AppButtonLink: load('components/AppButtonLink.tsx'), AppModal: load('components/modal/AppModal.tsx'),
  AppEnumFilterSelect: load('components/select/AppEnumFilterSelect.tsx'), AuthContext,
  AppStandaloneInput: load('components/input/AppStandaloneInput.tsx'), AppCalendarGrid: load('components/calendar/AppCalendarGrid.tsx'),
  useAppLocalizer: require(core + '/src/hooks/useAppLocalizer.ts').useAppLocalizer, useFormattedDate: load('hooks/useFormattedDate.ts'), UserRole: require(core + '/src/models/UserRole.ts').UserRole,
  apiClient: { get: async (url, config = {}) => {
    requests.push({ url, ...config });
    if (pending) return pending;
    if (failure) throw { response: { data: { detail: 'Register unavailable' } } };
    return { data: rows };
  } },
};
const { afghanistanCalendar } = require(country + '/src/calendarModule.ts');
const Register = require(country + '/src/studentRegister/AfghanStudentRegister.tsx').default;
const { normalizeRegisterSearch, normalizeRegisterIdentitySearch } = require(country + '/src/studentRegister/search.ts');
const { registerIssues } = require(country + '/src/studentRegister/contracts.ts');
const view = (role = 0) => render(h(I18nextProvider, { i18n }, h(MemoryRouter, null, h(AuthContext.Provider, { value: { userRole: role } }, h(CalendarProvider, { value: afghanistanCalendar }, h(Register))))));
const apply = ui => fireEvent.click(ui.getByRole('button', { name: i18n.t('filters.button.label') }));
const reset = ui => fireEvent.click(ui.getAllByRole('button', { name: i18n.t('filters.button.reset').trim() })[0]);
URL.createObjectURL = blob => { if (blob.type.startsWith('text/csv')) csvBlob = blob; return 'blob:register'; };
URL.revokeObjectURL = () => {}; window.HTMLAnchorElement.prototype.click = () => {};
(async () => {
  const resources = {}; for (const language of ['en-US', 'fa-AF', 'ps-AF']) resources[language] = { translation: { ...JSON.parse(fs.readFileSync(core + '/src/locales/en-US/translation.json')), ...JSON.parse(fs.readFileSync(country + '/src/locales/' + language + '/translation.json')) } };
  await i18n.init({ lng: 'fa-AF', resources, interpolation: { escapeValue: false } });
  assert.equal(normalizeRegisterSearch('١۲۳كي'), '123کی'); assert.equal(normalizeRegisterIdentitySearch('۰۰۰ - ١٢٣'), '000123');
  rows = [
    { id: 'first', name: 'Ahmad', fatherName: 'Father', asasNumber: 7, profileNumber: 100, registerNumber: 7, electronicIdentity: '۰۰۰-۱۲۳', paperReference: '12 / 1 / 2 / 3', dateOfBirth: '2010-03-20T00:00:00Z', issues: ['DuplicateAsas','ConflictingAsas'], hasIssues: true, status: true, creationDate: '2000-01-01' },
    { id: 'second', name: 'Mahmood', fatherName: 'Father', asasNumber: 7, profileNumber: 7, registerNumber: 7, electronicIdentity: '000 123', paperReference: '', dateOfBirth: '0001-01-01T00:00:00Z', issues: ['DuplicateAsas'], hasIssues: true, status: false, creationDate: new Date().toISOString().slice(0, 10) },
    { id: 'third', name: 'Clean student', fatherName: 'Father', asasNumber: 8, profileNumber: 8, registerNumber: null, electronicIdentity: '555', paperReference: '', dateOfBirth: '2010-01-01T00:00:00Z', issues: [], hasIssues: false, status: true, creationDate: new Date().toISOString().slice(0, 10) },
  ];
  let ui = view(); await waitFor(() => assert(ui.getByText('Ahmad'))); assert.equal(requests.length, 1);
  const issue = ui.getByLabelText(i18n.t('afghanStudentRegister.issueFilter')); assert(issue.closest('.filter-form'));
  const search = key => ui.getByLabelText(i18n.t('afghanStudentRegister.' + key), { exact: true });
  fireEvent.change(issue, { target: { value: 'DuplicateAsas' } });
  fireEvent.change(search('asas'), { target: { value: '۷' } });
  fireEvent.click(ui.getByLabelText(i18n.t('dateRange.from')));
  fireEvent.click(ui.getByRole('button', {name: i18n.t('afghanDatePicker.today')}));
  assert(ui.getByText('Ahmad')); assert(ui.getByText('Clean student')); apply(ui);
  assert(ui.getByText('Mahmood')); assert(!ui.queryByText('Ahmad')); assert(!ui.queryByText('Clean student')); assert.equal(requests.length, 1);
  fireEvent.click(ui.getByRole('button', { name: i18n.t('report.csv.tooltip') })); await waitFor(() => assert(csvBlob));
  const csv = await csvBlob.text(); assert(csv.includes('Mahmood')); assert(!csv.includes('Ahmad')); assert(!csv.includes('[object'));
  fireEvent.click(ui.getByRole('button', { name: i18n.t('report.print.tooltip') }));
  fireEvent.click(ui.getByRole('button', { name: i18n.t('report.settings.export') })); await waitFor(() => assert(pdfRows)); assert.deepEqual(pdfRows.map(row => row.id), ['second']); cleanup();
  // Actual review modal and admin editor links reuse the existing country/core editors.
  for (const language of ['en-US', 'fa-AF', 'ps-AF']) {
    await i18n.changeLanguage(language); ui = view(); await waitFor(() => assert(ui.getByText('Ahmad')));
    for (const code of registerIssues) assert.notEqual(i18n.t('afghanStudentRegister.issues.' + code), 'afghanStudentRegister.issues.' + code);
    fireEvent.doubleClick(ui.getByText('Ahmad').closest('tr'));
    const dialog = within(ui.getByRole('dialog'));
    assert(dialog.getByText(new Intl.NumberFormat(language, {useGrouping:false}).format(100)));
    assert.equal(dialog.getByRole('link', {name: i18n.t('afghanStudentRegister.editDetails')}).getAttribute('href'), '/student/first/afghan-details');
    assert.equal(dialog.getByRole('link', {name: i18n.t('afghanStudentRegister.editProfile')}).getAttribute('href'), '/student-editor/first');
    fireEvent.click(dialog.getByRole('button', { name: i18n.t('close.label') }));
    fireEvent.contextMenu(ui.getByText('Ahmad').closest('tr')); assert(ui.getByRole('menuitem', { name: i18n.t('afghanStudentRegister.editDetails') })); cleanup();
  }
  await i18n.changeLanguage('fa-AF'); ui = view(); await waitFor(() => assert(ui.getByText('Ahmad')));
  fireEvent.change(search('electronic'), { target: { value: '٠٠٠١٢٣' } }); apply(ui);
  assert(ui.getByText('Ahmad')); assert(ui.getByText('Mahmood')); assert(!ui.queryByText('Clean student')); reset(ui); assert(ui.getByText('Clean student'));
  fireEvent.change(ui.getByLabelText(i18n.t('afghanStudentRegister.issueFilter')), { target: { value: 'none' } }); apply(ui);
  assert(ui.getByText('Clean student')); assert(!ui.queryByText('Ahmad')); reset(ui);
  fireEvent.change(search('status'), { target: { value: 'false' } }); apply(ui); assert(ui.getByText('Mahmood')); assert(!ui.queryByText('Ahmad')); cleanup();
  ui = view(mocks.UserRole.PRINCIPAL); await waitFor(() => assert(ui.getByText('Ahmad'))); fireEvent.doubleClick(ui.getByText('Ahmad').closest('tr'));
  assert(!within(ui.getByRole('dialog')).queryByRole('link')); cleanup();
  failure = true; ui = view(); await waitFor(() => assert(ui.getByText('Register unavailable')));
  assert(ui.getByLabelText(i18n.t('afghanStudentRegister.issueFilter'))); failure = false;
  fireEvent.click(ui.getByRole('button', {name: i18n.t('afghanAcademicYears.refresh')})); await waitFor(() => assert(ui.getByText('Ahmad'))); cleanup();
  rows = []; ui = view(); await act(async () => {}); assert(ui.getByLabelText(i18n.t('afghanStudentRegister.issueFilter'))); cleanup();
  let resolve; pending = new Promise(done => { resolve = done; }); ui = view(); const last = requests.at(-1); cleanup(); assert(last.signal.aborted);
  resolve({data: []}); pending = null; await act(async () => {});
  const extension = require(country + '/src/studentTable.ts').afghanStudentTableExtension;
  await extension.transferLookup.lookup('۱۲۳', '١٠٠٢'); assert.deepEqual(requests.at(-1).params, { asasNumber: '123', fromSchoolCode: '1002' });
  const definition = require(country + '/src/applicationModule.tsx').afghanistanApplicationModule;
  assert(definition.routes.some(route => route.path === '/afghanistan/student-register' && route.roles.includes('HEAD_MASTER') && !route.roles.includes('TEACHER')));
  console.log('PASS: Afghan register reuses shared table/review modal, native identity/Asas search, draft/Apply/Reset, combined date/status/issue filters, PDF/CSV rows, translations, admin editor links, read roles, errors/retry, empty results, cancellation and normalized transfer lookup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
