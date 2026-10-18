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
let records=[],reads=[],posts=[],deletes=[],failure=false,deleteFailure=false,waitUpload,waitRead;
const endpoint='/afghanistan/identity-attachments/student/student-1';
const old={id:'old',kind:0,fileName:'paper.pdf',contentType:'application/pdf',size:100,creationDate:'2000-01-01T12:00:00Z'};
const recent={id:'new',kind:1,fileName:'electronic.png',contentType:'image/png',size:200,creationDate:new Date().toISOString()};
let downloads=[],revoked=[];
const api={
 get:async(url,config={})=>{reads.push({url,config});if(waitRead)return new Promise(resolve=>{waitRead=resolve});if(failure)throw {response:{data:{detail:'Attachment unavailable'}}};return {data:config.responseType==='blob'?new Blob(['%PDF-1.4']):records}},
 post:async(url,body,config)=>{posts.push({url,body,config});if(waitUpload)await new Promise(resolve=>{waitUpload=resolve});records=[...records,{...recent,id:'uploaded',fileName:body.get('file').name}];return {data:records.at(-1)}},
 delete:async(url,config)=>{deletes.push({url,config});if(deleteFailure)throw {response:{data:{detail:'Cannot remove attachment'}}};records=records.filter(row=>!url.endsWith('/'+row.id));return {status:204}},
};
mocks={useApplicationModules:require(core+'/src/modules/ModuleContext.tsx').useApplicationModules,AppStandaloneInput:load('components/input/AppStandaloneInput.tsx'),AppTable:load('components/table/AppTable.tsx'),AppCard:load('components/card/AppCard.tsx'),AppAlert:load('components/AppAlert.tsx'),AppButton:load('components/AppButton.tsx'),AppModal:load('components/modal/AppModal.tsx'),AppForm:load('components/form/AppForm.tsx'),AppEnumFilterSelect:load('components/select/AppEnumFilterSelect.tsx'),AppStandaloneFileInput:load('components/input/AppStandaloneFileInput.tsx'),AppCalendarGrid:load('components/calendar/AppCalendarGrid.tsx'), AppCalendarChoiceGrid: load('components/calendar/AppCalendarChoiceGrid.tsx'),useAppLocalizer:require(core+'/src/hooks/useAppLocalizer.ts').useAppLocalizer,useFormattedDate:load('hooks/useFormattedDate.ts'),apiClient:api};
const {afghanistanCalendar}=require(country+'/src/calendarModule.ts');
const Attachments=require(country+'/src/identityAttachments/AfghanIdentityAttachments.tsx').default;
const view=(type='student',id='student-1')=>render(h(I18nextProvider,{i18n},h(MemoryRouter,null,h(AuthContext.Provider,{value:{userRole:0}},h(CalendarProvider,{value:afghanistanCalendar},h(Attachments,{ownerType:type,ownerId:id}))))));
URL.createObjectURL=blob=>{if(blob.type.startsWith('text/csv'))csvBlob=blob;return 'blob:attachment'};URL.revokeObjectURL=url=>revoked.push(url);window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download)};
(async()=>{
 const resources={};for(const language of ['en-US','fa-AF','ps-AF'])resources[language]={translation:{...JSON.parse(fs.readFileSync(core+'/src/locales/en-US/translation.json')),...JSON.parse(fs.readFileSync(country+'/src/locales/'+language+'/translation.json'))}};
 await i18n.init({lng:'en-US',resources,interpolation:{escapeValue:false}});
 // New profiles have no owner ID: no GET, upload controls, or POST until saved.
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);
  for(const type of ['teacher','student'])for(const id of ['', '   ']){
   const beforeReads=reads.length,beforePosts=posts.length;const ui=view(type,id);
   await act(async()=>{});
   assert(ui.getByText(i18n.t(type==='teacher'?'afghanTeacherDetails.saveProfileFirst':'afghanStudentDetails.saveProfileFirst')));
   assert.equal(reads.length,beforeReads);assert.equal(posts.length,beforePosts);
   assert.equal(ui.container.querySelector('form'),null);assert.equal(ui.container.querySelector('input[type=file]'),null);cleanup();
  }
 }
 for(const language of ['en-US','fa-AF','ps-AF']){
  await i18n.changeLanguage(language);records=[old,recent];reads=[];pdfRows=null;csvBlob=null;let ui=view();await waitFor(()=>assert(ui.getByText('paper.pdf')));assert.equal(reads.length,1);assert.equal(reads[0].config.headers['Cache-Control'],'no-store');assert.equal(ui.container.querySelectorAll('table').length,1);
  const filter=ui.container.querySelector('.filter-form');fireEvent.change(within(filter).getByLabelText(i18n.t('afghanIdentityAttachments.kind'),{selector:'select'}),{target:{value:'1'}});assert(ui.getByText('paper.pdf'));fireEvent.click(within(filter).getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('paper.pdf'));assert(ui.getByText('electronic.png'));assert.equal(reads.length,1);
  fireEvent.click(ui.getByRole('button',{name:i18n.t('report.csv.tooltip')}));await waitFor(()=>assert(csvBlob));assert((await csvBlob.text()).includes('electronic.png'));assert(!(await csvBlob.text()).includes('paper.pdf'));
  fireEvent.click(ui.getByRole('button',{name:i18n.t('report.print.tooltip')}));fireEvent.click(ui.getByRole('button',{name:i18n.t('report.settings.export')}));await waitFor(()=>assert(pdfRows));assert.deepEqual(pdfRows.map(row=>row.id),['new']);
  // Use a new view so completed PDF settings do not obscure row interaction.
  cleanup();ui=view();await waitFor(()=>assert(ui.getByText('paper.pdf')));const dateFilter=ui.container.querySelector('.filter-form');fireEvent.click(within(dateFilter).getByLabelText(i18n.t('dateRange.from'),{selector:'input'}));fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanDatePicker.today')}));fireEvent.click(within(dateFilter).getByRole('button',{name:i18n.t('filters.button.label')}));assert(!ui.queryByText('paper.pdf'));assert(ui.getByText('electronic.png'));fireEvent.click(within(dateFilter).getByRole('button',{name:i18n.t('filters.button.reset').trim()}));assert(ui.getByText('paper.pdf'));fireEvent.doubleClick(ui.getByText('paper.pdf').closest('tr'));await waitFor(()=>assert(downloads.includes('paper.pdf')));assert(revoked.includes('blob:attachment'));assert.equal(reads.at(-1).config.responseType,'blob');
  fireEvent.click(within(ui.getByText('paper.pdf').closest('tr')).getByRole('button',{name:i18n.t('afghanIdentityAttachments.remove')}));let dialog=within(ui.getByRole('dialog'));assert(dialog.getByText(i18n.t('afghanIdentityAttachments.confirmRemove')));assert.equal(deletes.length,0);fireEvent.click(dialog.getAllByRole('button',{name:i18n.t('close.label')}).at(-1));assert(!ui.queryByRole('dialog'));
  fireEvent.contextMenu(ui.getByText('paper.pdf').closest('tr'));fireEvent.click(ui.getByRole('menuitem',{name:i18n.t('afghanIdentityAttachments.remove')}));dialog=within(ui.getByRole('dialog'));deleteFailure=true;fireEvent.click(dialog.getByRole('button',{name:i18n.t('afghanIdentityAttachments.remove')}));await waitFor(()=>assert(dialog.getByText('Cannot remove attachment')));assert(ui.queryByRole('dialog'));deleteFailure=false;fireEvent.click(dialog.getByRole('button',{name:i18n.t('afghanIdentityAttachments.remove')}));await waitFor(()=>assert(!ui.queryByText('paper.pdf')));deletes=[];
  const picker=ui.getByLabelText(i18n.t('afghanIdentityAttachments.file'),{selector:'input[type="file"]'});fireEvent.change(picker,{target:{files:[new File(['%PDF-1.4'],'uploaded.pdf',{type:'application/pdf'})]}});waitUpload=true;const submit=ui.getByRole('button',{name:i18n.t('afghanIdentityAttachments.upload')});const count=posts.length;fireEvent.click(submit);fireEvent.click(submit);await waitFor(()=>assert.equal(posts.length,count+1));assert(submit.disabled);assert.equal(posts.at(-1).body.get('kind'),'0');assert.equal(posts.at(-1).config.headers['Content-Type'],'multipart/form-data');await act(async()=>waitUpload());waitUpload=null;await waitFor(()=>assert(ui.getByText('uploaded.pdf')));assert.equal(picker.value,'');assert(ui.getByRole('button',{name:i18n.t('afghanIdentityAttachments.upload')}).disabled);cleanup();
 }
 records=[old];failure=true;let ui=view('teacher','teacher-1');await waitFor(()=>assert(ui.getByText('Attachment unavailable')));assert.equal(reads.at(-1).url,'/afghanistan/identity-attachments/teacher/teacher-1');assert(ui.container.querySelector('.filter-form'));failure=false;fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanAcademicYears.refresh')}));await waitFor(()=>assert(ui.getByText('paper.pdf')));cleanup();
 waitRead=true;ui=view();const signal=reads.at(-1).config.signal;cleanup();assert(signal.aborted);await act(async()=>waitRead({data:[]}));waitRead=null;
 // Core's unconnected file picker and Formik reset share the same presentation.
 const CoreFile=load('components/input/AppFileInput.tsx');let localFile;ui=render(h(I18nextProvider,{i18n},h(CoreFile,{name:'uncontrolledFile',label:'Uncontrolled file',setFieldValue:(_key,value)=>{localFile=value}})));fireEvent.change(ui.getByLabelText('Uncontrolled file'),{target:{files:[new File(['sample'],'sample.pdf')]}});await waitFor(()=>assert(ui.getByRole('button',{name:'sample.pdf'})));assert.equal(localFile.name,'sample.pdf');cleanup();
 const {useFormikContext}=require(app+'/formik');const ResetFile=()=>{const form=useFormikContext();return h(mocks.AppButton,{label:'Reset file',onClick:()=>form.resetForm()})};ui=render(h(I18nextProvider,{i18n},h(mocks.AppForm,{initialValues:{file:null},validate:values=>values.file?{}:{file:'File required'},onSubmit:()=>{}},h(load('components/form/AppFormInput.tsx'),{name:'file',label:'Formik file',type:'file'}),h(ResetFile))));fireEvent.change(ui.getByLabelText('Formik file'),{target:{files:[new File(['sample'],'formik.pdf')]}});await waitFor(()=>assert(ui.getByRole('button',{name:'formik.pdf'})));fireEvent.click(ui.getByRole('button',{name:'Reset file'}));await waitFor(()=>assert(!ui.queryByRole('button',{name:'formik.pdf'})));fireEvent.submit(ui.container.querySelector('form'));await waitFor(()=>assert(ui.getByText('File required')));assert(ui.getByRole('button',{name:i18n.t('controls.fileInput.button')}).classList.contains('is-invalid'));assert.equal(ui.getByRole('button',{name:i18n.t('controls.fileInput.button')}).getAttribute('aria-describedby'),'file-error');cleanup();
 // Keep the mounted panel on a school switch: previous filenames and exports must disappear.
 const {ApplicationModuleContextProvider}=require(core+'/src/modules/ModuleContext.tsx');const scoped=school=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(ApplicationModuleContextProvider,{modules:[],scope:{schoolId:school}},h(Attachments,{ownerType:'student',ownerId:'student-1'}))));records=[old];ui=render(scoped('school-one'));await waitFor(()=>assert(ui.getByText('paper.pdf')));failure=true;ui.rerender(scoped('school-two'));assert(!ui.queryByText('paper.pdf'));await waitFor(()=>assert(ui.getByText('Attachment unavailable')));failure=false;cleanup();
 // A mounted editor can move between an unsaved profile and a saved teacher.
 const teacherPanel=id=>h(I18nextProvider,{i18n},h(MemoryRouter,null,h(Attachments,{ownerType:'teacher',ownerId:id})));
 reads=[];records=[old];ui=render(teacherPanel(''));await act(async()=>{});assert.equal(reads.length,0);
 ui.rerender(teacherPanel('saved-teacher'));await waitFor(()=>assert(ui.getByText('paper.pdf')));assert.equal(reads.length,1);assert.equal(reads[0].url,'/afghanistan/identity-attachments/teacher/saved-teacher');
 fireEvent.change(ui.getByLabelText(i18n.t('afghanIdentityAttachments.file'),{selector:'input[type="file"]'}),{target:{files:[new File(['%PDF-1.4'],'teacher.pdf',{type:'application/pdf'})]}});
 fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanIdentityAttachments.upload')}));await waitFor(()=>assert(ui.getByText('teacher.pdf')));
 assert.equal(posts.at(-1).url,'/afghanistan/identity-attachments/teacher/saved-teacher');assert.equal(reads.length,2);
 waitRead=true;fireEvent.click(ui.getByRole('button',{name:i18n.t('afghanAcademicYears.refresh')}));const staleSignal=reads.at(-1).config.signal;
 ui.rerender(teacherPanel(''));assert(staleSignal.aborted);assert(!ui.queryByText('paper.pdf'));await act(async()=>waitRead({data:[old]}));waitRead=null;
 assert(!ui.queryByText('paper.pdf'));assert.equal(reads.length,3);cleanup();
 const definition=require(country+'/src/applicationModule.tsx').afghanistanApplicationModule;const contributions=definition.editors.filter(editor=>editor.id==='afghan-identity-attachments');assert.deepEqual(contributions.map(editor=>editor.entity).sort(),['student','teacher']);assert(contributions.every(editor=>editor.roles.length===1&&editor.roles[0]==='ADMIN'));
 console.log('PASS: country student/teacher attachment tabs reuse shared forms/table/PDF/CSV, kind/date filters, authenticated downloads and URL cleanup, confirmation/retry, one upload per double click, empty/error states, no-store reads and cancellation in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
