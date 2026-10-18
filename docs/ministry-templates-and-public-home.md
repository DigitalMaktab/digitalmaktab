# Ministry templates and public homepage

## Completed implementation

Afghanistan owns the new `/afghanistan/ministry-templates` page, its sidebar
entry, report data contracts/repository/service, API routes and embedded Excel
assets. Core owns the shared appearance selector/layout, theme preference hook,
controlled select and cancellable binary-download hook. The shell only composes
the public page. Other countries do not activate the Afghanistan feature.

## Supplied workbook inventory

The four most recent ministry workbooks in Downloads were inspected. Their
source SHA-256 hashes, all 35 sheet layouts, pupil input row addresses and hashes
of untouched OOXML parts are in the Afghanistan module's
`Reports/Templates/manifest.json`.

- Incoming/outgoing three-parcha register: 2 right-to-left sheets, 28 merged
  regions each, school/province/district/EMIS/year header, grouped previous/new
  school headings and 13 report columns. Incoming sheet retains its original
  16-column worksheet extent and blank decorative merged cells.
- First shift: 11 sheets for grades 1–2, 25 columns, 356 pupil blocks.
- Second shift: 11 sheets for grades 3–4, 25/28 columns, 384 pupil blocks.
- Third shift: 11 sheets for grades 5–6, 28 columns, 356 pupil blocks.

Each results pupil block contains midterm, annual and total rows. The layouts
retain original fonts, number formats, borders, widths, heights, hidden metadata,
merges, ministry artwork/drawing anchors, signature/seal areas, landscape print
settings and 20,258 original formula expressions. Grades 1–3 retain their special
Pashto/Dari alternative-subject formulas; grades 4–6 retain their separate subject
columns and result rules. Reports never rebuild these forms using generic table
markup or recreate the workbooks with ClosedXML.

Blank templates remove the supplied school/pupil identities, cached formula
results and file-author details. An unused external-workbook link in the transfer
sample contained cached donor records and a local file path; it was removed.
Original source files are untouched and are not committed. All other unused
parts remain byte-for-byte identical, recorded in the manifest.

## Report behaviour

- Blank downloads provide all original sheets, including every supplied layout
  variant. Current-school class results fill identities, enrolment and available
  midterm/final marks; Excel recalculates the preserved formulas on opening.
- Class selection fixes both tenant and academic year. Results use the appropriate
  grade workbook, continuing excess pupils on another same-grade sheet. The
  supplied layouts cover grades 1–6; unsupported grades or workbook capacity
  overflow return a translated error rather than omit records.
- Subject names are matched using an Afghanistan-owned explicit alias map.
  Unrecognized subjects or conflicting marks return a translated error rather
  than silently mislabel scores. Missing marks remain blank, including actual
  recorded zero scores which are preserved as numeric zero.
- Attendance subcategories and summary inputs remain blank where Core has no
  equivalent record. The app does not fabricate sickness/leave/teaching-day data
  or substitute its own result policy for the supplied ministry formulas.
- Transfer exports include only completed/released transfers involving this
  school. Both dates are required, inclusive and interpreted as Kabul civil days.
  Incoming/outgoing school columns follow the corresponding supplied sheet.
  Additional records copy the original input row's formatting.
- Routes enforce module country targeting and school capabilities; report
  responses disable caching. Downloads run once, expose localized failures and
  cancel when the page is abandoned.

## Public homepage

The public page now uses its missing landing layout class and respects the saved
appearance preference. Core synchronizes light/dark/system preference, Bootstrap
and app theme attributes, OS changes and other tabs. The public header uses the dashboard’s shared globe language picker and sun/moon
control; both headers share the same preference hook. The navbar uses the app’s
opaque card surface, stays pinned while scrolling, and retains contrast in both themes.
The homepage has a semantic main heading, direct registration/sign-in actions,
public privacy/support routes that require no private API calls, compact responsive spacing, dark feature cards and
keyboard/mobile navigation with an accessible menu toggle. English, Dari and
Pashto strings also have mobile counterparts.

## Verification

- `python3 tools/verify-ministry-templates.py /path/to/Downloads` in the Afghanistan
  backend compares every supplied formula, cell style and complete non-cell
  worksheet structure against source files. All 35 layouts / 20,258 formulas pass.
- `scripts/tests/run-afghan-academic-postgres.sh`: 80 isolated PostgreSQL tests,
  including real workbook downloads, scoped results, decimal marks and Kabul
  transfer date boundaries.
- `scripts/tests/ministry-reports.cjs`: actual report screens/shared download hook
  across all locales, correct paths/date payloads, filenames and cancellation.
- `scripts/tests/public-home.cjs`, `root-route.cjs`, `school-dashboard.cjs`:
  appearance persistence/system changes, public/private routing, mobile controls
  and dashboard regressions.
- Browser previews cover desktop light, Dari dark, and mobile light/dark.
- Package sync, TypeScript and translation parity checks complete before commit.

No user-owned API or SPA server was restarted. Restart `dotnet watch run` and
`npm start` to load the newly packed modules.
