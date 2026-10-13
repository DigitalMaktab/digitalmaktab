const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const projects = process.env.PDF_AUDIT_PROJECTS || path.resolve(__dirname, '../../..');
const source = path.join(projects, 'digitalmaktab-spa-core/src');
const country = path.join(projects, 'digitalmaktab-spa-country-afghanistan/src');
const app = path.join(projects, 'digitalmaktab-spa/node_modules');
const { JSDOM } = require(path.join(app, 'jsdom'));
const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement']) global[key] = dom.window[key];
global.IS_REACT_ACT_ENVIRONMENT = true;
const ts = require(path.join(projects, 'digitalmaktab-spa-core/node_modules/typescript'));
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
}).outputText, file);
const realLoad = Module._load;
let facade;
Module._load = function (request, parent, isMain) {
  if (request === '@digitalmaktab/spa-core') return facade;
  if (['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'react-i18next', 'i18next'].includes(request)) return realLoad.call(this, path.join(app, request), parent, isMain);
  return realLoad.apply(this, arguments);
};
const React = require(path.join(app, 'react'));
const { render, fireEvent, cleanup } = require(path.join(app, '@testing-library/react'));
const { I18nextProvider } = require(path.join(app, 'react-i18next'));
const i18n = require(path.join(app, 'i18next')).createInstance();
const component = file => require(path.join(source, file)).default;
facade = {
  AppStandaloneInput: component('components/input/AppStandaloneInput.tsx'),
  AppButton: component('components/AppButton.tsx'),
  AppCalendarGrid: component('components/calendar/AppCalendarGrid.tsx'),
  useAppLocalizer: require(path.join(source, 'hooks/useAppLocalizer.ts')).useAppLocalizer,
};
const AfghanDatePicker = require(path.join(country, 'AfghanDatePicker.tsx')).default;
const AppDateRange = component('components/AppDateRange.tsx');
const { CalendarProvider, gregorianCalendar } = require(path.join(source, 'contexts/CalendarContext.tsx'));
const { toJalali, toGregorian } = require(path.join(country, 'jalali.ts'));
const { isValidDateRange, isDateInRange } = require(path.join(source, 'helper/dateRange.ts'));
const { prepareTablePdf, defaultPdfSettings } = require(path.join(source, 'pdf/tableSettings.ts'));
const h = React.createElement;
(async () => {
  const resources = {};
  for (const locale of ['en-US', 'fa-AF', 'ps-AF']) {
    const file = locale === 'en-US' ? path.join(source, 'locales/en-US/translation.json') : path.join(country, 'locales', locale, 'translation.json');
    resources[locale] = { translation: JSON.parse(fs.readFileSync(file, 'utf8')) };
  }
  await i18n.init({ lng: 'en-US', resources, interpolation: { escapeValue: false } });
  const Wrapper = ({ calendar = gregorianCalendar, initial = { from: '2026-10-13', to: '2026-10-14' }, disabled = false }) => {
    const [value, setValue] = React.useState(initial);
    return h(I18nextProvider, { i18n }, h(CalendarProvider, { value: calendar },
      h(AppDateRange, { value, disabled, onChange: setValue }), h('output', null, JSON.stringify(value))));
  };
  let ui = render(h(Wrapper));
  assert.equal(ui.getByLabelText(i18n.t('dateRange.from')).type, 'date');
  assert.equal(ui.getByLabelText(i18n.t('dateRange.to')).min, '2026-10-13');
  fireEvent.change(ui.getByLabelText(i18n.t('dateRange.to')), { target: { value: '2026-10-15' } });
  assert(ui.getByText('{"from":"2026-10-13","to":"2026-10-15"}')); cleanup();
  for (const locale of ['fa-AF', 'ps-AF', 'en-US']) {
    await i18n.changeLanguage(locale);
    // Use the real country picker through the same injected adapter contract as the shell.
    const calendar = { ...gregorianCalendar, system: 'SOLAR_HIJRI', DatePicker: AfghanDatePicker };
    ui = render(h(Wrapper, { calendar }));
    const from = ui.getByLabelText(i18n.t('dateRange.from'));
    assert.equal(from.type, 'text');
    assert(from.value.includes(locale === 'en-US' ? '1405' : '۱۴۰۵'));
    fireEvent.click(from);
    const twentyFirst = locale === 'en-US' ? '21' : '۲۱';
    fireEvent.click(ui.getByRole('button', { name: twentyFirst }));
    assert(ui.getByText('{"from":"2026-10-13","to":"2026-10-14"}'));
    // The end-date picker may not select a day earlier than the start.
    fireEvent.click(ui.getByLabelText(i18n.t('dateRange.to')));
    assert(ui.getByRole('button', { name: locale === 'en-US' ? '20' : '۲۰' }).disabled);
    fireEvent.click(ui.getByRole('button', { name: locale === 'en-US' ? '22' : '۲۲' }));
    assert(ui.getByText('{"from":"2026-10-13","to":"2026-10-14"}')); cleanup();
  }
  await i18n.changeLanguage('en-US');
  ui = render(h(Wrapper, { initial: { from: '2026-10-14', to: '2026-10-13' } }));
  assert(ui.getByRole('alert').textContent.includes(i18n.t('dateRange.invalidRange'))); cleanup();
  ui = render(h(Wrapper, { disabled: true })); assert(ui.getByLabelText(i18n.t('dateRange.from')).disabled); cleanup();
  assert(isValidDateRange({ from: '', to: '' })); assert(!isValidDateRange({ from: '2026-02-30', to: '' }));
  assert(isDateInRange(new Date('2026-10-13T00:00:00Z'), { from: '2026-10-13', to: '2026-10-13' }));
  assert(isDateInRange('2026-10-13T23:59:59Z', { from: '2026-10-13', to: '2026-10-13' }));
  assert(!isDateInRange(null, { from: '2026-10-13', to: '' }));
  const columns = [{ header: 'Name', accessor: 'name' }];
  const rows = [{ name: 'Creation wins', creationDate: '2026-10-13T00:00:00Z', createdAt: '2030-01-01', dueDate: '2030-01-01' },
    { name: 'Legacy entry timestamp', createdAt: '2026-10-13T00:00:00Z' }, { name: 'Missing creation timestamp', dueDate: '2026-10-13' }];
  const report = prepareTablePdf(columns, rows, { ...defaultPdfSettings(columns), dateFrom: '2026-10-13', dateTo: '2026-10-13' });
  assert.deepEqual(report.rows.map(row => row.name), ['Creation wins', 'Legacy entry timestamp']);
  assert.deepEqual(toJalali(new Date('2026-10-13T00:00:00Z')), { jy: 1405, jm: 6, jd: 21 });
  assert.equal(toGregorian(1405, 6, 21).toISOString().slice(0, 10), '2026-10-13');
  console.log('PASS: reusable core range selects Gregorian dates or real country Solar Hijri dates, validates bounds, and filters creation timestamps without a printed date column. TZ=' + Intl.DateTimeFormat().resolvedOptions().timeZone);
})().catch(error => { console.error(error); process.exitCode = 1; });
