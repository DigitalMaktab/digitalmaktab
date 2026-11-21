// Shared mobile runtime + actual app adapters; transport and SecureStore are controlled.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const projects=path.resolve(__dirname,'../../..'),core=projects+'/digitalmaktab-mobile-core',app=projects+'/digitalmaktab-mobile-student/node_modules';
const original=Module._load,ts=require(core+'/node_modules/typescript');let exportsCore;
require.extensions['.tsx']=require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{fileName:f,compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText,f);
const secure=new Map();const storageFor=repo=>{if(!secure.has(repo))secure.set(repo,new Map());const data=secure.get(repo);return{getItemAsync:async key=>data.get(key)??null,setItemAsync:async(key,value)=>{data.set(key,value)},deleteItemAsync:async key=>{data.delete(key)}}};
Module._load=function(request,parent,isMain){
 if(request==='@digitalmaktab/mobile-core')return exportsCore;
 if(['react','react/jsx-runtime','react-dom/client','react-dom','@tanstack/react-query','zustand','zustand/vanilla','axios'].includes(request))return original.call(this,app+'/'+request,parent,isMain);
 const repo=parent?.filename.includes('digitalmaktab-mobile-parent')?'parent':'student';
 if(request==='expo-secure-store')return storageFor(repo);
 if(request==='../constants'&&parent?.filename.includes('/core/'))return{Settings:{apiUrl:'https://school.invalid/api'},UserRoleTarget:repo==='parent'?'PARENT':'STUDENT'};
 return original.apply(this,arguments);
};
exportsCore=require(core+'/src/index.ts');const {createMobileApi,createMobileAuthStore,sessionIsBound,MobileSessionQueryProvider,MobileCapacityError}=exportsCore;
const axios=require(app+'/axios'),React=require(app+'/react'),{act}=React;
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return{promise,resolve,reject}};
const response=(config,data={Student:{FirstName:'Original'},Status:false})=>({config,status:200,statusText:'OK',headers:{},data});
const denied=config=>new axios.AxiosError('Denied','ERR_BAD_REQUEST',config,{}, {...response(config),status:401});
const session=(id,role='STUDENT',school='school-one')=>{const claims={nameid:id,role,'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid':school};return{token:'header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature',user:{id,role,firstName:'Person',lastName:'One',email:'test@invalid',raw:{id,schoolId:school}}}};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const week=(prefix='Week',days=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'])=>days.map((day,index)=>({day,...Object.fromEntries(Array.from({length:10},(_,period)=>['hour'+(period+1),prefix+' '+index+'/'+(period+1)+(period===9?'\nConcurrent class':'')]))}));
(async()=>{
 const wire=[],api=createMobileApi({baseURL:'https://school.invalid/api',maxActive:2,adapter:config=>{const task=deferred();wire.push({config,task});return task.promise;}});let loggedOut=0;api.setUnauthorizedHandler(()=>loggedOut++);api.setAuthToken('token-a');
 const old=api.apiClient.get('/Student/attendance');await turn();assert.equal(wire[0].config.headers.get('Authorization'),'Bearer token-a');assert.equal(wire[0].config.headers.get('Cache-Control'),'no-store');
 api.setAuthToken('token-b');assert(wire[0].config.signal.aborted);wire[0].task.resolve(response(wire[0].config));await assert.rejects(old,axios.isCancel);
 await assert.rejects(api.apiClient.get('/old-override',{accountToken:'token-a'}),axios.isCancel);assert.equal(wire.length,1);
 const stale=api.apiClient.get('/old');await turn();api.setAuthToken('token-c');wire[1].task.reject(denied(wire[1].config));await assert.rejects(stale);assert.equal(loggedOut,0,'old credentials cannot log out current session');
 const publicLogin=api.apiClient.post('/Auth',{email:'wrong',password:'fixture'});await turn();assert(!wire[2].config.headers.get('Authorization'));wire[2].task.reject(denied(wire[2].config));await assert.rejects(publicLogin);assert.equal(loggedOut,0);
 const current=api.apiClient.get('/Notification');await turn();wire[3].task.reject(denied(wire[3].config));await assert.rejects(current);assert.equal(loggedOut,1);
 const one=api.apiClient.get('/one'),two=api.apiClient.get('/two');await turn();await assert.rejects(api.apiClient.get('/three'),error=>error instanceof MobileCapacityError);assert.equal(wire.length,6);
 api.setAuthToken('token-d');await assert.rejects(api.apiClient.get('/still-busy'),error=>error instanceof MobileCapacityError);
 wire[4].task.resolve(response(wire[4].config));wire[5].task.resolve(response(wire[5].config));await Promise.all([assert.rejects(one,axios.isCancel),assert.rejects(two,axios.isCancel)]);
 const callerHeaders=new axios.AxiosHeaders({Authorization:'caller-value'}),read=api.apiClient.get('/safe',{headers:callerHeaders,timeout:999999});await turn();assert.equal(callerHeaders.get('Authorization'),'caller-value');assert.equal(wire[6].config.headers.get('Authorization'),'Bearer token-d');assert.equal(wire[6].config.timeout,20000);
 wire[6].task.resolve(response(wire[6].config,JSON.parse('{"__proto__":{"Secret":"value"},"Student":{"FirstName":"Name"},"Status":false}')));const normalized=await read;assert.equal(normalized.data.student.firstName,'Name');assert.equal(normalized.data.status,false);assert.equal(Object.getPrototypeOf(normalized.data),Object.prototype);assert.equal({}.secret,undefined);
 await assert.rejects(api.apiClient.get('https://outside.invalid/data'));assert.equal(wire.length,7);
 const small=createMobileApi({baseURL:'https://school.invalid/api',maxJsonNodes:100,adapter:async config=>response(config,Array(101).fill('x'))});await assert.rejects(small.apiClient.get('/oversize'));
 const abort=new AbortController();abort.abort();await assert.rejects(api.apiClient.get('/aborted',{signal:abort.signal}),axios.isCancel);assert.equal(wire.length,7);
 assert(sessionIsBound(session('one')));assert(sessionIsBound(session('parent','PARENT')));assert(!sessionIsBound({...session('one'),user:session('other').user}));assert(!sessionIsBound({...session('one'),user:{...session('one').user,raw:{schoolId:'other'}}}));assert(!sessionIsBound({...session('one'),token:'bad-token'}));
 // Shared attendance transport preserves true totals/false marks and validates the bounded contract.
 const sampleSummary={studentId:'student-one',studentLabel:'Core Name',present:91,absent:12,recent:[{date:'2026-10-26',status:false},{date:'2026-10-25',status:true}]};
 let summaryWire,summaryBody=[sampleSummary],summaryHeader={currentPage:1,itemsPerPage:1,totalItems:1,totalPages:1};
 const summaryApi=createMobileApi({baseURL:'https://school.invalid/api',adapter:async config=>{summaryWire=config;return {...response(config,summaryBody),headers:{Pagination:JSON.stringify(summaryHeader)}}}});
 const {readMobileAttendanceSummary,formatMobileAttendanceDay}=exportsCore;
 const summaryPage=await readMobileAttendanceSummary(summaryApi,'mine');assert.equal(summaryWire.url,'/Attendance/mine/summary');assert.deepEqual(summaryWire.params,{pageNumber:1,pageSize:1,recentDays:30});assert.equal(summaryPage.items[0].present,91);assert.equal(summaryPage.items[0].recent[0].status,false);
 summaryHeader={CurrentPage:2,ItemsPerPage:10,TotalItems:11,TotalPages:2};await readMobileAttendanceSummary(summaryApi,'children',2);assert.equal(summaryWire.params.pageSize,10);
 summaryBody=[{...sampleSummary,recent:[{date:'2026-02-30',status:false}]}];await assert.rejects(readMobileAttendanceSummary(summaryApi,'children',2));
 summaryBody=[{...sampleSummary,recent:Array(31).fill(sampleSummary.recent[0])}];await assert.rejects(readMobileAttendanceSummary(summaryApi,'children',2));
 summaryBody=[sampleSummary];summaryHeader={currentPage:1,totalItems:11,totalPages:1};await assert.rejects(readMobileAttendanceSummary(summaryApi,'children'));
 assert.equal(formatMobileAttendanceDay('bad','en-US'),'bad');assert(formatMobileAttendanceDay('2026-10-26','fa-AF').includes('۲۰۲۶'),'Gregorian fallback is independent of interface language');
 const {afghanistanCalendar}=require(projects+'/digitalmaktab-mobile-country-afghanistan/src/calendar/solarHijriAdapter.ts');
 let civilOptions;const formatted=formatMobileAttendanceDay('2026-10-26','en-US',(date,locale,options)=>{civilOptions=options;assert.equal(date.toISOString(),'2026-10-26T00:00:00.000Z');return afghanistanCalendar.formatDate(date,locale,options)});assert(formatted.includes('1405'));assert.equal(civilOptions.timeZone,'UTC');
 // The complete weekly contract is shared by both roles, including periods nine/ten.
 const {readMobileWeeklyTimetable,mobileTimetablePeriods,useMobileWeeklyTimetable}=exportsCore;
 let weeklyBody=week(),weeklyConfig,weeklyPath;const weeklyApi={apiClient:{get:async(url,config)=>{weeklyPath=url;weeklyConfig=config;return{data:weeklyBody}}}};
 const weeklySignal=new AbortController();const fullWeek=await readMobileWeeklyTimetable(weeklyApi,'mine','fa-AF',weeklySignal.signal);
 assert.equal(weeklyPath,'/Schedule/mine');assert.equal(weeklyConfig.headers['Accept-Language'],'fa-AF');assert.equal(weeklyConfig.signal,weeklySignal.signal);assert.equal(weeklyConfig.params,undefined);assert.equal(fullWeek.reduce((sum,day)=>sum+mobileTimetablePeriods(day).length,0),70);assert(fullWeek[0].hour10.includes('\nConcurrent class'));
 await readMobileWeeklyTimetable(weeklyApi,'children','ps-AF');assert.equal(weeklyPath,'/Schedule/children');
 weeklyBody=week().map(({hour9,hour10,...rest})=>rest);const legacyWeek=await readMobileWeeklyTimetable(weeklyApi,'mine','en-US');assert.equal(legacyWeek[0].hour10,'');assert.equal(mobileTimetablePeriods(legacyWeek[0]).length,8);
 for(const invalid of [week().slice(0,6),[...week(),week()[0]],week().map(day=>({...day,day:'duplicate'})),week().map(day=>({...day,hour10:{hidden:'object'}}))]){weeklyBody=invalid;await assert.rejects(readMobileWeeklyTimetable(weeklyApi,'mine','en-US'));}
 // Course results follow the server's grading rule: Afghan sum of mid-term and final, Austrian named last mark.
 const {summarizeMobileCourseGrades,readMobileGradingScheme,createMobileIntentBook,createMobileIntentId,setMobileEventRsvp,readMobileUpcomingEvents}=exportsCore;
 const afScheme={key:'AF',combination:'SUM',components:[{examType:'MID_TERM',labelKey:'mid',minimum:0,maximum:40},{examType:'FINAL',labelKey:'final',minimum:0,maximum:60}],marks:[],lowerIsBetter:false,passPercent:50,bands:[{from:90,to:100,labelKey:'aplus'},{from:50,to:60,labelKey:'d'},{from:0,to:50,labelKey:'fail'}]};
 let course=summarizeMobileCourseGrades(afScheme,[{examType:'MID_TERM',score:30}]);assert.deepEqual([course.result,course.maximum,course.complete,course.passed,course.labelKey],[30,100,false,null,''],'a half-marked course is not judged');
 course=summarizeMobileCourseGrades(afScheme,[{examType:'FINAL',score:25},{examType:'mid_term',score:25}]);assert.deepEqual([course.result,course.passed,course.labelKey],[50,true,'d']);assert.deepEqual(course.parts.map(part=>part.score),[25,25]);
 course=summarizeMobileCourseGrades(afScheme,[{examType:'MID_TERM',score:20},{examType:'FINAL',score:29}]);assert.deepEqual([course.result,course.passed,course.labelKey],[49,false,'fail']);
 course=summarizeMobileCourseGrades({...afScheme,passPercent:40},[{examType:'MID_TERM',score:20},{examType:'FINAL',score:20}]);assert.equal(course.passed,true,'the school may set its own pass share');
 course=summarizeMobileCourseGrades(afScheme,[{examType:'MID_TERM',score:null},{examType:'FINAL',score:55}]);assert.deepEqual([course.result,course.complete,course.passed],[55,false,null]);assert.deepEqual(course.parts[0],{labelKey:'mid',maximum:40,score:null,recorded:true});
 assert.deepEqual([summarizeMobileCourseGrades(afScheme,[]).result,summarizeMobileCourseGrades(afScheme,[]).passed],[null,null]);
 const atScheme={key:'AT',combination:'LAST',components:[{examType:0,labelKey:'half',minimum:1,maximum:5},{examType:1,labelKey:'year',minimum:1,maximum:5}],marks:[{value:1,labelKey:'sehrGut',passing:true},{value:5,labelKey:'nichtGenuegend',passing:false}],lowerIsBetter:true,passPercent:null,bands:[]};
 course=summarizeMobileCourseGrades(atScheme,[{examType:0,score:5},{examType:1,score:1}]);assert.deepEqual([course.result,course.maximum,course.passed,course.labelKey],[1,5,true,'sehrGut']);
 course=summarizeMobileCourseGrades(atScheme,[{examType:0,score:5}]);assert.deepEqual([course.result,course.passed],[5,null],'the year mark decides, not the half-year one');assert.equal(summarizeMobileCourseGrades(atScheme,[{examType:1,score:5}]).passed,false);
 let schemeBody=afScheme;const schemeApi={apiClient:{get:async()=>({data:schemeBody})}};assert.equal((await readMobileGradingScheme(schemeApi)).key,'AF');for(const bad of [null,{components:'x'},{...afScheme,combination:'AVG'},{...afScheme,components:[{labelKey:'x',minimum:0,maximum:'40'}]}]){schemeBody=bad;await assert.rejects(readMobileGradingScheme(schemeApi));}
 // Mutation intents: the same action keeps its ID until it is settled; events use Core's real route.
 {const {resolveMobileDevApi,mobileUrlHost}=exportsCore,cfg={apiUrl:'http://192.168.8.1:5000/api',signalRUrl:'http://192.168.8.1:5000',assetUrl:'http://192.168.8.1:5000/'};
  assert.equal(mobileUrlHost('http://10.0.2.2:8081/index.bundle?platform=android'),'10.0.2.2');assert.equal(mobileUrlHost('file:///data/app/index.android.bundle'),null);assert.equal(mobileUrlHost(null),null);
  assert.deepEqual(resolveMobileDevApi(cfg,'http://10.0.2.2:8081/index.bundle?platform=android','android'),{apiUrl:'http://10.0.2.2:5000/api',signalRUrl:'http://10.0.2.2:5000',assetUrl:'http://10.0.2.2:5000/'});
  assert.equal(resolveMobileDevApi(cfg,'http://192.168.8.107:8082/index.bundle','android').apiUrl,'http://192.168.8.107:5000/api');
  assert.equal(resolveMobileDevApi(cfg,'http://localhost:8081/index.bundle','ios').apiUrl,'http://localhost:5000/api');
  assert.equal(resolveMobileDevApi(cfg,'http://localhost:8081/index.bundle','android'),cfg);assert.equal(resolveMobileDevApi(cfg,'file:///x/index.bundle','android'),cfg);assert.equal(resolveMobileDevApi(cfg,undefined,'ios'),cfg);
  const bare={apiUrl:'http://h:1/api',signalRUrl:'http://h:1'};assert.equal('assetUrl' in resolveMobileDevApi(bare,'http://10.0.2.2:8081/x','android'),false);}
 const book=createMobileIntentBook(),firstIntent=book.idFor('rsvp');assert.match(firstIntent,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);assert.equal(book.idFor('rsvp'),firstIntent);assert.notEqual(book.idFor('other'),firstIntent);book.settle('rsvp');assert.notEqual(book.idFor('rsvp'),firstIntent);assert.notEqual(createMobileIntentId(),createMobileIntentId());
 const eventCalls=[],eventApi={apiClient:{get:async(url,config)=>{eventCalls.push([url,config]);return{data:[{id:'e'}]}},post:async(url,data,config)=>{eventCalls.push([url,data,config]);return{data:{}}}}};
 assert.deepEqual(await readMobileUpcomingEvents(eventApi,500),[{id:'e'}]);assert.equal(eventCalls[0][0],'/event/upcoming');assert.equal(eventCalls[0][1].params.take,100);
 const eventId='11111111-2222-4333-8444-555555555555';await setMobileEventRsvp(eventApi,eventId,'GOING',firstIntent);assert.equal(eventCalls[1][0],'/event/'+eventId+'/rsvp');assert.deepEqual(eventCalls[1][1],{status:'GOING'});assert.equal(eventCalls[1][2].headers['Idempotency-Key'],firstIntent);
 await assert.rejects(setMobileEventRsvp(eventApi,eventId,'YES',firstIntent));await assert.rejects(setMobileEventRsvp(eventApi,'../x','GOING',firstIntent));await assert.rejects(setMobileEventRsvp(eventApi,eventId,'GOING','no-intent'));assert.equal(eventCalls.length,2);
 // Week model: the server's Saturday-first rows become weekdays, lessons, free periods and stable subject colours.
 const {buildMobileTimetableWeek,parseMobileTimetableLesson,buildMobileCalendarMonth,mobileAdjacentMonthAnchor,mobileCalendarParts,shiftMobileCivilDate,planMobileCalendarDay,nextMobileSchoolDay,readMobileSchoolToday,readMobileSchoolCalendar,mobileCategoricalTone,mobileCategoricalTones,mobileDeviceCivilDate}=exportsCore;
 assert.deepEqual(parseMobileTimetableLesson('Maths (Seventh · Morning)'),{text:'Maths (Seventh · Morning)',subject:'Maths',detail:'Seventh · Morning',subjectKey:'maths'});
 assert.equal(parseMobileTimetableLesson('Language (Pashto) (7 (A) · Main)').subject,'Language (Pashto)');assert.equal(parseMobileTimetableLesson('Language (Pashto) (7 (A) · Main)').detail,'7 (A) · Main');
 assert.equal(parseMobileTimetableLesson('(only brackets)').subject,'(only brackets)');assert.equal(parseMobileTimetableLesson('Broken) text').detail,'');
 const blank=Object.fromEntries(Array.from({length:10},(_,i)=>['hour'+(i+1),'']));
 const modelRows=['Sat','Sun','Mon','Tue','Wed','Thu','Fri'].map((day,index)=>({day,...blank,...(index===0?{hour1:'Maths (7A)',hour2:'Dari (7A)',hour4:'Maths (7A)\nSport (7A)'}:index===1?{hour3:'Dari (7A)'}:{})}));
 const model=buildMobileTimetableWeek(modelRows,{weekendDays:[5,9,'x']});
 assert.deepEqual(model.days.map(day=>day.weekday),[6,0,1,2,3,4,5]);assert.equal(model.days[6].isWeekend,true);assert.equal(model.days[0].isWeekend,false);
 assert.deepEqual(model.days[0].slots.map(slot=>[slot.period,slot.lessons.length]),[[1,1],[2,1],[3,0],[4,2]]);assert.equal(model.days[0].freeCount,1);assert.equal(model.days[0].lessonCount,4);assert.equal(model.days[1].firstPeriod,3);
 assert.equal(model.lessonCount,5);assert.equal(model.teachingDays,2);assert.equal(model.lastPeriod,4);assert.equal(model.commonDetail,'7A');
 assert.deepEqual(model.subjects.map(subject=>[subject.key,subject.lessons,subject.days,subject.tone]),[['dari',2,2,0],['maths',2,1,1],['sport',1,1,2]]);
 assert.equal(buildMobileTimetableWeek(modelRows.map(row=>({...row,hour2:row.hour2?'Dari (7B)':''}))).commonDetail,'');assert.equal(buildMobileTimetableWeek(week().map(row=>({...row,...blank}))).lessonCount,0);
 assert.equal(mobileCategoricalTone(0),mobileCategoricalTones[0]);assert.equal(mobileCategoricalTone(mobileCategoricalTones.length+1),mobileCategoricalTones[1]);assert.equal(mobileCategoricalTone(-1,['#111111','bad','#222222']),'#222222');assert.equal(mobileCategoricalTone(3,['red']),mobileCategoricalTones[3]);
 // Month grids follow the country's calendar. Aqrab 1405 = 23 Oct – 21 Nov 2026, weeks start on Saturday.
 const {afghanistanCalendar:hijri}=require(projects+'/digitalmaktab-mobile-country-afghanistan/src/calendar/solarHijriAdapter.ts');
 assert.deepEqual(hijri.weekendDays,[5]);assert.equal(hijri.firstDayOfWeek,6);
 const aqrab=buildMobileCalendarMonth('2026-11-21',{toParts:hijri.toCalendarParts,firstDayOfWeek:hijri.firstDayOfWeek});
 assert.deepEqual([aqrab.year,aqrab.month,aqrab.first,aqrab.last],[1405,7,'2026-10-23','2026-11-21']);assert.equal(aqrab.gridFrom,'2026-10-17');assert.equal(aqrab.gridTo,'2026-11-27');assert.equal(aqrab.weeks.length,6);
 assert(aqrab.weeks.every(row=>row.length===7&&row[0].weekday===6&&row[6].weekday===5));assert.deepEqual(aqrab.weeks[0][6],{date:'2026-10-23',weekday:5,year:1405,month:7,day:1,inMonth:true});assert.equal(aqrab.weeks[0][5].inMonth,false);assert.equal(aqrab.weeks[5][0].day,30);
 const qaus=buildMobileCalendarMonth(mobileAdjacentMonthAnchor(aqrab,1),{toParts:hijri.toCalendarParts,firstDayOfWeek:6});assert.deepEqual([qaus.month,qaus.first,qaus.last],[8,'2026-11-22','2026-12-21']);
 assert.equal(buildMobileCalendarMonth(mobileAdjacentMonthAnchor(aqrab,-1),{toParts:hijri.toCalendarParts}).month,6);
 // Year boundary and leap handling come from the adapter: Hoot 1403 has 30 days, Hamal 1404 starts on 21 March 2025.
 const hoot=buildMobileCalendarMonth('2025-03-10',{toParts:hijri.toCalendarParts,firstDayOfWeek:6});assert.deepEqual([hoot.year,hoot.month,hoot.last],[1403,11,'2025-03-20']);assert.equal(mobileCalendarParts('2025-03-21',hijri.toCalendarParts).year,1404);
 const gregorian=buildMobileCalendarMonth('2028-02-10',{firstDayOfWeek:1});assert.deepEqual([gregorian.year,gregorian.month,gregorian.first,gregorian.last,gregorian.gridFrom,gregorian.gridTo],[2028,1,'2028-02-01','2028-02-29','2028-01-31','2028-03-05']);
 assert.deepEqual(mobileCalendarParts('2026-11-21',()=>({year:NaN,month:1,day:1})),{year:2026,month:10,day:21},'an adapter that cannot answer falls back to Gregorian');assert.deepEqual(mobileCalendarParts('2026-11-21',()=>{throw new Error('no ICU')}),{year:2026,month:10,day:21});
 assert.throws(()=>buildMobileCalendarMonth('2026-02-30'));assert.equal(shiftMobileCivilDate('2026-03-01',-1),'2026-02-28');assert.equal(shiftMobileCivilDate('2026-12-31',1),'2027-01-01');assert.equal(mobileDeviceCivilDate(new Date(2026,0,5,23,59)),'2026-01-05');
 // A date's plan: weekly lessons unless the day is a holiday, outside the school year or has none.
 const bounds={yearFrom:'2026-03-21',yearTo:'2027-03-20'},dated=[{kind:'HOLIDAY',id:'h',title:'Eid',description:'',kindLabelKey:'',fromDate:'2026-11-14',toDate:'2026-11-15'},{kind:'EXAM',id:'e',title:'Test',description:'',kindLabelKey:'',fromDate:'2026-11-21',toDate:'2026-11-21'}];
 const saturday=planMobileCalendarDay('2026-11-21',model,bounds,dated);assert.equal(saturday.reason,'lessons');assert.equal(saturday.lessonCount,4);assert.deepEqual(saturday.entries.map(entry=>entry.id),['e']);assert.equal(saturday.holiday,null);
 const holiday=planMobileCalendarDay('2026-11-14',model,bounds,dated);assert.equal(holiday.reason,'holiday');assert.equal(holiday.lessons,null);assert.equal(holiday.lessonCount,0);assert.equal(holiday.holiday.id,'h');
 assert.equal(planMobileCalendarDay('2026-11-20',model,bounds,dated).reason,'weekend');assert.equal(planMobileCalendarDay('2026-11-23',model,bounds,dated).reason,'none');assert.equal(planMobileCalendarDay('2027-03-27',model,bounds,dated).reason,'outsideYear');assert.equal(planMobileCalendarDay('2027-03-27',model,null,dated).reason,'lessons');assert.equal(planMobileCalendarDay('2026-11-21',null,bounds,[]).reason,'none');
 assert.equal(nextMobileSchoolDay('2026-11-13',model,bounds,dated),'2026-11-21','holiday days are skipped');assert.equal(nextMobileSchoolDay('2026-11-21',model,bounds,dated),'2026-11-22');assert.equal(nextMobileSchoolDay('2027-03-20',model,bounds,dated),null);
 // School day and calendar readers validate what the server sends.
 let schoolBody={academicSummary:{displayName:' 1405 ',fromDate:'2026-03-21',toDate:'2027-03-20',today:'2026-11-21'}},schoolPath,schoolConfig;const schoolApi={apiClient:{get:async(url,config)=>{schoolPath=url;schoolConfig=config;return{data:schoolBody}}}};
 assert.deepEqual(await readMobileSchoolToday(schoolApi),{date:'2026-11-21',weekday:6,yearName:'1405',yearFrom:'2026-03-21',yearTo:'2027-03-20'});assert.equal(schoolPath,'/Main/activeCalendarYear');
 for(const body of [null,{},{academicSummary:null},{academicSummary:{today:'21/11/2026',fromDate:'2027-01-01',toDate:'2026-01-01',displayName:7}}]){schoolBody=body;assert.deepEqual(await readMobileSchoolToday(schoolApi),{date:null,weekday:null,yearName:'',yearFrom:null,yearTo:null});}
 const entry={kind:'HOLIDAY',id:'one',title:'Eid',description:null,fromDate:'2026-11-14',toDate:'2026-11-15'};schoolBody={entries:[entry,{...entry,id:'two',kind:'afghanistan.exam-period',kindLabelKey:'afghanExamPeriods.title',description:'Mid-term'}]};
 const readEntries=await readMobileSchoolCalendar(schoolApi,'2026-10-17','2026-11-27','fa-AF');assert.equal(schoolPath,'/school-calendar');assert.deepEqual(schoolConfig.params,{from:'2026-10-17',to:'2026-11-27'});assert.equal(schoolConfig.headers['Accept-Language'],'fa-AF');
 assert.deepEqual(readEntries[0],{kind:'HOLIDAY',id:'one',title:'Eid',description:'',kindLabelKey:'',fromDate:'2026-11-14',toDate:'2026-11-15'});assert.equal(readEntries[1].kindLabelKey,'afghanExamPeriods.title');
 for(const bad of [{entries:'x'},{},{entries:[{...entry,toDate:'2026-11-13'}]},{entries:[{...entry,fromDate:'2026-13-01'}]},{entries:[{...entry,title:{a:1}}]},{entries:[{...entry,kind:''}]}]){schoolBody=bad;await assert.rejects(readMobileSchoolCalendar(schoolApi,'2026-10-17','2026-11-27','en-US'));}
 schoolBody={entries:[]};await assert.rejects(readMobileSchoolCalendar(schoolApi,'2026-11-27','2026-10-17','en-US'));await assert.rejects(readMobileSchoolCalendar(schoolApi,'2026-01-01','2027-01-02','en-US'));await assert.rejects(readMobileSchoolCalendar(schoolApi,'2026-01-01','2026-01-02','en\r\nX: y'));assert.deepEqual(await readMobileSchoolCalendar(schoolApi,'2026-01-01','2027-01-01','en-US'),[]);
 weeklyBody=week();await assert.rejects(readMobileWeeklyTimetable(weeklyApi,'school','en-US'));await assert.rejects(readMobileWeeklyTimetable(weeklyApi,'mine','en-US\r\nInjected: header'));weeklySignal.abort();await assert.rejects(readMobileWeeklyTimetable(weeklyApi,'mine','en-US',weeklySignal.signal));
 // Hydration is single-flight and cannot replace a newer successful login.
 let disk=session('old'),reads=0,clear=0;const initial=deferred();const runtime=createMobileApi({baseURL:'https://school.invalid/api'});
 const store=createMobileAuthStore({api:runtime,login:async id=>session(id),storage:{read:()=>{reads++;return initial.promise},store:async value=>{disk=value},clear:async()=>{clear++;disk=null}},errorKey:()=> 'common.error'});
 const hydration=store.getState().hydrate();assert.equal(hydration,store.getState().hydrate());await turn();assert.equal(reads,1);const login=store.getState().login('new','fixture');assert(store.getState().loginPending);initial.resolve(session('old'));await hydration;await login;assert.equal(store.getState().user.id,'new');assert.equal(disk.user.id,'new');await store.getState().hydrate();assert.equal(reads,1);
 // Physical writes settle in order; stale attempts never publish or clear a newer result.
 const writeGate=deferred(),journal=[];let saved;const coordinated=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>null,store:async value=>{journal.push(value.user.id);if(value.user.id==='first')await writeGate.promise;saved=value},clear:async()=>{saved=null}},errorKey:()=> 'common.error'});
 const first=coordinated.getState().login('first','fixture');const firstFailure=assert.rejects(first,axios.isCancel);await turn();assert.deepEqual(journal,['first']);const second=coordinated.getState().login('second','fixture');await turn();assert.deepEqual(journal,['first']);writeGate.resolve();await firstFailure;await second;assert.equal(saved.user.id,'second');assert.equal(coordinated.getState().user.id,'second');
 const clearGate=deferred();let cleared=false;const logoutStore=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>session('one'),store:async()=>{},clear:async()=>{await clearGate.promise;cleared=true}},errorKey:()=> 'common.error'});
 await logoutStore.getState().hydrate();const logout=logoutStore.getState().logout();assert.equal(logoutStore.getState().status,'anonymous');assert.equal(logoutStore.getState().user,null);assert(!cleared);clearGate.resolve();await logout;
 const broken=createMobileAuthStore({api:createMobileApi({baseURL:'https://school.invalid/api'}),login:async id=>session(id),storage:{read:async()=>({...session('one'),user:session('other').user}),store:async()=>{},clear:async()=>{clear++}},errorKey:()=> 'common.error'});const before=clear;await broken.getState().hydrate();assert.equal(broken.getState().status,'anonymous');assert.equal(clear,before+1);
 // Actual app wrappers both consume the one Core implementation and retain existing secure keys.
 const originalAdapter=axios.defaults.adapter;let appTransport=async config=>{const data=JSON.parse(config.data??'{}'),parent=data.email?.startsWith('parent'),bound=session(parent?'parent-one':'student-one',parent?'PARENT':'STUDENT');return response(config,{token:bound.token,role:parent?6:4,[parent?'parent':'student']:{...bound.user.raw,firstName:'Person',lastName:'One',email:data.email}})};axios.defaults.adapter=config=>appTransport(config);
 for(const repo of ['parent','student']){const folder=projects+'/digitalmaktab-mobile-'+repo;const appStore=require(folder+'/src/presentation/hooks/useAuth.ts').useAuthStore;await appStore.getState().hydrate();await appStore.getState().login(repo+'@fixture.invalid','fixture');assert.equal(appStore.getState().status,'authenticated');assert.equal(appStore.getState().user.role,repo.toUpperCase());assert.equal(secure.get(repo).size,2);await appStore.getState().logout();assert.equal(secure.get(repo).size,0);}
 axios.defaults.adapter=originalAdapter;
 // Provider cleanup clears old data and rejects in-flight cache results, even when keys repeat.
 const {JSDOM}=require(projects+'/digitalmaktab-spa/node_modules/jsdom'),dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost'});for(const key of ['window','document','navigator','HTMLElement'])global[key]=dom.window[key];global.IS_REACT_ACT_ENVIRONMENT=true;
 const {createRoot}=require(app+'/react-dom/client'),{useQuery,useQueryClient}=require(app+'/@tanstack/react-query');const root=createRoot(document.getElementById('root'));const queryApi=createMobileApi({baseURL:'https://school.invalid/api'}),slow=deferred();let client,fetches=0;
 function Probe(){client=useQueryClient();const result=useQuery({queryKey:['private','same-key'],queryFn:()=>++fetches===1?slow.promise:Promise.resolve('new-data')});return React.createElement('span',null,result.data??'loading');}
 await act(async()=>root.render(React.createElement(MobileSessionQueryProvider,{api:queryApi},React.createElement(Probe))));const previousClient=client;
 await act(async()=>{queryApi.setAuthToken('new-session');await turn();});for(let i=0;i<100&&document.querySelector('span').textContent!=='new-data';i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});assert.notEqual(client,previousClient);assert.equal(previousClient.getQueryCache().getAll().length,0);assert.equal(document.querySelector('span').textContent,'new-data');
 await act(async()=>{slow.resolve('old-data');await turn();});assert.equal(document.querySelector('span').textContent,'new-data');assert.equal(fetches,2);const lastClient=client;const replacement=createMobileApi({baseURL:'https://other.invalid/api'});await act(async()=>root.render(React.createElement(MobileSessionQueryProvider,{api:replacement},React.createElement(Probe))));assert.notEqual(client,lastClient);assert.equal(lastClient.getQueryCache().getAll().length,0);await act(async()=>root.unmount());assert.equal(client.getQueryCache().getAll().length,0);// Actual data hooks consume React Query cancellation, not just cache fencing.
 for(const repo of ['student','parent']){
  const requests=[];appTransport=config=>{const task=deferred();requests.push({config,task});return task.promise;};
  const folder=projects+'/digitalmaktab-mobile-'+repo,actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const domain=require(folder+'/src/presentation/hooks/'+(repo==='student'?'useStudentData.ts':'useParentData.ts'));const shared=require(folder+'/src/presentation/hooks/useSharedData.ts');
  const reads=[...Object.values(domain),shared.useNotifications,shared.useUnreadNotificationCount,shared.useUpcomingEvents];
  function ActualReads(){for(const read of reads)read===domain.useSchoolCalendar?read('2026-11-01','2026-11-30'):read();return null;}
  const actualRoot=createRoot(document.getElementById('root'));await act(async()=>actualRoot.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(ActualReads))));
  assert.equal(requests.length,reads.length);assert(requests.every(r=>!r.config.signal.aborted));
  await act(async()=>actualRoot.unmount());assert(requests.every(r=>r.config.signal.aborted));
  await act(async()=>{for(const request of requests)request.task.resolve(response(request.config,[]));await turn();});
 }
 // Locale/country query keys cancel obsolete reads without reusing translated rows.
 let timetableLocale='en-US',timetableCountry='AF',timetableResult;const timetableWire=[];
 const timetableApi=createMobileApi({baseURL:'https://school.invalid/api',adapter:config=>{const task=deferred();timetableWire.push({config,task});return task.promise;}});
 timetableApi.setAuthToken('weekly-session');
 function TimetableProbe(){timetableResult=useMobileWeeklyTimetable(timetableApi,'mine',timetableLocale,timetableCountry);return React.createElement('span',null,timetableResult.isError?'weekly-error':timetableResult.data?.[0]?.hour1??'weekly-loading');}
 const timetableRoot=createRoot(document.getElementById('root'));const drawTimetable=()=>timetableRoot.render(React.createElement(MobileSessionQueryProvider,{api:timetableApi},React.createElement(TimetableProbe)));
 await act(async()=>{drawTimetable();await turn();});assert.equal(timetableWire.length,1);assert.equal(timetableWire[0].config.headers.get('Accept-Language'),'en-US');
 await act(async()=>{timetableLocale='fa-AF';drawTimetable();await turn();});assert.equal(timetableWire.length,2);assert(timetableWire[0].config.signal.aborted);assert.equal(document.querySelector('span').textContent,'weekly-loading');
 await act(async()=>{timetableWire[1].task.resolve(response(timetableWire[1].config,week('Dari')));await new Promise(resolve=>setTimeout(resolve,10));});assert.equal(document.querySelector('span').textContent,'Dari 0/1');
 await act(async()=>{timetableWire[0].task.resolve(response(timetableWire[0].config,week('Late English')));await turn();});assert.equal(document.querySelector('span').textContent,'Dari 0/1');
 await act(async()=>{timetableCountry='AT';drawTimetable();await turn();});assert.equal(timetableWire.length,3);assert.equal(document.querySelector('span').textContent,'weekly-loading');
 await act(async()=>{timetableWire[2].task.reject(new axios.AxiosError('Busy','ERR_BAD_RESPONSE',timetableWire[2].config,{}, {...response(timetableWire[2].config),status:503}));await new Promise(resolve=>setTimeout(resolve,30));});await waitFor(()=>timetableResult.isError);assert.equal(timetableWire.length,3,'weekly failures never retry automatically');
 await act(async()=>{void timetableResult.refetch();await turn();});assert.equal(timetableWire.length,4);
 await act(async()=>{timetableCountry='AF';drawTimetable();await turn();});assert(timetableWire[3].config.signal.aborted);assert.equal(document.querySelector('span').textContent,'Dari 0/1');assert.equal(timetableWire.length,4,'only the matching country may reuse its cached week');
 await act(async()=>{timetableWire[3].task.resolve(response(timetableWire[3].config,week('Late Austria')));await turn();});assert.equal(document.querySelector('span').textContent,'Dari 0/1');
 await act(async()=>{timetableCountry='DE';drawTimetable();await turn();});assert.equal(timetableWire.length,5);await act(async()=>timetableRoot.unmount());assert(timetableWire[4].config.signal.aborted);await act(async()=>{timetableWire[4].task.resolve(response(timetableWire[4].config,week('Unmounted')));await turn();});
 // Mount both actual attendance screens with native presentation adapters. Keep real read hooks/Core/country dates.
 const renderSlot=slot=>typeof slot==='function'?React.createElement(slot):slot;
 const Box=({children,style,...props})=>React.createElement('div',{'data-native':'view',style:Object.assign({},...[style].flat(Infinity).filter(Boolean))},children);
 const Text=({children,color})=>React.createElement('span',{style:{color}},children);
 const Flat=props=>React.createElement('div',null,renderSlot(props.ListHeaderComponent),props.data.length?props.data.map((item,index)=>React.createElement(React.Fragment,{key:index},props.renderItem({item,index}))):renderSlot(props.ListEmptyComponent),renderSlot(props.ListFooterComponent));
 const Sections=props=>React.createElement('div',null,renderSlot(props.ListHeaderComponent),props.sections.length?props.sections.map((section,index)=>React.createElement('section',{key:index},props.renderSectionHeader({section}),section.data.map((item,index)=>React.createElement(React.Fragment,{key:index},props.renderItem({item,index,section}))))):renderSlot(props.ListEmptyComponent),renderSlot(props.ListFooterComponent));
 let language='en-US';const localeBundles=Object.fromEntries(['en-US','fa-AF','ps-AF'].map(locale=>[locale,JSON.parse(fs.readFileSync(projects+'/digitalmaktab-mobile-country-afghanistan/src/locales/'+locale+'/translation.json'))]));
 const t=(key,values={})=>String(key.split('.').reduce((value,part)=>value?.[part],localeBundles[language])??key).replace(/\{\{(\w+)\}\}/g,(_,name)=>values[name]??'');
 const palette={background:'#121417',warning:'#ffc107',info:'#0dcaf0',secondary:'#c280d2',surface:'#1c1f24',border:'#444444',text:'#f1f3f5',textSecondary:'#dddddd',textMuted:'#adb5bd',primary:'#43b9b2',success:'#198754',danger:'#dc3545',white:'#ffffff'};
 const Press=({children,onPress,style,accessibilityLabel,accessibilityState})=>React.createElement('button',{onClick:onPress,'aria-label':accessibilityLabel,'aria-pressed':accessibilityState?.selected?'true':undefined,style:Object.assign({},...[typeof style==='function'?style({pressed:false}):style].flat(Infinity).filter(Boolean))},children);
 const NativeText=({children,style,...props})=>{const merged=Object.assign({},...[style].flat(Infinity).filter(Boolean));const direction=merged.writingDirection;delete merged.writingDirection;return React.createElement('span',{style:{...merged,direction},'data-native-text':true},children);};
 const screenLoad=Module._load;
 Module._load=function(request,parent,isMain){
  const primitive=parent?.filename.includes('/presentation/components/common/')&&(parent.filename.endsWith('/AppText.tsx')||parent.filename.endsWith('/AppCard.tsx'));
  if(primitive){
   if(request==='react-native')return{View:Box,Text:NativeText,StyleSheet:{create:x=>x},Pressable:Box};
   if(request==='../../../core/theme')return{useColors:()=>palette};
   if(request==='../../../core/rtl')return{useRTL:()=>({textAlign:language==='en-US'?'left':'right',writingDirection:language==='en-US'?'ltr':'rtl',fontStyle:()=>({})})};
  }
  const screen=parent?.filename.endsWith('/AttendanceScreen.tsx')||parent?.filename.endsWith('/ChildrenAttendanceScreen.tsx')||parent?.filename.endsWith('/TimetableScreen.tsx')||parent?.filename.endsWith('/ChildrenTimetableScreen.tsx')||parent?.filename.includes('/presentation/components/timetable/');
  if(parent?.filename.includes('/presentation/components/timetable/')&&request==='../common/AppButton')return{AppButton:({label,onPress})=>React.createElement('button',{onClick:onPress},label)};
  if(screen){
   if(request==='react-native')return{View:Box,StyleSheet:{create:x=>x},ActivityIndicator:()=>React.createElement('i',null,'loading'),FlatList:Flat,SectionList:Sections,ScrollView:Box,RefreshControl:()=>null,Pressable:Press};
   if(request==='react-i18next')return{useTranslation:()=>({t,i18n:{language,exists:key=>t(key)!==key}})};
   if(request==='@expo/vector-icons/MaterialCommunityIcons')return({name})=>React.createElement('i',{'data-icon':name});
   if(request==='../../../core/theme')return{useColors:()=>palette};
   if(request==='../../../core/country')return{useCountry:()=>({code:'AF',calendar:afghanistanCalendar,branding:{categorical:['#101010','#202020']}})};
   if(request==='../../../core/rtl')return{useRTL:()=>({rowDirection:language==='en-US'?'row':'row-reverse',isRTL:language!=='en-US'})};
   if(request==='../../hooks'){const repo=parent.filename.includes('mobile-parent')?'parent':'student';return require(projects+'/digitalmaktab-mobile-'+repo+'/src/presentation/hooks/'+(repo==='parent'?'useParentData.ts':'useStudentData.ts'));}
   if(request==='../../components'){const native=projects+'/digitalmaktab-mobile-'+(parent.filename.includes('mobile-parent')?'parent':'student')+'/src/presentation/components/common/';return{AppScreen:Box,AppCard:require(native+'AppCard.tsx').AppCard,AppText:require(native+'AppText.tsx').AppText,AppEmptyView:({message})=>React.createElement('span',null,message),AppErrorView:()=>React.createElement('span',null,'test-read-error'),AppStat:({value,label})=>React.createElement('span',null,value,' ',label),AppProgress:()=>null,AppButton:({label,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},label)};}
  }
  return screenLoad.apply(this,arguments);
 };
 async function waitFor(predicate){for(let i=0;i<100&&!predicate();i++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});assert(predicate());}
 for(const repo of ['student','parent']){
  const folder=projects+'/digitalmaktab-mobile-'+repo,actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const screen=require(folder+'/src/presentation/screens/'+repo+'/'+(repo==='student'?'AttendanceScreen.tsx':'ChildrenAttendanceScreen.tsx'));
  const Component=screen[repo==='student'?'AttendanceScreen':'ChildrenAttendanceScreen'];const calls=[];
  appTransport=async config=>{calls.push(config);const page=config.params.pageNumber,count=repo==='student'?1:11,size=config.params.pageSize;const rows=Array.from({length:Math.min(size,Math.max(0,count-(page-1)*size))},(_,index)=>({...sampleSummary,studentId:'student-'+((page-1)*size+index),studentLabel:'Core Name '+((page-1)*size+index)}));return{...response(config,rows),headers:{Pagination:JSON.stringify({currentPage:page,totalItems:count,totalPages:Math.ceil(count/size)})}}};
  const mounted=createRoot(document.getElementById('root'));
  for(const locale of ['en-US','fa-AF','ps-AF']){
   language=locale;await act(async()=>mounted.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component,{key:locale}))));
   await waitFor(()=>document.body.textContent.includes(t('mobileAttendance.recordedTotals')));
   const body=document.body.textContent;assert(body.includes(t('mobileAttendance.present')));assert(body.includes(t('mobileAttendance.absent')));assert(body.includes(new Intl.NumberFormat(locale).format(91)));assert(body.includes(new Intl.NumberFormat(locale).format(12)));assert(body.includes(afghanistanCalendar.formatDate(new Date('2026-10-26T00:00:00Z'),locale,{dateStyle:'medium',timeZone:'UTC'})));assert(body.includes(t('mobileAttendance.recent')));assert(document.querySelector('[data-icon="close"]'));assert(document.querySelector('[data-icon="check"]'));assert(!body.includes('test-read-error'));
  }
  if(repo==='parent'){
   const next=[...document.querySelectorAll('button')].find(button=>button.textContent===t('mobileAttendance.next'));assert(!next.disabled);await act(async()=>next.click());await waitFor(()=>document.body.textContent.includes('Core Name 10'));assert(calls.some(config=>config.params.pageNumber===2));assert([...document.querySelectorAll('button')].find(button=>button.textContent===t('mobileAttendance.next')).disabled);
  }
  assert(calls.every(config=>config.url.endsWith('/summary')&&config.params.recentDays===30));
  await act(async()=>mounted.unmount());
 }
 // The parent's native timetable screen renders the shared Core day fragment.
 const nativeDays={'en-US':['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'],'fa-AF':['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'],'ps-AF':['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه']};
 for(const repo of ['parent']){
  const folder=projects+'/digitalmaktab-mobile-'+repo,actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const Component=require(folder+'/src/presentation/screens/'+repo+'/'+(repo==='student'?'TimetableScreen.tsx':'ChildrenTimetableScreen.tsx'))[repo==='student'?'TimetableScreen':'ChildrenTimetableScreen'];
  const calls=[];let weeklyMode='ok';appTransport=async config=>{calls.push(config);if(weeklyMode==='error')throw new axios.AxiosError('Busy','ERR_BAD_RESPONSE',config,{}, {...response(config),status:503});const lang=config.headers.get('Accept-Language');return response(config,week('Native '+lang,nativeDays[lang]).map(row=>weeklyMode==='empty'?Object.fromEntries(Object.keys(row).map(key=>[key,key==='day'?row.day:''])):row))};
  const mounted=createRoot(document.getElementById('root'));
  for(const locale of ['en-US','fa-AF','ps-AF']){
   language=locale;await act(async()=>mounted.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component))));await waitFor(()=>document.body.textContent.includes('Native '+locale+' 0/10'));
   const body=document.body.textContent;assert(body.includes(t('schedule.period.label',{n:new Intl.NumberFormat(locale).format(10)})));assert(body.includes('Concurrent class'));assert.equal(document.querySelectorAll('span[style*="font-size: 20px"]').length,7);assert.equal(document.querySelector('span[style*="font-size: 20px"]').textContent,nativeDays[locale][0]);assert.equal(document.querySelector('span[style*="font-size: 20px"]').style.color,'rgb(241, 243, 245)');assert(document.querySelector('[data-native="view"][style*="background-color: rgb(28, 31, 36)"]'));assert(!body.includes('[object'));assert(!body.includes('Unknown'));
   assert(document.querySelector('[style*="flex-direction: '+(locale==='en-US'?'row':'row-reverse')+'"]'));assert(document.querySelector('span[style*="color: rgb(241, 243, 245)"]'));assert.equal(calls.at(-1).url,'/Schedule/'+(repo==='student'?'mine':'children'));assert.equal(calls.at(-1).headers.get('Cache-Control'),'no-store');assert.equal(calls.at(-1).params,undefined);
  }
  assert.equal(calls.length,3,'locale changes perform exactly one complete read');
  palette.text='#1c1f24';palette.surface='#ffffff';palette.border='#dddddd';await act(async()=>mounted.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component))));assert.equal(document.querySelector('span[style*="font-size: 20px"]').style.color,'rgb(28, 31, 36)');assert(document.querySelector('[data-native="view"][style*="background-color: rgb(255, 255, 255)"]'));assert.equal(calls.length,3,'theme changes do not refetch timetable data');
  palette.text='#f1f3f5';palette.surface='#1c1f24';palette.border='#444444';await act(async()=>mounted.unmount());
  // A fresh private scope renders an actually empty week as the shared empty state.
  actualRuntime.setAuthToken('empty-'+repo);weeklyMode='empty';const emptyRoot=createRoot(document.getElementById('root'));await act(async()=>emptyRoot.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component))));await waitFor(()=>document.body.textContent.includes(t('common.empty')));assert.equal(document.querySelectorAll('span[style*="font-size: 20px"]').length,0);await act(async()=>emptyRoot.unmount());
  actualRuntime.setAuthToken('error-'+repo);weeklyMode='error';const errorRoot=createRoot(document.getElementById('root'));await act(async()=>errorRoot.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component))));await waitFor(()=>document.body.textContent.includes('test-read-error'));const failures=calls.length;await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});assert.equal(calls.length,failures);await act(async()=>errorRoot.unmount());
 }
 // The student's timetable is a calendar in the country's own calendar, with weekly lessons and school entries on the dates.
 {
  const folder=projects+'/digitalmaktab-mobile-student',actualRuntime=require(folder+'/src/core/api/client.ts').mobileApiRuntime;
  const Component=require(folder+'/src/presentation/screens/student/TimetableScreen.tsx').TimetableScreen;
  const calls=[];let weeklyMode='ok',entriesMode='ok';
  appTransport=async config=>{calls.push(config);
   if(config.url==='/Main/activeCalendarYear')return response(config,{academicSummary:{displayName:'Year 1405',fromDate:'2026-03-21',toDate:'2027-03-20',today:'2026-11-21'}});
   if(config.url==='/school-calendar'){if(entriesMode==='error')throw new axios.AxiosError('Busy','ERR_BAD_RESPONSE',config,{}, {...response(config),status:503});return response(config,{entries:[{kind:'HOLIDAY',id:'holiday',title:'Mawlid break',description:'School closed',fromDate:'2026-11-14',toDate:'2026-11-15'},{kind:'afghanistan.exam-period',kindLabelKey:'afghanExamPeriods.title',id:'period',title:'Mid-term window',fromDate:'2026-11-21',toDate:'2026-11-21'},{kind:'school.unknown',id:'other',title:'Science fair',fromDate:'2026-11-21',toDate:'2026-11-21'}]});}
   if(weeklyMode==='error')throw new axios.AxiosError('Busy','ERR_BAD_RESPONSE',config,{}, {...response(config),status:503});const lang=config.headers.get('Accept-Language');
   return response(config,week('Native '+lang,nativeDays[lang]).map(row=>weeklyMode==='empty'?Object.fromEntries(Object.keys(row).map(key=>[key,key==='day'?row.day:''])):row))};
  const draw=root=>act(async()=>root.render(React.createElement(MobileSessionQueryProvider,{api:actualRuntime},React.createElement(Component))));
  const pressed=()=>document.querySelector('button[aria-pressed="true"][aria-label*=","]').getAttribute('aria-label');
  const button=label=>[...document.querySelectorAll('button')].find(item=>item.getAttribute('aria-label')===label||item.textContent===label);
  const mounted=createRoot(document.getElementById('root'));
  for(const locale of ['en-US','fa-AF','ps-AF']){
   language=locale;const digits=new Intl.NumberFormat(locale,{useGrouping:false}),n=value=>digits.format(value);
   await draw(mounted);await waitFor(()=>document.body.textContent.includes('Native '+locale+' 0/10')&&document.body.textContent.includes('Mid-term window'));
   let body=document.body.textContent;
   // Solar Hijri month title, Saturday-first grid and the school's own today (30 Aqrab 1405).
   assert(body.includes(t('calendar.month.aqrab')+' '+n(1405)),'month title uses the country calendar');assert(body.includes('Year 1405'));
   const cells=[...document.querySelectorAll('button[aria-label*="'+t('mobileTimetable.dayLessons',{n:''}).trim()+'"]')];assert.equal(cells.length,42);
   const short=new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'});assert(cells[0].getAttribute('aria-label').startsWith(short.format(new Date('2026-10-17T00:00:00Z'))+' '+n(25)),'grid starts on the Saturday before 1 Aqrab');
   const chosen=cells.filter(cell=>cell.getAttribute('aria-pressed')==='true');assert.equal(chosen.length,1);assert(chosen[0].getAttribute('aria-label').includes(' '+n(30)+','));assert(chosen[0].getAttribute('aria-label').endsWith(t('mobileTimetable.dayLessons',{n:n(11)})));
   assert(body.includes(afghanistanCalendar.formatDate(new Date('2026-11-21T00:00:00Z'),locale,{dateStyle:'medium',timeZone:'UTC'})));assert(body.includes(nativeDays[locale][0]));
   assert(body.includes(t('schedule.period.label',{n:n(10)})));assert(body.includes('Concurrent class'));assert(body.includes(t('mobileTimetable.dayLessons',{n:n(11)})));assert(!body.includes(t('mobileTimetable.freePeriod')));
   // Module-owned and unknown kinds are named; the holiday belongs to another day.
   assert(body.includes(t('afghanExamPeriods.title')));assert(body.includes(t('mobileTimetable.kind.other')));assert(body.includes('Science fair'));assert(!body.includes('Mawlid break'));
   assert(body.includes(t('mobileTimetable.subjectsThisWeek')));assert(body.includes(n(77)),'70 lessons plus seven concurrent ones');assert(body.includes(t('mobileTimetable.perWeek',{n:n(7)})));
   assert(document.querySelector('[style*="flex-direction: '+(locale==='en-US'?'row':'row-reverse')+'"]'));assert(document.querySelector('[data-icon="'+(locale==='en-US'?'chevron-left':'chevron-right')+'"]'));assert(!body.includes('[object'));assert(!body.includes('mobileTimetable.'));
   // A holiday replaces that day's lessons.
   const holidayCell=cells.find(cell=>cell.getAttribute('aria-label').startsWith(short.format(new Date('2026-11-14T00:00:00Z'))+' '+n(23)+','));assert(holidayCell.getAttribute('aria-label').endsWith(t('mobileTimetable.dayLessons',{n:n(0)})));
   await act(async()=>holidayCell.click());body=document.body.textContent;assert(body.includes(t('mobileTimetable.holiday')));assert(body.includes('Mawlid break'));assert(body.includes('School closed'));assert(!body.includes(t('schedule.period.label',{n:n(10)})),'no lesson rows on a holiday');assert(!body.includes('Mid-term window'));
   // "Next school day" skips the second holiday day.
   await act(async()=>button(t('mobileTimetable.nextSchoolDay')).click());assert(pressed().startsWith(short.format(new Date('2026-11-16T00:00:00Z'))+' '+n(25)+','),'15 November is still a holiday');assert(document.body.textContent.includes(t('schedule.period.label',{n:n(10)})));
   const friday=[...document.querySelectorAll('button[aria-pressed]'),...document.querySelectorAll('button[aria-label]')].find(cell=>cell.getAttribute('aria-label')?.startsWith(short.format(new Date('2026-11-20T00:00:00Z'))+' '+n(29)+','));await act(async()=>friday.click());assert(pressed().endsWith(t('mobileTimetable.dayLessons',{n:n(11)})),'a school that teaches on the weekly day off still sees those lessons');assert(!document.body.textContent.includes(t('mobileTimetable.weekend')));
   // Week mode keeps only the selected week; Today returns to the school's day.
   await act(async()=>button(t('mobileTimetable.week')).click());assert.equal(document.querySelectorAll('button[aria-label*="'+t('mobileTimetable.dayLessons',{n:''}).trim()+'"]').length,7);
   await act(async()=>button(t('mobileTimetable.month')).click());await act(async()=>button(t('mobileTimetable.today')).click());assert(pressed().includes(' '+n(30)+','));assert(document.body.textContent.includes('Mid-term window'));
   // Highlighting a subject leaves it visible everywhere and offers a way back.
   const subject=[...document.querySelectorAll('button')].find(item=>item.textContent.includes('Concurrent class')&&item.textContent.includes(t('mobileTimetable.perWeek',{n:n(7)})));await act(async()=>subject.click());assert(button(t('mobileTimetable.clearHighlight')));assert(!document.body.textContent.includes(t('mobileTimetable.subjectHint')));await act(async()=>button(t('mobileTimetable.clearHighlight')).click());assert(document.body.textContent.includes(t('mobileTimetable.subjectHint')));
   // The next month is Qaus, read with its own window.
   const before=calls.filter(config=>config.url==='/school-calendar').length;await act(async()=>button(t('mobileTimetable.next')).click());await waitFor(()=>calls.filter(config=>config.url==='/school-calendar').length===before+1);
   assert(document.body.textContent.includes(t('calendar.month.qaus')+' '+n(1405)));assert.deepEqual(calls.filter(config=>config.url==='/school-calendar').at(-1).params,{from:'2026-11-21',to:'2026-12-25'});
   await act(async()=>button(t('mobileTimetable.today')).click());assert(document.body.textContent.includes(t('calendar.month.aqrab')+' '+n(1405)));
  }
  assert.equal(calls.filter(config=>config.url==='/Schedule/mine').length,3,'locale changes perform exactly one complete timetable read');assert.equal(calls.filter(config=>config.url==='/Main/activeCalendarYear').length,1);
  assert(calls.every(config=>config.headers.get('Cache-Control')==='no-store'));assert(calls.filter(config=>config.url==='/Schedule/mine').every(config=>config.params===undefined));
  await act(async()=>mounted.unmount());
  // An empty week still shows the calendar; failed entries leave the lessons in place; a failed timetable is an error.
  actualRuntime.setAuthToken('empty-student');weeklyMode='empty';const emptyRoot=createRoot(document.getElementById('root'));await draw(emptyRoot);await waitFor(()=>document.body.textContent.includes(t('mobileTimetable.noLessons')));assert(!document.body.textContent.includes(t('mobileTimetable.subjectsThisWeek')));assert(document.body.textContent.includes('Science fair'));await act(async()=>emptyRoot.unmount());
  actualRuntime.setAuthToken('entries-student');weeklyMode='ok';entriesMode='error';const partRoot=createRoot(document.getElementById('root'));await draw(partRoot);await waitFor(()=>document.body.textContent.includes(t('mobileTimetable.entriesFailed')));assert(document.body.textContent.includes('Native '+language+' 0/10'));await act(async()=>partRoot.unmount());
  actualRuntime.setAuthToken('error-student');weeklyMode='error';const errorRoot=createRoot(document.getElementById('root'));await draw(errorRoot);await waitFor(()=>document.body.textContent.includes('test-read-error'));const failures=calls.filter(config=>config.url==='/Schedule/mine').length;await act(async()=>{await new Promise(resolve=>setTimeout(resolve,30));});assert.equal(calls.filter(config=>config.url==='/Schedule/mine').length,failures,'timetable failures never retry automatically');await act(async()=>errorRoot.unmount());
 }
 Module._load=screenLoad;
 dom.window.close();
 console.log('PASS: shared mobile runtime pins credentials, rejects stale responses/401s, bounds work and normalization, coordinates auth/storage races, validates persisted identity pairs, replaces private query caches, drives both actual app adapters, renders bounded native attendance summaries, reads complete locale/country-scoped weekly grids with all ten periods, and lays the student week onto a Solar Hijri calendar with holidays, module entries, week mode and subject highlighting in all three locales.');
})().catch(error=>{console.error(error);process.exitCode=1});
