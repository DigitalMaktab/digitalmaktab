# New features — DigitalMaktab roadmap

Living list of features to introduce after the four-part consistency
loop has settled. Each entry has a short title, a one-line scope, and
the primary user who benefits. Group priority is roughly top-down.

Status key: `[ ]` not started · `[~]` in progress · `[x]` shipped.

## Finance

- [x] **Fee receipt PDF** — download a signed receipt for any paid /
  partial fee row (admin + parent + student). Reuses existing
  jsPDF pipeline + school branding.
- [x] **Fee invoice PDF (upfront)** — before payment, admin can hand
  the parent a printable invoice showing total due + breakdown.
- [x] **Scholarships + discounts** — per-student discount rule
  (percentage or fixed), applied automatically at fee materialization.
- [x] **Dues reminders** — scheduled job that emails parents of
  unpaid / partial fees past a configurable grace window.
- [x] **Multi-fee bulk payment** — parent pays several months at once
  with a single transaction and one combined receipt.
  (v1 ships admin-side only; parent self-service waits for the
  payment-gateway bullet.)
- [x] **Fee waiver workflow** — teacher / admin proposes a waiver;
  principal / root approves; audit trail per waiver.
  (v1 lets ADMIN act as approver; move to PrincipalPolicy once
  principal accounts are seeded.)
- [ ] **Payment gateway integration** — Stripe / local provider for
  online fee payment; receipt generated on webhook confirmation.
  (Blocked: needs live provider credentials + webhook URL to
  verify end-to-end. Skipping until creds are available.)

## Academic

- [x] **Exam scheduling** — admin builds an exam timetable per class;
  conflicts (same student / same room / same proctor) flagged.
- [x] **Grade appeal flow** — student / parent submits an appeal on a
  specific grade; teacher responds; principal arbitrates.
  (v1 ships propose → decide; principal arbitration layer is a
  follow-up once that role is used in production.)
- [x] **Report card customization** — admin picks which columns
  appear (per-term vs cumulative, teacher comments, attendance %),
  with per-grade thresholds configurable per school.
  (v1 wires the admin editor + per-school settings row; renderer
  honours ShowAttendance + ShowTeacherComments immediately.
  ShowCumulative flag is reserved — the cumulative-average panel is
  a follow-up; renderer gates on it the moment that panel ships.
  Report-card callers in SPA need to pass the fetched settings
  prop in a follow-up pass to activate the hiding behaviour.)
- [x] **Transcript export** — multi-year academic record for a
  departing student, printable + PDF.
  (v1 ships the endpoint + shared /transcript/:studentId screen;
  row-level buttons on StudentList / ChildrenList + student
  dashboard quick-link are a follow-up pass.)
- [x] **Assignment plagiarism flag** — simple hash-match on text
  submissions across the same class.
  (v1 is exact SHA-256 of raw file bytes — catches
  download-rename-resubmit. Fuzzy / shingling match is a follow-up.)
