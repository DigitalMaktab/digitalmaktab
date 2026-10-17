# Dynamic school access management

Status: completed. User-requested goal, 2026-10-17; verified 2026-10-18.

Deliver a complete school workflow: define dynamic roles, register staff (including assistants), assign roles to uniquely identified staff, sign in and enforce only assigned school capabilities in API and SPA. Existing built-in identities remain supported. Follow Core primitives, country/school module boundaries, localized validation, tenant isolation, paged/filterable tables and local commits.

Acceptance: role/staff create/edit/deactivate and guarded deletion; duplicate names allowed for people but email identifies accounts; assignments are by immutable IDs; server-authoritative permission catalog; live permission changes and inactive account/school rejection; permitted pages/actions and denied direct API access; reset/change password; country composition; meaningful isolated persistence, authorization and UI tests; package sync and local commits.

The thread goal tool could not register this new goal because the earlier unfinished form/table audit remains usage-limited. This document records the new objective without marking the earlier audit complete.


## Delivered workflow

1. A school administrator opens `/custom-roles`, creates a named role and checks
   its permissions. Prerequisites are selected visibly for review.
2. Under Staff (also available at `/school-staff`), register the assistant with
   their name, unique email and initial password, then select one or more roles.
   People with the same name remain distinguishable by email and record ID.
3. The assistant signs in through the usual login and lands on `/staff-home`.
   Navigation and actions follow assigned permissions. A staff account with no
   permissions can still access its own profile and change its password.
4. Edit role permissions or staff assignments to change access. The server uses
   current assignments on every request; the SPA refreshes on focus, manual
   refresh, and permission failures. Deactivate an account to block login and
   existing tokens. Assigned roles cannot be deleted until assignments are removed.
5. Use the shared reset-password confirmation/reveal flow to rotate a forgotten
   password. Old sessions are invalidated and the temporary-password banner is
   restored. Self-service change/reset also supports staff.

## Implementation boundaries

Core owns accounts, assignments, the capability catalog, validation, persistence,
localized UI and enforcement. Built-in identity types continue to work. Country
and school modules opt into staff access using their existing module registration:
SPA route/editor `capabilities` and backend `SchoolCapability` attributes. Afghan
student/teacher extensions, academic years, examination periods, ministry reports,
attachments and transfer dossiers declare their own requirements. Austria does not
activate the Afghanistan module.

The additive `AddDynamicSchoolStaff` migration adds staff/assignment tables,
normalized role names and concurrency versions. It preserves existing country and
legacy student tables. New APIs use no-store responses and school-scoped queries;
composite foreign keys prevent cross-school assignments. Staff call access checks
live permissions and restricts rooms/peers to the selected school conversation.

## Verification and local use

- `scripts/tests/run-core-support-postgres.sh`: isolated PostgreSQL and HTTP tests
  for registration, login, live permissions, tenant isolation, migration upgrade,
  concurrency conflicts, deactivation, self-service/admin password changes and
  call-room authorization, alongside existing Core tests.
- `scripts/tests/dynamic-school-access.cjs`: real Core forms, tables and API
  wrappers; validation, failed draft retention, single pending submit, duplicate
  names, immutable assignments, reset/reveal, and permission checks.
- `scripts/check-pdf-exports.cjs`: shared table/export/calendar/module regression
  suite, including staff navigation, country isolation and print preferences.
- TypeScript compilation, locale/enum checks and `scripts/sync-all.sh` verify
  package consumers and translations.

After the package sync, restart `dotnet watch run` in the API and `npm start` in
SPA. The API applies the migration at startup. Existing development processes do
not reload replaced dependency packages automatically. Test staff accounts live
only in the isolated test database; create real staff through the page.


Final checks: 47/47 Core tests and 76/76 isolated Afghanistan integration tests
passed. The broader Afghanistan suite passed 77 unit tests (its three database
cases were also exercised through the isolated script above). All eight form/data
flow scripts and the full 92-site table/PDF regression suite passed. SPA type
checking, enum agreement, frontend/backend locale parity and mobile localization
coverage passed. All packages were synced; local commits are saved across every
affected repository without pushing. Restarting the developer-owned API/SPA is
still required to serve the packages; no real staff account was inserted into
the developer database.
