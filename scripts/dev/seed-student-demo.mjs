#!/usr/bin/env node
// seed-student-demo.mjs — fills the student mobile app's screens with demo content.
//
// What it does: for the "Kabul Timetable Demo School" (seeded in Development by the
// Afghanistan module) it adds attendance, grades, assignments, events, a holiday, an
// exam, quizzes, course materials, messages, announcements and a fee payment for
// class 01 and its first student (student.01.01@afghan-timetable.demo.local).
//
// How it works: ONLY through the running HTTP API, logged in as that school's own
// demo accounts (admin, the class's teachers, the student). It never touches the
// database, another school or platform data, and it never deletes or overwrites:
// before each write it reads what exists and skips records that are already there,
// so it is safe to run again.
//
// Run (Node 22+, no dependencies; the dev API must be running):
//   node scripts/dev/seed-student-demo.mjs
//   API_URL=http://localhost:5000/api node scripts/dev/seed-student-demo.mjs

const API = (process.env.API_URL ?? 'http://localhost:5000/api').replace(/\/$/, '');
const DOMAIN = 'afghan-timetable.demo.local';
const PASSWORD = 'Demo@1234';
const ADMIN = `admin@${DOMAIN}`;
const STUDENT = `student.01.01@${DOMAIN}`;
const KABUL_OFFSET_MINUTES = 270; // Asia/Kabul is UTC+04:30 all year

// ───────────────────────── HTTP helpers ─────────────────────────