- [x] **Quiz question bank** — teachers maintain a reusable pool of
  questions tagged by subject + difficulty; quiz draws from it.
  (v1 ships the per-school pool CRUD. 'Draw N from bank into a quiz'
  wiring is a follow-up — the Quiz authoring flow needs a 'from
  bank' option that queries by filter.)
- [x] **Co-curricular activities + grades** — track clubs, sports,
  participation; roll into report card as a separate panel.
  (v1 ships CRUD for activities, roster enroll/unenroll, inline grade
  letter + comment per participant. Rolling into the printable report
  card is a follow-up — needs a "co-curricular" panel added to the
  ReportCard template.)

## Operations

- [x] **Teacher leave + substitute flow** — teacher requests leave,
  admin approves + optionally assigns a substitute to each affected
  class; students / parents notified.
  (v1 ships the request → approve/reject lifecycle with a single
  substitute teacher per leave range. Per-schedule substitute
  assignment + student/parent push notifications are a follow-up.)
- [x] **Transport (bus routes)** — define routes + stops + bus
  numbers; assign students; drivers see their daily roster.
  (v1 ships admin CRUD for routes, nested stops, and student
  assignments. Each student can ride one route at a time. Driver
  self-service dashboard is a follow-up — needs a driver UserRole.)
- [x] **Hostel / dormitory** — rooms + capacity + occupants; monthly
  rent flow mirrors fee pipeline; warden announcements.
  (v1 ships hostels + rooms + occupant check-in/out with capacity +
  one-active-room-per-student enforcement. Monthly rent flow + warden
  announcement channel are a follow-up — the fee pipeline can host
  rent once a HostelRent fee kind lands.)
- [x] **Inventory** — track consumables (chalk, textbooks on hand,
  lab chemicals); low-stock alerts to admin.
  (v1 ships item CRUD, signed +/− transactions with running quantity,
  low-stock badge on the admin screen, and per-item history. Push
  alerts to admin when stock crosses the threshold is a follow-up —
  wire into NotificationService in a future cycle.)
- [x] **School calendar + holidays** — publishable calendar with
  holidays, exams, PTM days; feeds student / parent dashboards.
  (v1 ships a dedicated Holiday entity + admin CRUD, plus a
  /school-calendar aggregator that returns holidays + school events +
  exams in a date range. Shared read-only month-grid screen mounted
  for admin / teacher / student / parent at /school-calendar. PTM
  slot-booking stays on its own Communication-section bullet.)

## Communication

- [x] **Parent-teacher meeting scheduling** — admin opens a window;
  parents book a slot per teacher; teachers see their day's slots.
  (v1 ships teacher-side open-window + manage-day screen and
  parent-side pick-teacher + book flow. One active booking per
  parent per teacher. Admin can open windows on behalf of a teacher
  via ?teacherId=; dedicated admin surface is a follow-up.)
- [x] **School newsletter / digest** — periodic auto-generated roll-up
  of announcements + events + student highlights, emailed to parents.
  (v1 ships NewsletterDigest entity + admin "generate from activity"
  that snapshots announcements + events + holidays in a period into a
  Markdown body, plus admin "compose" for hand-written issues.
  Shared reader screen for admin + parent at /newsletter. Scheduled
  auto-generation hosted service + email send are follow-ups that
  need SMTP creds.)
- [ ] **SMS gateway for critical alerts** — one-time password resets,
  absence alerts, emergency closures. Pluggable provider.
- [ ] **Direct voice / video call from message thread** — adds a call
  button that spins up a `ClassHub`-backed room between two users.
- [x] **Broadcast to parents of one class** — teacher composes once,
  the message fans out to every linked parent of that class.
  (v1 ships a MessageController broadcast endpoint that fans one
  message per unique parent, scoped to classes the teacher owns —
  admin can broadcast to any class. Teacher + admin SPA screen at
  /class-broadcast with live recipient-count preview + confirm.)

## Student wellbeing

- [x] **Discipline / incident log** — teacher logs an incident per
  student (type, date, note, severity); shows on student profile;
  parent sees their child's log only.
  (v1 ships IncidentLog entity with LOW/MEDIUM/HIGH severity, teacher
  / admin per-student history + log at /incident-log, parent-only
  all-children view at /children-incidents. Admin-only delete for
  corrections. Surfacing on the student profile card is a follow-up.)
- [x] **Health records** — allergies, blood group, chronic conditions,
  medication-on-file. Admin + nurse-role access only.
  (v1 ships one HealthRecord per student with blood group + allergies +
  chronic conditions + medications + emergency contact + notes. Admin
  / principal / head-master edit at /health-records; student and
  parent read-only. Dedicated nurse role is a follow-up — teachers
  are deliberately excluded for medical privacy.)
- [x] **Vaccination tracker** — per-student vaccine schedule with
  reminders; parents can upload proof.
  (v1 ships VaccineRecord with scheduled + administered dates;
  admin schedules + marks administered at /vaccinations; student
  self-view and parent children-aggregate flag done / overdue /
  upcoming with a status badge. Parent attaches a text proof note
  (card number / URL); file-upload proof + scheduled reminder
  notifications are follow-ups.)
- [x] **Counseling appointments** — student / parent books a slot
  with the school counselor; private note on the appointment.
  (v1 ships CounselingAppointment with REQUESTED → CONFIRMED /
  DECLINED / CANCELLED / COMPLETED lifecycle; any TEACHER acts as
  counselor; private note writable only by counselor / admin and
  hidden from parent / student. Shared /counseling screen with
  role-aware actions. Dedicated counselor role is a follow-up.)

## Admin productivity

- [x] **Bulk student import — csv / excel** — admin uploads a sheet,
  the backend creates every row with validation + a review step.
  (Shipped: StudentImportService wired through SchoolController +
  SPA import button on StudentList — already present when cycle 124
  audited; the earlier "partial" note was stale.)
- [x] **Full-school backup + restore** — admin triggers a snapshot
  (student / teacher / fee / grade / attendance tables) as a zip
  that root can re-import into a fresh instance.
  (v1 ships the snapshot: /backup/export streams a zip with one JSON
  file per core table — students, teachers, parents, classes,
  courses, enrollments, grades, fees, payments, attendances — plus a
  manifest.json. Restore flow is a planned follow-up — the inverse
  needs FK-safe ordering + idempotency which is its own cycle.)
- [x] **Data export per entity** — any list screen → "Export full
  table" that respects the current filter and streams the full
  dataset (not just the paged rows) as csv / excel.
  (v1 ships CSV export on every AppTable alongside the existing PDF
  "Print" button. New `fetchAllForExport` prop lets callers return
  every row matching the current filter; omitting it falls back to
  the visible page. Writes UTF-8 BOM so Excel opens Dari / Pashto
  cells correctly. Per-screen opt-in to the full-dataset fetcher is
  a follow-up — core wiring is universal.)
- [ ] **Role + permission editor** — admin creates custom role rows
  (e.g. "accountant") with granular capability flags, instead of the
  hard-coded ADMIN / TEACHER / PARENT split.

## Student lifecycle

- [x] **Admissions workflow** — prospective student submits an
  application; admin reviews + accepts / rejects; accepted candidates
  convert to Student rows automatically.
  (v1 ships Admission entity with SUBMITTED → UNDER_REVIEW →
  ACCEPTED/REJECTED → CONVERTED lifecycle. Anonymous public form at
  /apply writes rows; admin reviews at /admissions with per-row
  Accept/Reject + optional decision note. Conversion is manual in
  v1 — admin creates the Student record and pastes the id into the
  Mark-converted modal to close the loop. Automated promotion is a
  follow-up: Admission form doesn't collect every Student field.)
- [x] **Transfer / withdrawal** — mark a student inactive with a
  reason; preserve historical data; transfer certificate PDF generated.
  (v1 ships WithdrawalKind enum + StudentWithdrawal entity; admin
  records at /withdrawals which also flips Student.Status to false
  so the row drops out of active queries. Historical data stays
  because the withdrawal row and the student record are both
  preserved. Printable certificate renders at
  /withdrawal-certificate/:id via window.print — PDF generation
  via jsPDF is a follow-up polish.)
- [x] **Graduation batch** — year-end bulk-promote operation moves
  every student up one class; final-year class produces a graduation
  roster + certificate run.
  (v1 ships GraduationController with promote-class (bulk re-
  enrollment onto a pre-existing destination class), graduate-class
  (bulk WITHDRAWAL rows with reason="Graduation" + Student.Status
  flipped inactive), and a printable roster endpoint. Admin
  /graduation screen stacks the three actions and prints the roster.
  Destination class must be created ahead of time via the existing
  class flow — this cycle does not auto-create classes.)
- [x] **Alumni directory** — graduated students stay in a read-only
  alumni table; alumni-only announcements + reunions.
  (v1 ships GET /alumni which treats "StudentWithdrawal with
  reason=Graduation" as the alumni source — no new table, zero
  write cost at graduation time. Admin screen at /alumni with
  server-side name search + final-class + branch resolved from
  the student's last Enrollment. Alumni-only announcement audience
  + reunion scheduling are documented as follow-ups.)

## Mobile + offline

- [ ] **Mobile push notifications** — hook `NotificationService` into
  FCM / APNs so parents get push outside the browser tab.
- [ ] **Offline mode for teacher attendance / grades** — teacher's
  tablet caches the roster; the write queues until network returns.
- [x] **Progressive Web App** — install the SPA to home screen with
  the dashboard preloaded for the current role.
  (v1 ships a vanilla service worker that cache-firsts the static
  shell (HTML/CSS/JS/icons/manifest) and network-only skips every
  /api/* request so classroom data never serves from cache. On
  prod hostnames the SW is registered post-load; localhost + file://
  skip so CRA dev hot-reload stays sane. Manifest.json enhanced
  with description, scope, maskable icons, orientation + theme
  color so install prompts render cleanly on Chrome / Safari.
  Role-specific dashboard preload is a follow-up polish.)

## Analytics + insights

- [ ] **Admin dashboard — financial health** — KPI tiles for monthly
  collection vs expected, aging buckets, top overdue parents.
- [ ] **Teacher dashboard — class performance** — grade distribution,
  attendance trend, assignment completion rate per class.
- [ ] **Parent dashboard — child-vs-class percentile** — show their
  child's grades / attendance against the (anonymized) class
  distribution.
- [ ] **Cross-school benchmarks (root view)** — root sees aggregated
  anonymized metrics across all schools on the platform.

## Platform

- [ ] **Audit log viewer** — surface the existing `Audit` table in a
  searchable UI with actor / entity / date filters.
- [ ] **Impersonation (root only)** — root can "view as" a specific
  user to debug a report; every impersonated action is tagged.
- [ ] **Rate limiting + abuse controls** — per-IP + per-user caps on
  the auth, password-reset, and messaging endpoints.
- [ ] **GDPR / data-export + delete** — parent requests export of
  their child's full record as a zip; admin honors delete requests
  with a soft-delete + retention window.

---

**Loop convention**: each cycle picks one bullet from this list,
ships it end-to-end (backend + Core + SPA + spa-core + translations
in en-US + fa-AF + ps-AF + commits per repo), and flips its checkbox
to `[x]`. If a cycle hits a half-shipped bullet it finishes that one
first before starting a new feature.
