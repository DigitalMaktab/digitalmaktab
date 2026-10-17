# Form and table audit

Objective: every persistence form saves the intended fields; every table shows its data and applied criteria; idle tables do not continuously fetch. **In progress.** Passing the shared checks does not prove every screen or endpoint works.

## Scope

Run `node scripts/audit-data-flows.cjs /tmp/digitalmaktab-data-flow-inventory.json` for source locations. Current inventory covers the shell, SPA Core, Afghanistan and Austria packages: 79 form sites in 61 files, 94 table sites and 216 direct API mutation calls. Standalone modal controls and hook-based mutation handlers also need review; these counts alone are not exhaustive form coverage.

## Verified corrections

| Area | Evidence |
| --- | --- |
| HTTP success status and internal result enum | Actual Core tests accept internal SUCCESS and successful HTTP codes, reject failures. First-party callers now use the common helper. |
| Form values, cleared selects, nested phone objects | Real Formik/controls submit edited values, preserve nested country IDs and ignore stale external values. |
| Duplicate submits, inline loader callbacks, debounced searches | Actual hooks/components verify one pending mutation, stable callbacks and unmount cancellation. |
| Failed writes and cached GETs | Axios adapter tests prove failed mutations and HTTP errors reject; only network GET failures can fall back to offline data. |
| Concurrent reads and tables | Each caller receives its own successful result; shared hook state and AppTable reject stale updates. Superseded table requests receive abort signals. |
| Core enum DTOs | Tests cover string/numeric enum values, saved auth sessions, ambiguous field scoping, and preservation of custom module payloads. |
| Student discount and nested fields | Isolated PostgreSQL/Kestrel test reads back actual student updates, nested phone/address, discounts; omitted legacy discount fields remain intact; explicit clearing works; invalid percentages reject; cross-school writes reject. Creation mapper/repository is covered, full registration HTTP flow is pending. |
| Backend validation registration | All public Core validators resolve from the shared assembly registration. Chapter validation checks every child material, required video file/thumbnail and file-free links. |
| Assignment create and table refresh | Real course-assignment screen with Core table/modal and an in-memory repository verifies failed draft retention, pending duplicate prevention, one refresh and preservation of current page/date criteria. Teacher assignments, submission grading and fees use the same reload pattern; equivalent screen-specific verification remains pending. |
| Library edit | Rendered editor keeps the existing PDF, accepts optional metadata, retains failed edits, navigates after success and requires a PDF for creation. Repository/API is mocked in this screen test. |
| Dynamic chapter material rows | Real editor/Core Formik controls verify add/remove preserve typed values and submitted row indexes; nested conditional validation reads each row; successful chapter creation reloads the list. Repository is mocked. |
| Complete country/branch lookup options | Shared pagination helper reads every server page at size 50, rejects errors/invalid metadata and stops on cancellation. Country and branch controls use it. |
| Shared role routes | Real Core routing test verifies the same URL chooses the admin, teacher, student, parent or root layout, rather than the first registered role. Guards remain active for other roles. |
| Teacher lookup/roster access | Course picker uses the existing teacher API. New teacher class and enrollment APIs enforce class ownership and school scope; isolated authenticated HTTP tests prove own-class reads, unrelated-teacher rejection and continued denial of admin endpoints. Teacher attendance/grade entry read all pages and cancel abandoned roster loads. Subject-course ownership and full populated screen saves need further coverage. |
| School admin year selector | Browser found root-only calendar-year call returning 403. Replaced it with the shared `/main/calendarYears` endpoint, reading all pages. |

| Saved reference selections | Actual react-select and six domain controls resolve saved IDs absent from the first page, retain selections during search, ignore stale results, cancel abandoned work and settle failed searches. Tests also exercise teacher-only APIs and account-scope cache isolation. |
| Teacher/student reference permissions | Teacher student list/detail reads use the teacher API; an omitted class filter no longer becomes an empty GUID filter. Shared teacher references return only IDs and names for the authenticated school, enabling parent/student counseling requests without admin-profile access. Isolated HTTP tests cover scoped reads, cross-school rejection and the minimal response shape. |
| Offline paginated tables | Cache snapshots retain pagination headers; tests compare online/offline rows and page counts. Failed mutations and authoritative HTTP errors still reject. |
| Teacher/parent profile edits | Rendered forms preserve postal code, district and address type that the editor does not expose; failed saves keep the draft; successful responses immediately refresh the shared user session and displayed name while retaining country details. This screen test mocks the persistence API. |
| School signup and address payloads | Rendered signup wizard keeps school country separate from phone country, advances on Enter, blocks pending duplicates and retains rejected drafts. An actual multipart HTTP/PostgreSQL test reads back school/phone country, postal code/address type and a verified password hash. Legacy requests derive the missing school country from phone country; invalid country IDs reject before writing. School-profile/signup multipart payloads include address type; signup also forwards a supplied district. |
| Literal password confirmation | School registration, root-user creation and legacy password changes compare confirmation literally. Tests cover regex metacharacters, invalid regex syntax and mismatched confirmations; a password containing `[` also succeeds through real school-registration HTTP. |
| School activation at authentication | Inactive schools cannot authenticate; teacher/student/parent logins require active accounts and active schools. Core JWT validation rejects previously issued school-bound tokens on subsequent requests while the school is inactive. Isolated PostgreSQL/HTTP tests cover all four school roles, active-login success, inactive-school 401s, old-token rejection, reactivation, inactive individual accounts, wrong passwords and independent root access. Support creation retains its active-school check; the earlier exception was reverted to follow the corrected policy. |

