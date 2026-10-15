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
let requests = [], lookupCalls = [], mutationCalls = [], failPending = false, lookupError, pendingResolve, actionResolve;
const incoming = { id:'transfer-in',studentId:'student-in',fromSchoolId:'origin',toSchoolId:'target',toClassId:'class',requestedAt:'2026-10-16T12:00:00Z',creationDate:'2000-01-01',transferStatus:'REQUESTED' };
const outgoing = { ...incoming,id:'transfer-out',studentId:'student-out',creationDate:'2026-10-16' };
const found = { studentId:'student-found',firstName:'Ahmad',lastName:'Test',fromSchoolName:'Origin school' };
const countryLookup = { label:'student.asasNumber.label', lookup:async (...args) => { lookupCalls.push(args); if(lookupError)throw lookupError; return {data:found}; } };
const transferApi = {
  pending:async signal=>{ requests.push(signal); if(failPending)throw new Error('offline'); if(pendingResolve)return new Promise(resolve=>{pendingResolve=resolve}); return {data:{incoming:[incoming],outgoing:[outgoing]}}; },
  lookup:async (...args)=>{lookupCalls.push(args);return {data:found}},
  request:async (...args)=>{mutationCalls.push(['request',...args]);if(actionResolve)return new Promise(resolve=>{actionResolve=resolve});return {data:{transferId:'new'}}},
  release:async id=>{mutationCalls.push(['release',id]);if(actionResolve)return new Promise(resolve=>{actionResolve=resolve});return {data:{}}},
  cancel:async id=>{mutationCalls.push(['cancel',id]);return {data:{}}},
};
let countryCode='AF';
mocks={
  AppCalendarGrid:load('components/calendar/AppCalendarGrid.tsx'),AppForm:load('components/form/AppForm.tsx'),AppTable:load('components/table/AppTable.tsx'),AppCard:load('components/card/AppCard.tsx'),AppAlert:load('components/AppAlert.tsx'),AppButton:load('components/AppButton.tsx'),AppModal:load('components/modal/AppModal.tsx'),AppStandaloneInput:load('components/input/AppStandaloneInput.tsx'),
  AppClassSelect:props=>h(mocks.AppStandaloneInput,{...props,label:'Target class'}),
  useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormattedDate:load('hooks/useFormattedDate.ts'),
  useSchoolCountryCode:()=>countryCode,useCountryPeople:()=>({students:[{countryCode:'AF',transferLookup:countryLookup}]}),
  getPersonFirstName:row=>row.firstNameNative,getPersonLastName:row=>row.lastNameNative,
  ...require(core+'/src/helper/localizedNumber.ts'),transfer:transferApi,
};
const TransferList=require(projects+'/digitalmaktab-spa/src/screens/school/transfer/TransferList.tsx').default;
const {afghanistanCalendar}=require(country+'/src/calendarModule.ts');
const view=()=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:0}},h(CalendarProvider,{value:afghanistanCalendar},h(TransferList))))));
const field=(ui,key)=>within(ui.container.querySelector('#transfer-identifier').closest('.card')).getByLabelText(i18n.t(key),{selector:'input,select,textarea'});
URL.createObjectURL=blob=>{if(blob.type.startsWith('text/csv'))csvBlob=blob;return 'blob:transfer'};URL.revokeObjectURL=()=>{};window.HTMLAnchorElement.prototype.click=()=>{};
(async()=>{
 const resources={};for(const lang of ['en-US','fa-AF','ps-AF'])resources[lang]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+lang+'/translation.json'))}};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 assert.equal(mocks.parsePositiveInteger(' ١۰۰۲ ',2147483647),1002);for(const input of ['12abc','12.3','1e3','-1','0','2147483648'])assert.equal(mocks.parsePositiveInteger(input,2147483647),null);
 for(const lang of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(lang);let ui=view();await waitFor(()=>assert(ui.getByText('student-in')));const initial=requests.length;
  assert.equal(ui.container.querySelectorAll('table').length,2);assert.equal(ui.container.querySelectorAll('.filter-form').length,2);
  assert(ui.container.querySelector('#transfer-identifier').closest('.theme-form'));
  fireEvent.change(field(ui,'student.asasNumber.label'),{target:{value:'۱۲۳'}});fireEvent.change(field(ui,'transfer.fromSchoolCode'),{target:{value:'١۰۰۲'}});
  fireEvent.click(ui.getAllByRole('button',{name:i18n.t('transfer.lookup'),exact:true})[0]);await waitFor(()=>assert(ui.getByText('Ahmad Test')));assert.equal(lookupCalls.at(-1)[1],1002);assert.equal(lookupCalls.at(-1)[0],'۱۲۳');assert(lookupCalls.at(-1)[2] instanceof AbortSignal);
  fireEvent.change(field(ui,'transfer.fromSchoolCode'),{target:{value:'1002bad'}});assert(!ui.queryByText('Ahmad Test'));const lookups=lookupCalls.length;
  fireEvent.click(ui.getAllByRole('button',{name:i18n.t('transfer.lookup'),exact:true})[0]);await waitFor(()=>assert(ui.getByText(i18n.t('transfer.lookupBadInput'))));assert.equal(lookupCalls.length,lookups);
  fireEvent.change(field(ui,'transfer.fromSchoolCode'),{target:{value:'1002'}});lookupError={response:{status:409}};fireEvent.click(ui.getAllByRole('button',{name:i18n.t('transfer.lookup'),exact:true})[0]);await waitFor(()=>assert(ui.getByText(i18n.t('transfer.lookupConflict'))));lookupError=null;
  fireEvent.click(ui.getByRole('button',{name:i18n.t('transfer.release'),exact:true}));let dialog=within(ui.getByRole('dialog'));assert(dialog.getByText(i18n.t('transfer.confirmRelease')));assert.equal(mutationCalls.length,0);
  fireEvent.click(dialog.getAllByRole('button',{name:i18n.t('close.label')}).at(-1));assert(!ui.queryByRole('dialog'));
  fireEvent.doubleClick(ui.getByText('student-in').closest('tr'));dialog=within(ui.getByRole('dialog'));assert(dialog.getByText('student-in'));fireEvent.click(dialog.getAllByRole('button',{name:i18n.t('close.label')}).at(-1));
  fireEvent.contextMenu(ui.getByText('student-out').closest('tr'));fireEvent.click(ui.getByRole('menuitem',{name:i18n.t('transfer.cancel')}));dialog=within(ui.getByRole('dialog'));assert(dialog.getByText(i18n.t('transfer.confirmCancel')));assert.equal(mutationCalls.length,0);fireEvent.click(dialog.getAllByRole('button',{name:i18n.t('close.label')}).at(-1));
  const panel=ui.container.querySelectorAll('.filter-form')[0];fireEvent.change(within(panel).getByLabelText(i18n.t('transfer.row.studentId'),{selector:'input'}),{target:{value:'absent'}});assert(ui.getByText('student-in'));fireEvent.click(within(panel).getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('student-in'));assert.equal(requests.length,initial);
  fireEvent.click(ui.getAllByRole('button',{name:i18n.t('report.csv.tooltip')})[0]);await waitFor(()=>assert(csvBlob));assert(!(await csvBlob.text()).includes('student-in'));csvBlob=null;
  fireEvent.click(within(panel).getByRole('button',{name:i18n.t('filters.button.reset').trim()}));assert(ui.getByText('student-in'));
  fireEvent.click(within(panel).getByLabelText(i18n.t('dateRange.from'),{selector:'input'}));fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanDatePicker.today')}));assert(ui.getByText('student-in'));fireEvent.click(within(panel).getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('student-in'));assert.equal(requests.length,initial);
  cleanup();
 }
 await i18n.changeLanguage('en-US');let ui=view();await waitFor(()=>assert(ui.getByText('student-in')));
 // The mutation ref closes the synchronous double-click window; the modal stays until completion.
 fireEvent.click(ui.getByRole('button',{name:'Release',exact:true}));actionResolve=true;let button=within(ui.getByRole('dialog')).getByRole('button',{name:'Release',exact:true});fireEvent.click(button);fireEvent.click(button);assert.equal(mutationCalls.length,1);assert(button.disabled);await act(async()=>{actionResolve({data:{}})});actionResolve=null;await waitFor(()=>assert(!ui.queryByRole('dialog')));mutationCalls=[];cleanup();
 failPending=true;ui=view();await waitFor(()=>assert(ui.getByText(i18n.t('transfer.loadFailed'))));assert.equal(ui.container.querySelectorAll('.filter-form').length,2);failPending=false;fireEvent.click(ui.getByRole('button',{name:i18n.t('transfer.retry')}));await waitFor(()=>assert(ui.getByText('student-in')));cleanup();
 // Both school data and lookups are abandoned on unmount.
 pendingResolve=true;ui=view();const signal=requests.at(-1);cleanup();assert(signal.aborted);await act(async()=>pendingResolve({data:{incoming:[],outgoing:[]}}));pendingResolve=null;
 countryCode='AT';ui=view();fireEvent.change(field(ui,'student.picker.label'),{target:{value:'student-uuid'}});fireEvent.change(field(ui,'transfer.fromSchoolCode'),{target:{value:'2002'}});fireEvent.click(ui.getAllByRole('button',{name:i18n.t('transfer.lookup'),exact:true})[0]);await waitFor(()=>assert(ui.getByText('Ahmad Test')));assert.equal(lookupCalls.at(-1)[0],'student-uuid');fireEvent.change(ui.getByLabelText('Target class'),{target:{value:'class-target'}});actionResolve=true;const requestButton=ui.getByRole('button',{name:i18n.t('transfer.fileRequest')});fireEvent.click(requestButton);fireEvent.click(requestButton);assert.deepEqual(mutationCalls,[['request','student-found','class-target']]);await act(async()=>actionResolve({data:{transferId:'new'}}));actionResolve=null;await waitFor(()=>assert(ui.getByText(i18n.t('transfer.requestOk'))));assert(!ui.queryByText('Ahmad Test'));cleanup();
 console.log('PASS: real transfer screen uses shared tables/filters/exports, native school codes, country lookup, confirmations, review/context actions, one mutation per double click, visible load/lookup errors, Retry and request cancellation in all three languages.');
})().catch(error=>{console.error(error);process.exitCode=1});