const tokens = new Map();
const sessions = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login(email) {
  if (tokens.has(email)) return tokens.get(email);
  let response, text;
  for (let attempt = 1; ; attempt++) {
    response = await fetch(`${API}/Auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: PASSWORD }),
    });
    text = await response.text();
    // The API admits about ten logins a minute per client; this script needs eleven accounts.
    if (response.status !== 429 || attempt >= 4) break;
    console.log('  (login limit reached, waiting 30 s…)');
    await sleep(30000);
  }
  if (!response.ok) throw new Error(`Login failed for ${email}: ${response.status} ${text.slice(0, 300)}`);
  const session = JSON.parse(text);
  tokens.set(email, session.token);
  sessions.set(email, session);
  return session.token;
}

/** One API call. `json` sends JSON, `form` sends multipart; writes carry an Idempotency-Key. */
async function call(who, method, path, { json, form } = {}) {
  const token = await login(who);
  const key = crypto.randomUUID(); // kept across retries of the same request
  for (let attempt = 1; ; attempt++) {
    const headers = { Authorization: `Bearer ${token}`, 'Accept-Language': 'en-US' };
    if (method !== 'GET') headers['Idempotency-Key'] = key;
    let body;
    if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    else if (form) { body = new FormData(); for (const [name, value, file] of form) file ? body.append(name, value, file) : body.append(name, value); }
    const response = await fetch(`${API}${path}`, { method, headers, body });
    const text = await response.text();
    // 429 / 503 are admission refusals (nothing ran); wait and send the same request again.
    if ((response.status === 429 || response.status === 503) && attempt < 6) {
      await sleep(1000 * Number(response.headers.get('retry-after') ?? 2));
      continue;
    }
    let data = text;
    try { data = text ? JSON.parse(text) : null; } catch { /* plain text */ }
    return { ok: response.ok, status: response.status, data, text, pagination: parse(response.headers.get('pagination')) };
  }
}

function parse(value) { try { return value ? JSON.parse(value) : null; } catch { return null; } }

async function must(who, method, path, options) {
  const result = await call(who, method, path, options);
  if (!result.ok) throw new Error(`${method} ${path} as ${who} → ${result.status} ${result.text.slice(0, 600)}`);
  return result.data;
}

/** Reads every page of a paged list (the API caps a page at 50 rows). */
async function all(who, path) {
  const rows = [];
  for (let page = 1; page <= 40; page++) {
    const result = await call(who, 'GET', `${path}${path.includes('?') ? '&' : '?'}pageNumber=${page}&pageSize=50`);
    if (!result.ok) throw new Error(`GET ${path} as ${who} → ${result.status} ${result.text.slice(0, 400)}`);
    if (!Array.isArray(result.data)) return result.data;
    rows.push(...result.data);
    if (!result.pagination || page >= (result.pagination.totalPages ?? 1)) break;
  }
  return rows;
}

// ───────────────────────── small utilities ─────────────────────────

const report = [];
function note(item, created, skipped, extra = '') {
  report.push({ item, created, skipped, extra });
  console.log(`  ${item}: created ${created}, already there ${skipped}${extra ? ` — ${extra}` : ''}`);
}

const iso = (date) => date.toISOString().slice(0, 10);
const day = (text) => new Date(`${text}T00:00:00Z`);
function addDays(text, count) { const date = day(text); date.setUTCDate(date.getUTCDate() + count); return iso(date); }
const weekday = (text) => day(text).getUTCDay(); // 5 = Friday, the weekly day off
function schoolDay(text) { return weekday(text) === 5 ? addDays(text, 1) : text; }
/** A Kabul wall-clock time on a civil day, as a UTC instant. */
function kabul(text, hours, minutes = 0) {
  return new Date(day(text).getTime() + (hours * 60 + minutes - KABUL_OFFSET_MINUTES) * 60000).toISOString();
}
function hash(text) { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/** A one-page PDF with a few lines of Latin text (no fonts to embed). */
function pdf(lines) {
  const stream = `BT /F1 14 Tf 60 780 Td 20 TL ${lines.map((l) => `(${l.replace(/[\\()]/g, '\\$&')}) Tj T*`).join(' ')} ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n'; const offsets = [];
  objects.forEach((object, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}

// ───────────────────────── the demo content ─────────────────────────

// Mid-term (out of 40) for every course; final (out of 60) only where listed.
const STUDENT_MARKS = {
  Mathematics: { mid: 34 }, Dari: { mid: 37, final: 52 }, English: { mid: 31 }, Biology: { mid: 29 },
  'Islamic Studies': { mid: 38, final: 55 }, History: { mid: 33, final: 44 },
  Physics: { mid: 26, comment: 'به تمرین بیشتر در حل مسایل نیاز دارد.' }, Chemistry: { mid: 30 },
};

const ASSIGNMENTS = [
  { subject: 'Mathematics', due: -3, title: 'حل تمرین‌های فصل کسرها', text: 'تمرین‌های ۱ تا ۱۲ صفحه ۴۶ کتاب ریاضی را در کتابچه حل کنید و راه حل هر سوال را بنویسید.' },
  { subject: 'Dari', due: 0, title: 'نوشتن انشا: «وطن من افغانستان»', text: 'یک انشای یک‌صفحه‌ای درباره زیبایی‌های وطن بنویسید. به املای درست و نشانه‌گذاری توجه کنید.' },
  { subject: 'English', due: 3, title: 'تمرین لغات درس پنجم انگلیسی', text: 'لغات جدید درس پنجم را با معنای دری بنویسید و با هر لغت یک جمله بسازید.' },
  { subject: 'Biology', due: 6, title: 'رسم و نام‌گذاری حجره نباتی', text: 'شکل حجره نباتی را رسم کنید و بخش‌های آن (دیوار حجره، هسته، کلوروپلاست و ...) را نام‌گذاری کنید.' },
  { subject: 'History', due: 12, title: 'خلاصه درس تمدن‌های قدیم افغانستان', text: 'درس «تمدن‌های قدیم افغانستان» را در ده سطر خلاصه کنید و سه شهر تاریخی را نام ببرید.' },
  { subject: 'Physics', due: 20, title: 'حل مسایل سرعت و حرکت', text: 'پنج مسئله آخر فصل حرکت را حل کنید. واحدها را در هر جواب بنویسید.' },
];

const EVENTS = [
  { in: 5, hour: 9, hours: 2, title: 'جلسه اولیا و معلمین', location: 'تالار مکتب', text: 'گفت‌وگو درباره نتایج امتحان چهارونیم‌ماهه و پیشرفت درسی شاگردان. حضور یکی از والدین ضروری است.' },
  { in: 12, hour: 8, hours: 4, title: 'روز ورزش مکتب', location: 'میدان ورزشی مکتب', text: 'مسابقات فوتبال، والیبال و دوش بین صنف‌ها. شاگردان با لباس ورزشی بیایند.' },
  { in: 19, hour: 10, hours: 3, title: 'نمایشگاه ساینس', location: 'صحن مکتب', text: 'شاگردان پروژه‌های فزیک، کیمیا و بیولوژی خود را به نمایش می‌گذارند. بهترین پروژه‌ها جایزه می‌گیرند.' },
];

const HOLIDAY = { in: 9, name: 'رخصتی عمومی مکتب', text: 'مکتب در این روز رخصت است. درس‌ها روز بعد طبق تقسیم اوقات ادامه می‌یابد.' };

// The Afghanistan module only accepts an exam inside one of the school's exam periods.
const EXAM_PERIOD = { from: 14, to: 27, type: 'FINAL' };
const EXAMS = [
  { subject: 'Mathematics', in: 15, title: 'امتحان سالانه ریاضی', room: 'صنف هفتم' },
  { subject: 'English', in: 17, title: 'امتحان سالانه انگلیسی', room: 'صنف هفتم' },
];

const QUIZZES = [
  { subject: 'Mathematics', due: 2, minutes: 15, title: 'آزمون کوتاه کسرها', text: 'چهار سوال چهارجوابه از فصل کسرها.', questions: [
    ['حاصل جمع ۱/۲ و ۱/۴ چند است؟', ['۳/۴', '۲/۶', '۱/۶', '۱/۸'], 0],
    ['کدام کسر با ۲/۴ مساوی است؟', ['۱/۳', '۱/۲', '۳/۴', '۲/۳'], 1],
    ['حاصل ضرب ۲/۳ در ۳/۵ چند است؟', ['۵/۸', '۶/۸', '۲/۵', '۱/۵'], 2],
    ['کدام کسر بزرگ‌تر است؟', ['۱/۵', '۱/۴', '۱/۳', '۱/۲'], 3],
  ] },
  { subject: 'English', due: 5, minutes: 10, title: 'آزمون لغات درس پنجم', text: 'معنای درست هر لغت انگلیسی را انتخاب کنید.', questions: [
    ['معنای کلمه «library» چیست؟', ['کتابخانه', 'مکتب', 'بازار', 'شفاخانه'], 0],
    ['معنای کلمه «teacher» چیست؟', ['شاگرد', 'معلم', 'داکتر', 'دهقان'], 1],
    ['جمع کلمه «child» کدام است؟', ['childs', 'childes', 'children', 'child'], 2],
  ] },
  { subject: 'Biology', due: 9, minutes: 12, title: 'آزمون حجره و ساختمان آن', text: 'سه سوال از درس حجره.', questions: [
    ['مرکز کنترول حجره کدام است؟', ['هسته', 'دیوار حجره', 'سایتوپلازم', 'واکیول'], 0],
    ['کدام بخش تنها در حجره نباتی وجود دارد؟', ['هسته', 'غشای حجره', 'کلوروپلاست', 'مایتوکاندریا'], 2],
    ['غذاسازی نبات در کدام بخش صورت می‌گیرد؟', ['ریشه', 'کلوروپلاست', 'هسته', 'دیوار حجره'], 1],
  ] },
];

const SECTIONS = [
  { subject: 'Mathematics', title: 'فصل سوم: کسرها', text: 'جمع، تفریق، ضرب و تقسیم کسرها با مثال‌های حل‌شده.', materials: [
    { type: 'DOCUMENT', file: 'kasrha-khulasa.txt', title: 'خلاصه درس کسرها', text: 'قاعده‌های مهم فصل در یک صفحه.',
      body: 'خلاصه درس کسرها\n\n۱. برای جمع و تفریق کسرها ابتدا مخرج مشترک پیدا می‌کنیم.\n۲. در ضرب کسرها صورت در صورت و مخرج در مخرج ضرب می‌شود.\n۳. در تقسیم، کسر دوم را معکوس کرده و ضرب می‌کنیم.\n۴. همیشه جواب را ساده کنید.\n' },
    { type: 'PDF', file: 'fractions-worksheet.pdf', title: 'ورق تمرین کسرها', text: 'ده تمرین برای کار در خانه.',
      pdf: ['Grade 7 Mathematics - Fractions worksheet', '', '1)  1/2 + 1/4 =', '2)  3/5 - 1/5 =', '3)  2/3 x 3/4 =', '4)  5/6 : 1/3 =', '5)  Simplify 12/18', '6)  Which is larger: 3/7 or 2/5 ?'] },
  ] },
  { subject: 'Dari', title: 'دستور زبان: اسم و انواع آن', text: 'تعریف اسم، اسم خاص و عام، مفرد و جمع با مثال.', materials: [
    { type: 'DOCUMENT', file: 'ism-wa-anwa.txt', title: 'یادداشت درس اسم', text: 'تعریف‌ها و مثال‌های درس.',
      body: 'اسم و انواع آن\n\nاسم کلمه‌ای است که برای نامیدن انسان، حیوان، مکان یا چیز به کار می‌رود.\n\nاسم خاص: کابل، احمد، هریرود\nاسم عام: شهر، پسر، دریا\nمفرد: کتاب — جمع: کتاب‌ها\n\nتمرین: در متن درس پنج اسم خاص و پنج اسم عام پیدا کنید.\n' },
  ] },
  { subject: 'Biology', title: 'حجره و ساختمان آن', text: 'بخش‌های حجره نباتی و حیوانی و وظیفه هر بخش.', materials: [
    { type: 'DOCUMENT', file: 'hujra.txt', title: 'یادداشت درس حجره', text: 'بخش‌های حجره و وظیفه آن‌ها.',
      body: 'حجره کوچک‌ترین واحد ساختمانی موجود زنده است.\n\nهسته: مرکز کنترول حجره\nسایتوپلازم: ماده نیمه‌مایع داخل حجره\nغشای حجره: ورود و خروج مواد را کنترول می‌کند\nکلوروپلاست (تنها در نباتات): محل غذاسازی\nدیوار حجره (تنها در نباتات): شکل و استحکام حجره\n' },
    { type: 'PDF', file: 'cell-diagram-labels.pdf', title: 'ورق نام‌گذاری حجره', text: 'برای کارخانگی رسم حجره نباتی.',
      pdf: ['Grade 7 Biology - The plant cell', '', 'Label these parts on your drawing:', '- cell wall', '- cell membrane', '- nucleus', '- cytoplasm', '- chloroplast', '- vacuole'] },
  ] },
];

const TEACHER_THREAD = { subject: 'Mathematics', messages: [
  ['teacher', 'سلام احمد جان، کارخانگی فصل کسرها را هنوز تسلیم نکرده‌ای. لطفاً تا فردا آن را بیاور.'],
  ['student', 'سلام استاد محترم، ببخشید. در سوال هشتم مشکل دارم، بقیه را حل کرده‌ام.'],
  ['teacher', 'مشکلی نیست. فردا بعد از ساعت سوم بیا، سوال هشتم را با هم حل می‌کنیم.'],
] };
const ADMIN_MESSAGE = 'سلام. لطفاً به والدین محترم خود اطلاع دهید که جلسه اولیا و معلمین این هفته در تالار مکتب برگزار می‌شود. همچنان باقی‌مانده فیس ماه عقرب را به دفتر مکتب تحویل دهید.';

const ANNOUNCEMENTS = [
  { audience: 'STUDENTS', priority: 'NORMAL', pinned: true, title: 'آمادگی برای امتحانات سالانه',
    text: 'شاگردان عزیز، امتحانات سالانه به‌زودی آغاز می‌شود. تقسیم اوقات امتحانات در بخش تقویم قابل دیدن است. کتاب‌ها و یادداشت‌های خود را مرور کنید.' },
  { audience: 'CLASS', priority: 'HIGH', pinned: false, title: 'صنف هفتم: لباس ورزشی برای روز ورزش',
    text: 'شاگردان صنف هفتم در روز ورزش مکتب با لباس و بوت ورزشی حاضر شوند. تیم فوتبال صنف روز چهارشنبه بعد از درس تمرین دارد.' },
];

// One earlier month paid in full and a part payment on the open fee. Month names are the
// API's calendar ordinals: JULY is the 7th month (Mizan), AUGUST the 8th (Aqrab).
const FEES = { paidMonth: 'JULY', amount: 500, partMonth: 'AUGUST', partAmount: 200 };

// ───────────────────────── seeding steps ─────────────────────────

async function main() {
  console.log(`Seeding student demo data through ${API}`);
  await login(STUDENT);
  const student = sessions.get(STUDENT).student;
  const year = await must(STUDENT, 'GET', '/Main/activeCalendarYear');
  const today = year.academicSummary?.today ?? iso(new Date());
  const yearId = year.id;
  const klass = await must(STUDENT, 'GET', '/Student/class');
  const classId = klass.id;
  console.log(`School day ${today}; class ${klass.classNameValue} (${classId}); student ${student.firstName} ${student.lastName}`);

  const courses = (await all(ADMIN, `/School/courses?classId=${classId}`)).filter((c) => c.classId === classId);
  const course = Object.fromEntries(courses.map((c) => [c.subject.subjectName, { id: c.id, teacher: c.teacher?.email, teacherId: c.teacherId }]));
  const need = (subject) => { const c = course[subject]; if (!c?.teacher) throw new Error(`No course/teacher for ${subject}`); return c; };
  const homeroom = (await must(ADMIN, 'GET', `/School/class/${classId}`)).teacher?.email;
  if (!homeroom) throw new Error('Class has no homeroom teacher; attendance cannot be written');

  const roster = (await all(homeroom, `/Teacher/classStudents/${classId}/${yearId}`))
    .map((e) => ({ enrollmentId: e.id, studentId: e.studentId, roll: e.student?.asasNumber ?? 0 }))
    .sort((a, b) => a.roll - b.roll);
  const mine = roster.find((e) => e.studentId === student.id);
  if (!mine) throw new Error('The demo student is not on the class roster');

  await attendance(homeroom, classId, yearId, today, roster, mine);
  await grades(course, roster, mine);
  await assignments(need, today);
  await events(today);
  await holidayAndExams(need, today, yearId, classId);
  await quizzes(need, today);
  await materials(need);
  await messages(need, student);
  await announcements(classId, today);
  await fees(student, yearId, today);
  await verify(today);
}

// 1. Daily roll call for the last four school weeks, written by the homeroom teacher.
// The API stores a mark as present/absent only (there is no "late").
async function attendance(homeroom, classId, yearId, today, roster, mine) {
  const scheme = []; // the last four weeks without Fridays, up to the school's today
  for (let back = 28; back >= 0; back--) { const date = addDays(today, -back); if (weekday(date) !== 5) scheme.push(date); }
  let created = 0, skipped = 0, days = 0;
  for (const date of scheme) {
    const existing = new Set((await all(homeroom, `/Teacher/attendance?classId=${classId}&dateTime=${date}`)).map((a) => a.enrollmentId));
    const rows = roster.filter((e) => !existing.has(e.enrollmentId)).map((e) => ({
      enrollmentId: e.enrollmentId,
      // Keyed by the date, so a later run marks the same days the same way.
      status: hash(`${e === mine ? 'demo-student' : e.roll}:${date}`) % (e === mine ? 8 : 17) !== 0,
    }));
    skipped += roster.length - rows.length;
    if (rows.length === 0) continue;
    await must(homeroom, 'POST', '/Teacher/addAttendance', { json: { calendarYearId: yearId, date, attendances: rows } });
    created += rows.length; days++;
  }
  note('1 Attendance', created, skipped, `${days} of ${scheme.length} school days written (${scheme[0]} … ${scheme.at(-1)}); days already marked are left as they are`);
}

// 2. Marks, written by each course's own teacher and checked against the school's scheme.
async function grades(course, roster, mine) {
  const scheme = await must(STUDENT, 'GET', '/grading/scheme');
  const max = Object.fromEntries(scheme.components.map((c) => [c.examType, c.maximum]));
  let created = 0, skipped = 0;
  for (const [subject, marks] of Object.entries(STUDENT_MARKS)) {
    const c = course[subject];
    if (!c?.teacher) { console.log(`  (no course for ${subject}, skipped)`); continue; }
    const existing = new Set((await all(c.teacher, `/Teacher/grades?courseId=${c.id}`))
      .filter((g) => g.courseId === c.id).map((g) => `${g.enrollmentId}:${g.examType}`));
    const rows = [];
    for (const exam of ['MID_TERM', 'FINAL']) {
      const own = exam === 'MID_TERM' ? marks.mid : marks.final;
      if (own === undefined || max[exam] === undefined) continue;
      for (const e of roster) {
        if (existing.has(`${e.enrollmentId}:${exam}`)) { skipped++; continue; }
        const spread = hash(`${e.roll}:${subject}:${exam}`);
        const score = e === mine ? own : exam === 'MID_TERM' ? 15 + (spread % 25) : 26 + (spread % 33);
        const row = { enrollmentId: e.enrollmentId, courseId: c.id, examType: exam, score: Math.min(score, max[exam]) };
        if (e === mine && exam === 'MID_TERM' && marks.comment) row.comment = marks.comment;
        rows.push(row);
      }
    }
    if (rows.length === 0) continue;
    await must(c.teacher, 'POST', '/Teacher/addGrades', { json: { grades: rows } });
    created += rows.length;
  }
  note('2 Grades', created, skipped, 'mid-term for all 8 courses, final for Dari, Islamic Studies and History (whole class)');
}

// 3. Homework set by the course teacher (multipart form, like the web app sends it).
async function assignments(need, today) {
  let created = 0, skipped = 0;
  for (const a of ASSIGNMENTS) {
    const c = need(a.subject);
    const existing = await all(c.teacher, `/Assignment/course/${c.id}`);
    if (existing.some((row) => row.title === a.title)) { skipped++; continue; }
    await must(c.teacher, 'POST', '/Assignment', { form: [
      ['Title', a.title], ['Description', a.text], ['CourseId', c.id], ['DueDate', kabul(addDays(today, a.due), 17)],
    ] });
    created++;
  }
  note('3 Assignments', created, skipped);
}

// 4a. School events (admin).
async function events(today) {
  const existing = await all(ADMIN, '/event');
  let created = 0, skipped = 0;
  for (const e of EVENTS) {
    if (existing.some((row) => row.title === e.title)) { skipped++; continue; }
    const date = schoolDay(addDays(today, e.in));
    await must(ADMIN, 'POST', '/event', { json: {
      title: e.title, description: e.text, location: e.location, startAt: kabul(date, e.hour), endAt: kabul(date, e.hour + e.hours),
    } });
    created++;
  }
  note('4 Events', created, skipped);
}

// 4b. One holiday, one exam period (required by the Afghanistan module) and the exams in it.
async function holidayAndExams(need, today, yearId, classId) {
  const holidays = await all(ADMIN, '/holidays');
  if (holidays.some((h) => h.name === HOLIDAY.name)) note('4 Holiday', 0, 1);
  else {
    const date = schoolDay(addDays(today, HOLIDAY.in));
    await must(ADMIN, 'POST', '/holidays', { json: { name: HOLIDAY.name, description: HOLIDAY.text, fromDate: date, toDate: date } });
    note('4 Holiday', 1, 0, date);
  }

  const options = await must(ADMIN, 'GET', '/Exam/scheduling-options');
  let selection = null, periodFrom = addDays(today, EXAM_PERIOD.from);
  if (options.required) {
    const afghanYear = (await must(ADMIN, 'GET', '/afghanistan/academic-years')).find((y) => y.calendarYearId === yearId);
    if (!afghanYear) { note('4 Exams', 0, 0, 'skipped: no Afghan academic year for the active year'); return; }
    let period = (await must(ADMIN, 'GET', `/afghanistan/exam-periods?academicYearId=${afghanYear.id}`))
      .find((p) => p.examType === EXAM_PERIOD.type && p.toDate >= addDays(today, 1));
    if (period) note('4 Exam period', 0, 1, `${period.fromDate} … ${period.toDate}`);
    else {
      period = await must(ADMIN, 'POST', '/afghanistan/exam-periods', { json: {
        academicYearId: afghanYear.id, examType: EXAM_PERIOD.type, fromDate: periodFrom, toDate: addDays(today, EXAM_PERIOD.to),
        version: null, gradeFrom: 7, gradeTo: 9,
      } });
      note('4 Exam period', 1, 0, `${period.fromDate} … ${period.toDate}`);
    }
    periodFrom = period.fromDate > today ? period.fromDate : addDays(today, 1);
    const option = (await must(ADMIN, 'GET', '/Exam/scheduling-options')).options.find((o) => o.optionId === period.id);
    if (!option) { note('4 Exams', 0, 0, 'skipped: the exam period is not offered as a scheduling option'); return; }
    selection = { providerId: option.providerId, optionId: option.optionId, version: option.version };
  }
  const existing = await all(ADMIN, `/Exam?classId=${classId}`);
  let created = 0, skipped = 0;
  for (const [index, exam] of EXAMS.entries()) {
    if (existing.some((row) => row.title === exam.title)) { skipped++; continue; }
    const c = need(exam.subject);
    const date = schoolDay(addDays(periodFrom, 1 + index * 2));
    await must(ADMIN, 'POST', '/Exam', { json: {
      schedulingSelection: selection, calendarYearId: yearId, classId, courseId: c.id, title: exam.title,
      startAt: kabul(date, 8), durationMinutes: 90, room: exam.room, proctorTeacherId: c.teacherId,
    } });
    created++;
  }
  note('4 Exams', created, skipped);
}

// 5. Quizzes with their questions (course teacher).
async function quizzes(need, today) {
  let created = 0, skipped = 0, questions = 0;
  for (const q of QUIZZES) {
    const c = need(q.subject);
    let quiz = (await all(c.teacher, `/Quiz/course/${c.id}`)).find((row) => row.title === q.title);
    if (quiz) skipped++;
    else {
      quiz = await must(c.teacher, 'POST', '/Quiz', { json: {
        title: q.title, description: q.text, courseId: c.id, dueDate: kabul(addDays(today, q.due), 16), timeLimitMinutes: q.minutes, randomizeQuestions: false,
      } });
      created++;
    }
    const have = new Set((await must(c.teacher, 'GET', `/Quiz/${quiz.id}/questions`)).map((row) => row.question));
    for (const [question, choices, answer] of q.questions) {
      if (have.has(question)) continue;
      await must(c.teacher, 'POST', `/Quiz/${quiz.id}/questions`, { json: {
        question, option1: choices[0], option2: choices[1], option3: choices[2], option4: choices[3], answer: choices[answer],
      } });
      questions++;
    }
  }
  note('5 Quizzes', created, skipped, `${questions} questions added`);
}

// 6. Course sections with small generated text/PDF files (course teacher, multipart).
async function materials(need) {
  let created = 0, skipped = 0, files = 0;
  for (const s of SECTIONS) {
    const c = need(s.subject);
    const existing = (await all(c.teacher, `/Teacher/courseSections?courseId=${c.id}`)).filter((row) => row.courseId === c.id);
    if (existing.some((row) => row.title === s.title)) { skipped++; continue; }
    const form = [['CourseId', c.id], ['Title', s.title], ['Description', s.text]];
    s.materials.forEach((m, i) => {
      form.push([`LearningMaterials[${i}].Title`, m.title], [`LearningMaterials[${i}].Description`, m.text], [`LearningMaterials[${i}].LearningMaterialType`, m.type]);
      form.push([`LearningMaterials[${i}].File`, m.pdf ? pdf(m.pdf) : new Blob([m.body], { type: 'text/plain' }), m.file]);
    });
    await must(c.teacher, 'POST', '/Teacher/addCourseSection', { form });
    created++; files += s.materials.length;
  }
  note('6 Course materials', created, skipped, `${files} files uploaded`);
}

// 7. Two conversations: the mathematics teacher (with one reply from the student) and the school.
async function messages(need, student) {
  let created = 0, skipped = 0;
  const send = async (who, toId, toRole, body, thread) => {
    if (thread.some((row) => row.body === body)) { skipped++; return; }
    await must(who, 'POST', '/Message', { form: [['ToUserId', toId], ['ToUserRole', toRole], ['Body', body]] });
    created++;
  };
  const teacher = need(TEACHER_THREAD.subject);
  const withTeacher = await all(teacher.teacher, `/Message/thread/STUDENT/${student.id}`);
  for (const [from, body] of TEACHER_THREAD.messages) {
    if (from === 'teacher') await send(teacher.teacher, student.id, 'STUDENT', body, withTeacher);
    else await send(STUDENT, teacher.teacherId, 'TEACHER', body, withTeacher);
  }
  await send(ADMIN, student.id, 'STUDENT', ADMIN_MESSAGE, await all(ADMIN, `/Message/thread/STUDENT/${student.id}`));
  note('7 Messages', created, skipped);
}

// 8. Announcements for all students and for the class (admin).
async function announcements(classId, today) {
  const existing = await all(ADMIN, '/Announcement');
  let created = 0, skipped = 0;
  for (const a of ANNOUNCEMENTS) {
    if (existing.some((row) => row.title === a.title)) { skipped++; continue; }
    await must(ADMIN, 'POST', '/Announcement', { json: {
      title: a.title, body: a.text, audience: a.audience, classId: a.audience === 'CLASS' ? classId : null,
      priority: a.priority, isPinned: a.pinned, expiresAt: kabul(addDays(today, 30), 23),
    } });
    created++;
  }
  note('8 Announcements', created, skipped);
}

// 9. One more monthly fee, paid in full, and a part payment on the open fee (admin, cash).
async function fees(student, yearId, today) {
  let created = 0, skipped = 0;
  const pay = (body) => must(ADMIN, 'POST', '/Fee/payments', { json: { paymentMethod: 'CASH', paidAt: kabul(today, 10), ...body } });
  let mineFees = await must(STUDENT, 'GET', '/Fee/mine');
  if (mineFees.some((f) => f.month === FEES.paidMonth && f.calendarYearId === yearId)) skipped++;
  else {
    await pay({ studentId: student.id, calendarYearId: yearId, month: FEES.paidMonth, defaultAmount: FEES.amount, amount: FEES.amount,
      reference: 'DEMO-MIZAN', notes: 'پرداخت نقدی فیس ماه میزان' });
    created++;
  }
  mineFees = await must(STUDENT, 'GET', '/Fee/mine');
  const open = mineFees.find((f) => f.month === FEES.partMonth && f.calendarYearId === yearId);
  if (!open) console.log(`  (no ${FEES.partMonth} fee to part-pay, skipped)`);
  else if (open.paidAmount > 0) skipped++;
  else {
    await pay({ feeId: open.id, amount: Math.min(FEES.partAmount, open.amount), reference: 'DEMO-AQRAB-1', notes: 'پرداخت قسط اول فیس ماه عقرب' });
    created++;
  }
  note('9 Fees', created, skipped, `${FEES.paidMonth} fee created and paid; part payment on ${FEES.partMonth}`);
}

// ───────────────────────── what the student now sees ─────────────────────────

async function verify(today) {
  console.log('\nRead back as the student:');
  const count = async (label, path, pick) => {
    const result = await call(STUDENT, 'GET', path);
    const size = !result.ok ? `HTTP ${result.status}` : pick ? pick(result.data, result.pagination)
      : result.pagination?.totalItems ?? (Array.isArray(result.data) ? result.data.length : JSON.stringify(result.data));
    console.log(`  ${label.padEnd(28)} ${size}`);
  };
  await count('/Schedule/mine', '/Schedule/mine', (d) => `${d.length} day rows`);
  await count('/school-calendar', `/school-calendar?from=${addDays(today, -7)}&to=${addDays(today, 60)}`,
    (d) => `${d.entries.length} entries (${Object.entries(Object.groupBy(d.entries, (e) => e.kind)).map(([k, v]) => `${k} ${v.length}`).join(', ')})`);
  await count('/Attendance/mine/summary', '/Attendance/mine/summary?recentDays=30', (d) => JSON.stringify(Array.isArray(d) ? d.map(({ recent, ...rest }) => ({ ...rest, recent: recent?.length })) : d).slice(0, 400));
  await count('/Assignment/mine', '/Assignment/mine');
  await count('/Student/grades', '/Student/grades');
  await count('/grading/scheme', '/grading/scheme', (d) => `${d.key}: ${d.components.map((c) => `${c.examType}/${c.maximum}`).join(' + ')}`);
  await count('/Fee/mine', '/Fee/mine', (d) => d.map((f) => `${f.month} ${f.paidAmount}/${f.amount}`).join(', '));
  await count('/report-card/mine', '/report-card/mine', (d) => Object.entries(d).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `${k} ${v.length}`).join(', '));
  await count('/Student/courseSections', '/Student/courseSections');
  await count('/Quiz/for-student', '/Quiz/for-student');
  await count('/event/upcoming', '/event/upcoming');
  await count('/Exam', '/Exam');
  await count('/Announcement/active', '/Announcement/active');
  await count('/Book/library', '/Book/library');
  await count('/Message/threads', '/Message/threads');
  await count('/Message/contacts', '/Message/contacts');
  await count('/Notification', '/Notification');
  await count('/Notification/unread-count', '/Notification/unread-count', (d) => d.count);
}

main().catch((error) => { console.error(`\nFAILED: ${error.message}`); process.exit(1); });