## Reproducible checks

- `bash scripts/check-data-flows.sh`: shared foundations, rendered assignment/library/chapter/profile/signup screens, reference selectors and isolated PostgreSQL backend tests.
- `node scripts/check-pdf-exports.cjs`: existing table/date/filter/export, person-country composition and module regressions. This is additional regression coverage, not whole-app persistence proof.
- `node scripts/check-core-components.mjs`: shared UI reuse.
- `node scripts/tests/information.cjs`: rendered support submission, table history and review, plus the information pages/menu regressions. Support persistence and inactive-school coverage run in the PostgreSQL suite above.
- `LOGIN_TEST_EMAIL=... LOGIN_TEST_PASSWORD=... LOGIN_TEST_ORIGIN=http://localhost:3002 node scripts/tests/table-routes-browser.cjs`: read-only local browser route audit. Optional `AUDIT_ROUTES` comma-separated paths and `AUDIT_BROWSER_OUTPUT` JSON destination. Do not use real credentials against a production SPA build.

## Runtime evidence and limits

On 2026-10-17 the live API advertised both GET and POST `/api/support-requests`; authenticated demo requests reached validation rather than returning a route-level 404. A read-only database check identified `school@digitalmaktab.com` as inactive, explaining its valid submissions hitting the repository's activation check. The user clarified that inactive schools must not be able to log in. The earlier support exception was therefore reverted, and activation is enforced at login and shared JWT validation instead. Verification uses an isolated database, without changing the user's school status or submitting diagnostic support messages. Package changes require an API restart.

A source-to-live-Swagger comparison reviewed 380 shared API call sites across the SPA shell, Core and installed country packages (386 URL patterns after literal-union expansion). Constant URL prefixes and dynamic path segments were included. The sole remaining apparent mismatch, `PUT /api/school`, is implemented by the optional `{schoolId?}` route; an invalid authenticated request reached validation (400), confirming that base path exists. The 13 dynamically selected reference-list URLs were checked individually against the live API. No additional missing route/method pair was found in this review. This checks route presence, not successful persistence or authorization for every payload and account; resource-level 404s still require endpoint-specific fixtures. Separate external library services and asset fetches are outside this API route comparison.

The initial authenticated read-only browser sweep visited 41 Austria admin sidebar routes and 47 Afghanistan admin routes. Its only HTTP failures were the year selector's root-only endpoint. The initial counter included startup traffic, so it cannot establish idle-loop failures. A separate settled-window check of graduation, co-curricular, notifications and messages found no repeated idle requests. The corrected admin year selector and new student/teacher forms were rechecked without HTTP failures. A subsequent teacher/parent sweep exposed shared routes incorrectly choosing the admin guard and teacher selectors calling admin endpoints; those findings drove the Core routing and scoped teacher API corrections above. After the route correction, all 14 parent and 17 teacher sidebar URLs resolved to their intended pages, without repeated settled traffic. The parent child-table class filter initially made an admin lookup; it now uses only the linked children's class options and was rechecked without HTTP failures. New teacher class endpoints are verified in the isolated HTTP suite; the user's running API still needs a restart and returned 404 for those new routes during the last browser sweep. The browser script now distinguishes startup and settled traffic. Redirects must be inspected as failures, not counted as successful page rendering. It records empty tables and HTTP failures; an empty demo table does not prove row rendering.

## Remaining work before completion

- Finish manual mutation handler and DTO field mapping review across all inventoried forms, including standalone modals and country modules.
- Verify save/read-back for remaining endpoints and role-specific flows using isolated records/databases; newly enabled validators need valid-flow checks as well as rejection checks.
- Verify all tables with populated fixtures, current page and applied filters after each mutation; include nested modals, exports and country-specific columns.
- Complete settled browser checks across admin, teacher, parent, student and root roles. Parameterized routes need seeded context, not just sidebar crawling.
- Async lookup saved-ID/search tests now cover all six Core async domain controls. Inspect remaining non-async reference controls for partial results and verify populated country-module forms with these controls.
- Offline page metadata is covered by the shared adapter test; verify remaining modal error handling and array/file form behavior at other call sites.
- Keep the active goal open until these requirements have direct evidence. No broad completion claim follows from a source inventory or green foundation suite.

Package updates require `scripts/sync-spa.sh` / `scripts/sync-dotnet.sh`, followed by the user's SPA/API dev-server restarts. Local temporary verification servers must be stopped after use.
