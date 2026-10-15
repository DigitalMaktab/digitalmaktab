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
let periods = [], failSave = false;
let rows, requests = [], activateCalls = [], saves = [], failActivation = false;
const request = async (url, config = {}) => {
  requests.push({ url, signal: config.signal });
  const source = url.includes('/exam-periods') ? periods : rows;
  return { data: /\/(academic-years|exam-periods)$/.test(url) ? source : source.find(row => url.endsWith('/' + row.id)) };
};
mocks = {
  AppTable: load('components/table/AppTable.tsx'), AppBaseEditor: load('components/AppBaseEditor.tsx'), AppCard: load('components/card/AppCard.tsx'),
  AppAlert: load('components/AppAlert.tsx'), AppButton: load('components/AppButton.tsx'), AppModal: load('components/modal/AppModal.tsx'), AppStatusBadge: load('components/AppStatusBadge.tsx'),
  AppEnumSelect: load('components/form/AppEnumSelect.tsx'),
  AppFormInput: load('components/form/AppFormInput.tsx'), AppFormLocalDatePicker: load('components/form/AppFormLocalDatePicker.tsx'),
  AppStandaloneInput: load('components/input/AppStandaloneInput.tsx'), AppCalendarGrid: load('components/calendar/AppCalendarGrid.tsx'),
  useAppLocalizer: require(core + '/src/hooks/useAppLocalizer.ts').useAppLocalizer, useFormattedDate: load('hooks/useFormattedDate.ts'), UserRole: require(core + '/src/models/UserRole.ts').UserRole,
  apiClient: { get: request, put: async (url, dto) => { if (failSave) throw { response: { data: { detail: 'This examination period changed. Reload it before saving.' } } }; saves.push({ url, dto }); return { data: dto }; }, post: async (url, dto) => {
    if (url.endsWith('/activate')) { activateCalls.push({ url, dto }); if (failActivation) throw { response: { data: { detail: 'Stale version: reload school year.' } } }; rows = rows.map(row => ({ ...row, isActive: url.includes('/' + row.id + '/') })); return { data: rows[1] }; }
    saves.push({ url, dto }); return { data: dto };
  } },
};
const { afghanistanCalendar } = require(country + '/src/calendarModule.ts');
const List = require(country + '/src/academicYears/AfghanAcademicYearList.tsx').default, Editor = require(country + '/src/academicYears/AfghanAcademicYearEditor.tsx').default;
const helpers = require(country + '/src/academicYears/calendar.ts');
const view = (component, entry = '/afghanistan/academic-years', editor = false, base = '/afghanistan/academic-years') => render(h(I18nextProvider, { i18n }, h(MemoryRouter, { initialEntries: [entry] }, h(AuthContext.Provider, { value: { userRole: 0 } }, h(CalendarProvider, { value: afghanistanCalendar }, editor ? h(Routes, null, h(Route, { path: base + '/:id', element: component }), h(Route, { path: base, element: h('p', null, 'Saved school year') })) : component)))));
(async () => {
  const resources = {}; for (const language of ['en-US', 'fa-AF', 'ps-AF']) resources[language] = { translation: { ...JSON.parse(fs.readFileSync(core + '/src/locales/en-US/translation.json')), ...JSON.parse(fs.readFileSync(country + '/src/locales/' + language + '/translation.json')) } };
  await i18n.init({ lng: 'fa-AF', resources, interpolation: { escapeValue: false } });
  assert.deepEqual(helpers.fullAcademicYear(1403), { fromDate: '2024-03-20', toDate: '2025-03-20' });
  assert.deepEqual(helpers.fullAcademicYear(1404), { fromDate: '2025-03-21', toDate: '2026-03-20' });
  assert.equal(helpers.currentAcademicYear(new Date(2025, 2, 21, 0, 15)), 1404);
  assert.equal(helpers.normalizeYear('۱۴۰۳'), 1403); assert.equal(helpers.normalizeYear('١٤٠٣'), 1403);
  assert(helpers.validAcademicDates(1403, '2024-09-01', '2025-06-01')); assert(!helpers.validAcademicDates(1403, '2025-03-21', '2025-04-01'));
  assert(!helpers.validAcademicDates(1403, '2024-03-20', '2025-03-21'));
  rows = [{ id: 'first', solarHijriYear: 1403, fromDate: '2024-03-20', toDate: '2025-03-20', isActive: true, version: 'version-a', creationDate: '2026-10-14' }, { id: 'second', solarHijriYear: 1404, fromDate: '2025-03-21', toDate: '2026-03-20', isActive: false, version: 'version-b', creationDate: '2026-10-15' }];
  let ui = view(h(List)); await waitFor(() => assert(ui.getByText('۱۴۰۳'))); assert(ui.getByText('۱ حمل ۱۴۰۳')); assert.equal(requests.length, 1);
  const second = ui.getByText('۱۴۰۴').closest('tr'); fireEvent.contextMenu(second);
  fireEvent.click(ui.getByRole('menuitem', { name: i18n.t('afghanAcademicYears.activate') })); assert.equal(activateCalls.length, 0);
  fireEvent.click(within(ui.getByRole('dialog')).getByRole('button', { name: i18n.t('afghanAcademicYears.activate') }));
  await waitFor(() => assert(!ui.queryByRole('dialog'))); assert.deepEqual(activateCalls[0], { url: '/afghanistan/academic-years/second/activate', dto: { version: 'version-b' } });
  assert.equal(requests.length, 2);
  // Native-year text and active-state filters share date Apply/Reset without network requests.
  fireEvent.change(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }), { target: { value: '۱۴۰۴' } });
  fireEvent.click(ui.getByRole('button', { name: i18n.t('filters.button.label') })); assert(ui.getByText('۱۴۰۴')); assert(!ui.queryByText('۱۴۰۳')); assert.equal(requests.length, 2);
  fireEvent.click(ui.getAllByRole('button', { name: i18n.t('filters.button.reset').trim() })[0]); assert(ui.getByText('۱۴۰۳'));
  failActivation = true; fireEvent.contextMenu(ui.getByText('۱۴۰۳').closest('tr')); fireEvent.click(ui.getByRole('menuitem', { name: i18n.t('afghanAcademicYears.activate') }));
  fireEvent.click(within(ui.getByRole('dialog')).getByRole('button', { name: i18n.t('afghanAcademicYears.activate') })); await waitFor(() => assert(ui.getByText('Stale version: reload school year.'))); cleanup();
  // Real shared editor uses the installed Hijri date picker, keeps a year immutable, and sends optimistic version data.
  ui = view(h(Editor), '/afghanistan/academic-years/first', true);
  await waitFor(() => assert(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }).disabled));
  assert.equal(ui.getByLabelText(i18n.t('afghanAcademicYears.fromDate'), { exact: false, selector: "input,select" }).value, '۱۴۰۳/۰۱/۰۱');
  fireEvent.submit(ui.container.querySelector('form')); await waitFor(() => assert.equal(saves.length, 1));
  assert.deepEqual(saves[0], { url: '/afghanistan/academic-years/first', dto: { solarHijriYear: 1403, fromDate: '2024-03-20', toDate: '2025-03-20', version: 'version-a' } }); cleanup();
  // New-year bounds are native; invalid combinations remain in the editor and never reach the API.
  ui = view(h(Editor), '/afghanistan/academic-years/new', true); const current = helpers.currentAcademicYear();
  assert.equal(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }).value, String(current));
  assert(ui.getByLabelText(i18n.t('afghanAcademicYears.fromDate'), { exact: false, selector: "input,select" }).value.startsWith(new Intl.NumberFormat('fa-AF', { useGrouping: false }).format(current)));
  fireEvent.change(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }), { target: { value: String(current - 1) } });
  fireEvent.submit(ui.container.querySelector('form')); await waitFor(() => assert(ui.getByText(i18n.t('afghanAcademicYears.invalidDates')))); assert.equal(saves.length, 1);
  const nativeCurrent = new Intl.NumberFormat('fa-AF', {useGrouping: false}).format(current);
  fireEvent.change(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), {exact: false}), {target: {value: nativeCurrent}});
  fireEvent.submit(ui.container.querySelector('form')); await waitFor(() => assert.equal(saves.length, 2)); assert.equal(saves[1].dto.solarHijriYear, current); cleanup();
  await i18n.changeLanguage('ps-AF'); rows = []; ui = view(h(List)); await act(async () => {}); assert(ui.getByRole('link', { name: i18n.t('afghanAcademicYears.add') })); assert(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }).closest('.filter-form')); cleanup();
  // Country examination periods reuse the actual shared table, filters, editor and native date controls.
  await i18n.changeLanguage('fa-AF');
  rows = [{ id: 'first', solarHijriYear: 1403, fromDate: '2024-03-20', toDate: '2025-03-20', isActive: true },
    { id: 'second', solarHijriYear: 1404, fromDate: '2025-03-21', toDate: '2026-03-20', isActive: false }];
  periods = [{ id: 'midterm', academicYearId: 'first', examType: 0, fromDate: '2024-07-01', toDate: '2024-07-15', version: 'period-v1', creationDate: '2026-10-14' },
    { id: 'final', academicYearId: 'second', examType: 1, fromDate: '2025-12-01', toDate: '2025-12-15', version: 'period-v2', creationDate: '2026-10-15' }];
  const PeriodList = require(country + '/src/examPeriods/AfghanExamPeriodList.tsx').default;
  const PeriodEditor = require(country + '/src/examPeriods/AfghanExamPeriodEditor.tsx').default;
  const { validExamPeriodDates } = require(country + '/src/examPeriods/validation.ts');
  assert(validExamPeriodDates(rows[0], '2024-07-01', '2024-07-01'));
  assert(!validExamPeriodDates(rows[0], '2024-02-30', '2024-07-01'));
  assert(!validExamPeriodDates(rows[0], '2024-07-15', '2024-07-01'));
  assert(!validExamPeriodDates(rows[0], '2024-07-15', '2025-03-21'));
  const beforeList = requests.length;
  ui = view(h(PeriodList), '/afghanistan/exam-periods');
  await waitFor(() => assert(ui.getByText('۱۴۰۳')));
  assert.equal(requests.length, beforeList + 2);
  assert(ui.getByLabelText(i18n.t('afghanExamPeriods.type'), { exact: false, selector: "input,select" }).closest('.filter-form'));
  fireEvent.change(ui.getByLabelText(i18n.t('afghanExamPeriods.type'), { exact: false, selector: "input,select" }), { target: { value: '0' } });
  assert(ui.getByText('۱۴۰۴')); // Draft criteria wait for Apply.
  fireEvent.click(ui.getByRole('button', { name: i18n.t('filters.button.label') }));
  assert(ui.getByText('۱۴۰۳')); assert(!ui.queryByText('۱۴۰۴')); assert.equal(requests.length, beforeList + 2);
  fireEvent.click(ui.getAllByRole('button', { name: i18n.t('filters.button.reset').trim() })[0]);
  assert(ui.getByText('۱۴۰۴'));
  fireEvent.contextMenu(ui.getByText('۱۴۰۳').closest('tr'));
  assert(ui.getByRole('menuitem', { name: i18n.t('afghanExamPeriods.edit') })); cleanup();
  const beforeSave = saves.length;
  ui = view(h(PeriodEditor), '/afghanistan/exam-periods/midterm', true, '/afghanistan/exam-periods');
  await waitFor(() => assert.equal(ui.getByLabelText(i18n.t('afghanExamPeriods.fromDate'), { exact: false, selector: "input,select" }).value, '۱۴۰۳/۰۴/۱۱'));
  fireEvent.change(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }), { target: { value: 'second' } });
  fireEvent.submit(ui.container.querySelector('form'));
  await waitFor(() => assert(ui.getByText(i18n.t('afghanExamPeriods.invalidDates')))); assert.equal(saves.length, beforeSave);
  fireEvent.change(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }), { target: { value: 'first' } });
  failSave = true; fireEvent.submit(ui.container.querySelector('form'));
  await waitFor(() => assert(ui.getByText('This examination period changed. Reload it before saving.')));
  assert.equal(saves.length, beforeSave); failSave = false;
  fireEvent.submit(ui.container.querySelector('form')); await waitFor(() => assert.equal(saves.length, beforeSave + 1));
  assert.deepEqual(saves[beforeSave], { url: '/afghanistan/exam-periods/midterm', dto: { academicYearId: 'first', examType: 0, fromDate: '2024-07-01', toDate: '2024-07-15', version: 'period-v1' } }); cleanup();
  ui = view(h(PeriodEditor), '/afghanistan/exam-periods/new', true, '/afghanistan/exam-periods');
  await waitFor(() => assert.equal(ui.getByLabelText(i18n.t('afghanAcademicYears.year'), { exact: false, selector: "input,select" }).value, 'first')); cleanup();
  // Every country category has its own translated label, filter option and save value.
  const { afghanExamTypes, afghanExamTypeLabelKey } = require(country + '/src/examPeriods/examTypes.ts');
  for (const language of ['en-US', 'fa-AF', 'ps-AF']) {
    await i18n.changeLanguage(language);
    periods = afghanExamTypes.map(value => ({ id: 'type-' + value, academicYearId: 'first', examType: Number(value), fromDate: '2024-07-01', toDate: '2024-07-15', version: 'v-' + value }));
    ui = view(h(PeriodList));
    await waitFor(() => assert(ui.getAllByRole('row').length >= 8));
    const typeFilter = ui.getByLabelText(i18n.t('afghanExamPeriods.type'), { exact: false, selector: "input,select" });
    assert.equal(typeFilter.options.length, 8);
    for (const value of afghanExamTypes) {
      const label = i18n.t(afghanExamTypeLabelKey(value));
      assert(!label.startsWith('afghanExamPeriods.'));
      fireEvent.change(typeFilter, { target: { value } });
      fireEvent.click(ui.getByRole('button', { name: i18n.t('filters.button.label') }));
      const dataRows = ui.getAllByRole('row').slice(1);
      assert.equal(dataRows.length, 1); assert(dataRows[0].textContent.includes(label));
    }
    cleanup();
    for (const value of afghanExamTypes.slice(2)) {
      ui = view(h(PeriodEditor), '/afghanistan/exam-periods/type-' + value, true, '/afghanistan/exam-periods');
      await waitFor(() => assert.equal(ui.getByLabelText(i18n.t('afghanExamPeriods.type'), { exact: false, selector: "input,select" }).value, value));
      const saved = saves.length;
      fireEvent.submit(ui.container.querySelector('form'));
      await waitFor(() => assert.equal(saves.length, saved + 1));
      assert.equal(saves[saved].dto.examType, Number(value)); cleanup();
    }
  }
  await i18n.changeLanguage('ps-AF'); periods = []; ui = view(h(PeriodList)); await act(async () => {});
  assert(ui.getByRole('link', { name: i18n.t('afghanExamPeriods.add') }));
  assert(ui.getByLabelText(i18n.t('afghanExamPeriods.type'), { exact: false, selector: "input,select" }).closest('.filter-form')); cleanup();
  rows = []; ui = view(h(PeriodEditor), '/afghanistan/exam-periods/new', true, '/afghanistan/exam-periods');
  await waitFor(() => assert(ui.getByText(i18n.t('afghanExamPeriods.noYears')))); assert(ui.getByRole('button', {name: i18n.t('afghanAcademicYears.add')})); cleanup();
  const definition = require(country + '/src/applicationModule.tsx').afghanistanApplicationModule;
  assert(definition.routes.some(route => route.path === '/afghanistan/exam-periods' && route.roles.includes('HEAD_MASTER') && !route.roles.includes('TEACHER')));
  assert(definition.routes.some(route => route.path === '/afghanistan/academic-years' && route.roles.includes('PRINCIPAL') && !route.roles.includes('TEACHER')));
  const selectModules = require(core + '/src/modules/definitions.ts').selectModules;
  assert.equal(selectModules([definition], { countryCode: 'AT', role: 'ADMIN' }).length, 0);
  console.log('PASS: country-owned examination-period filters/editors/version guards and school-year list/editor, Hijri leap bounds and timezone-safe labels, localized year parsing, role/module isolation, shared filters, confirmation/versioned activation, visible stale errors and validated saves.');
})().catch(error => { console.error(error); process.exitCode = 1; });
