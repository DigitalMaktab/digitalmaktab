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
let documents=[],reads=[],writes=[],removes=[],failure=false,deleteFailure=false,saveFailure=false,waitSave;
const base='/afghanistan/transfer-dossiers',header={id:'transfer',studentId:'student',studentName:'Ahmad',asasNumber:12,fromSchool:'Origin',toSchool:'Destination',transferStatus:0,documentCount:2,creationDate:'2026-04-01T12:00:00Z'};
const first={id:'document',transferId:'transfer',kind:3,referenceNumber:'Letter 1',documentDate:'2026-04-01',notes:'Existing note',version:'v1',fileName:'letter.pdf',size:100,hasFile:true,creationDate:'2026-04-01T12:00:00Z'};
let downloads=[],revoked=[];
const api={
 get:async(url,config={})=>{reads.push({url,config});if(failure)throw {response:{data:{detail:'Read failed'}}};return {data:config.responseType==='blob'?new Blob(['%PDF-1.4']):url===base?[header]:url.endsWith('/documents')?documents:header}},
 post:async(url,body,config)=>{writes.push({url,body,config});if(waitSave)await new Promise(resolve=>{waitSave=resolve});if(saveFailure)throw {response:{data:{detail:'Save failed'}}};return {data:{}}},
 put:async(url,body,config)=>{writes.push({url,body,config});if(saveFailure)throw {response:{data:{detail:'Stale document'}}};return {data:{}}},
 delete:async(url,config)=>{removes.push({url,config});if(deleteFailure)throw {response:{data:{detail:'Stale document'}}};documents=documents.filter(row=>!url.endsWith('/'+row.id));return {status:204}}
};
mocks={useApplicationModules:require(core+'/src/modules/ModuleContext.tsx').useApplicationModules,AppBaseEditor:load('components/AppBaseEditor.tsx'),AppEnumSelect:load('components/form/AppEnumSelect.tsx'),AppFormInput:load('components/form/AppFormInput.tsx'),AppFormLocalDatePicker:load('components/form/AppFormLocalDatePicker.tsx'),AppStandaloneInput:load('components/input/AppStandaloneInput.tsx'),AppTable:load('components/table/AppTable.tsx'),AppCard:load('components/card/AppCard.tsx'),AppAlert:load('components/AppAlert.tsx'),AppButton:load('components/AppButton.tsx'),AppModal:load('components/modal/AppModal.tsx'),AppCalendarGrid:load('components/calendar/AppCalendarGrid.tsx'), AppCalendarChoiceGrid: load('components/calendar/AppCalendarChoiceGrid.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormattedDate:load('hooks/useFormattedDate.ts'),apiClient:api};
const {Routes,Route}=require(app+'/react-router-dom');
const List=require(country+'/src/transferDocuments/AfghanTransferDossiers.tsx').default,Dossier=require(country+'/src/transferDocuments/AfghanTransferDossier.tsx').default,Editor=require(country+'/src/transferDocuments/AfghanTransferDocumentEditor.tsx').default;
const {afghanistanCalendar}=require(country+'/src/calendarModule.ts');
const {ApplicationModuleContextProvider}=require(core+'/src/modules/ModuleContext.tsx');
const screen=(Component,path,pattern,school='school')=>h(I18nextProvider,{i18n},h(MemoryRouter,{initialEntries:[path]},h(AuthContext.Provider,{value:{userRole:0}},h(ApplicationModuleContextProvider,{modules:[],scope:{schoolId:school}},h(CalendarProvider,{value:afghanistanCalendar},h(Routes,null,h(Route,{path:pattern,element:h(Component)}),h(Route,{path:'*',element:h('p',null,'Navigated')})))))));
URL.createObjectURL=blob=>{if(blob.type.startsWith('text/csv'))csvBlob=blob;return 'blob:document'};URL.revokeObjectURL=url=>revoked.push(url);window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download)};
(async()=>{
 const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json'))}};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 const {validateDocument}=require(country+'/src/transferDocuments/api.ts');const values={kind:'0',referenceNumber:'',documentDate:'',notes:'',file:null};
 assert(validateDocument(values,false,key=>key).referenceNumber);assert.deepEqual(validateDocument(values,true,key=>key),{});
 assert(validateDocument({...values,referenceNumber:'valid',documentDate:'2026-02-30'},false,key=>key).documentDate);
 assert(validateDocument({...values,kind:'8'},true,key=>key).kind);assert(validateDocument({...values,referenceNumber:'x\u0000'},true,key=>key).referenceNumber);
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);reads=[];documents=[first,{...first,id:'other',kind:6,referenceNumber:'Receipt',hasFile:false,fileName:null}];let ui=render(screen(List,base,base));
  await waitFor(()=>assert(ui.getByText('Ahmad')));assert.equal(reads.length,1);assert.equal(reads[0].config.headers['Cache-Control'],'no-store');assert(ui.getByText(i18n.t('afghanTransferDocuments.states.0'),{selector:'td'}));
  fireEvent.doubleClick(ui.getByText('Ahmad').closest('tr'));assert(ui.getByText('Navigated'));cleanup();
  pdfRows=null;csvBlob=null;ui=render(screen(Dossier,base+'/transfer',base+'/:transferId'));await waitFor(()=>assert(ui.getByText('Letter 1')));
  assert(ui.getByText(i18n.t('afghanTransferDocuments.ownRecords')));const filter=ui.container.querySelector('.filter-form');
  fireEvent.change(within(filter).getByLabelText(i18n.t('afghanTransferDocuments.kind'),{selector:'select'}),{target:{value:'3'}});assert(ui.getByText('Receipt'));
  fireEvent.click(within(filter).getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('Receipt'));
  fireEvent.click(ui.getByRole('button',{name:i18n.t('report.csv.tooltip')}));await waitFor(()=>assert(csvBlob));assert((await csvBlob.text()).includes('Letter 1'));assert(!(await csvBlob.text()).includes('Receipt'));
  fireEvent.click(ui.getByRole('button',{name:i18n.t('report.print.tooltip')}));fireEvent.click(ui.getByRole('button',{name:i18n.t('report.settings.export')}));await waitFor(()=>assert(pdfRows));assert.equal(pdfRows.length,1);cleanup();
  ui=render(screen(Dossier,base+'/transfer',base+'/:transferId'));await waitFor(()=>assert(ui.getByText('Letter 1')));
  fireEvent.click(within(ui.getByText('Letter 1').closest('tr')).getByRole('button',{name:i18n.t('afghanTransferDocuments.download')}));await waitFor(()=>assert(downloads.includes('letter.pdf')));assert(revoked.includes('blob:document'));
  const before=removes.length;fireEvent.click(within(ui.getByText('Letter 1').closest('tr')).getByRole('button',{name:i18n.t('afghanTransferDocuments.remove')}));assert.equal(removes.length,before);
  let dialog=within(ui.getByRole('dialog'));deleteFailure=true;fireEvent.click(dialog.getByRole('button',{name:i18n.t('afghanTransferDocuments.remove')}));await waitFor(()=>assert(dialog.getByText('Stale document')));assert.equal(removes.at(-1).config.params.version,'v1');assert(ui.getByText('Letter 1',{selector:'td'}));
  deleteFailure=false;fireEvent.click(dialog.getByRole('button',{name:i18n.t('afghanTransferDocuments.remove')}));await waitFor(()=>assert(!ui.queryByText('Letter 1')));cleanup();
  documents=[first];ui=render(screen(Editor,base+'/transfer/documents/new',base+'/:transferId/documents/:id'));await waitFor(()=>assert(ui.getByLabelText(i18n.t('afghanTransferDocuments.reference'),{selector:'input'})));
  fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText(i18n.t('afghanTransferDocuments.referenceOrFile'))));
  const reference=ui.getByLabelText(i18n.t('afghanTransferDocuments.reference'),{selector:'input'});fireEvent.change(reference,{target:{value:'New letter'}});
  fireEvent.click(ui.getByLabelText(i18n.t('afghanTransferDocuments.date'),{selector:'input'}));fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanDatePicker.today')}));
  fireEvent.change(ui.getByLabelText(i18n.t('afghanTransferDocuments.file'),{selector:'input[type=file]'}),{target:{files:[new File(['%PDF-1.4'],'new.pdf',{type:'application/pdf'})]}});
  await act(async()=>{});waitSave=true;const beforeWrites=writes.length;fireEvent.submit(ui.container.querySelector('form'));fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert.equal(writes.length,beforeWrites+1));
  assert.equal(writes.at(-1).url,base+'/transfer/documents');assert.equal(writes.at(-1).body.get('referenceNumber'),'New letter');assert.equal(writes.at(-1).body.get('file').name,'new.pdf');assert(writes.at(-1).body.get('documentDate'));assert.equal(writes.at(-1).config.headers['Content-Type'],'multipart/form-data');
  await act(async()=>waitSave());waitSave=null;await waitFor(()=>assert(ui.getByText('Navigated')));cleanup();
  ui=render(screen(Editor,base+'/transfer/documents/document',base+'/:transferId/documents/:id'));await waitFor(()=>assert(ui.getByDisplayValue('Letter 1')));saveFailure=true;
  fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText('Stale document')));assert.equal(writes.at(-1).body.get('version'),'v1');assert.equal(writes.at(-1).body.get('file'),null);assert(ui.getByDisplayValue('Existing note'));saveFailure=false;cleanup();
 }
 reads=[];documents=[first];let ui=render(screen(Dossier,base+'/transfer',base+'/:transferId','one'));await waitFor(()=>assert(ui.getByText('Letter 1')));
 failure=true;ui.rerender(screen(Dossier,base+'/transfer',base+'/:transferId','two'));assert(!ui.queryByText('Letter 1'));await waitFor(()=>assert(ui.getByText('Read failed')));failure=false;cleanup();
 const definition=require(country+'/src/applicationModule.tsx').afghanistanApplicationModule;assert.equal(definition.routes.filter(route=>route.path.startsWith(base)).length,3);
 console.log('PASS: transfer dossiers use Core forms/tables, Solar Hijri dates, scoped private downloads, filtered exports, versioned confirmed deletion, validated single-submit multipart saves, retained errors and scope cleanup in all locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
