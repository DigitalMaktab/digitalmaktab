# CLAUDE.md — Ground rules for every session on this codebase

This file collects the persistent instructions the human has given across
sessions. Every future Claude working on this repo must read this first
and follow every rule. Golden rules are non-negotiable.

## Repos on disk (multi-repo, local commits only)

Working tree is a set of sibling directories under
`/Users/dahee/Desktop/projects/`:

- `digitalmaktab/` — this monorepo stub (scripts + docs).
- `digitalmaktab-core/` — backend .NET packages
  (`DigitalMaktab.Core.Abstractions`, `DigitalMaktab.Core`,
  `DigitalMaktab.Core.SDK`). Packed as NuGet packages.
- `digitalmaktab-api/` — ASP.NET Core web host that consumes the Core
  NuGet packages.
- `digitalmaktab-country-afghanistan/` — Afghanistan backend country
  module (`DigitalMaktab.Country.Afghanistan`). TPT extensions on
  Core.Student / Core.Teacher + Ministry report generation. Packed
  as a NuGet package.
- `digitalmaktab-spa-core/` — shared React/TypeScript component library
  (`@digitalmaktab/spa-core`). Packed as an npm tarball.
- `digitalmaktab-spa-country-afghanistan/` — Afghanistan country module
  (`@digitalmaktab/spa-country-afghanistan`) with the fa-AF + ps-AF
  translation bundles and country-specific grading. Also packed as a
  tarball. Additional country packages
  (`digitalmaktab-spa-country-<name>/`) follow the same shape.
- `digitalmaktab-spa-sdk/` — thin SPA SDK layer.
- `digitalmaktab-spa/` — the shell CRA app.
- `digitalmaktab-desktop/` — Electron report generator (standalone
  app, no coupling to the API — reads exported data). Its own
  package.json + tsc.
- `digitalmaktab-docs/` — cross-repo markdown docs
  (globalization.md, MULTI-REPO.md, HOWTO-ADD-COUNTRY*.md, etc.).
  No build.
- `digitalmaktab-mobile-sdk/` — type-only extension contract for
  the React Native apps (`@digitalmaktab/mobile-sdk`). Mirror of
  the spa-sdk shape but for RN.
- `digitalmaktab-mobile-country-afghanistan/` — Afghan country
  module for the RN apps (`@digitalmaktab/mobile-country-afghanistan`):
  Solar Hijri calendar, Afghan grading, en-US + fa-AF + ps-AF
  translations, teal brand palette.
- `digitalmaktab-mobile-parent/` — React Native (Expo) parent app
  consuming `-mobile-sdk` + `-mobile-country-afghanistan`.
- `digitalmaktab-mobile-student/` — React Native (Expo) student
  app, same consumer shape as the parent app.

Repo discovery is automated — `scripts/install-hooks.sh` and
`scripts/health-check.sh` enumerate siblings matching `digitalmaktab`
or `digitalmaktab-*` with a `.git/`, so a new country package or
microservice slots in on next bootstrap with zero config edits.

**Multi-repo commit rule (GOLDEN):** commit locally in every affected
repo. Do NOT push to any remote unless the human explicitly asks — they
create GitHub remotes on their own.

## Golden rules — do not violate

1. **Extend core, don't fork.** Every new feature MUST use the
   `@digitalmaktab/spa-core` primitives and the shared Core NuGet
   modules. If the primitive you need doesn't exist, add it to
   `spa-core` first, then use it. Same on the backend — extend Core
   before writing bespoke logic in the API or a screen. Violations
   surface as inline styles + parallel markup / duplicated services;
   flag and fix on sight.

2. **Reuse existing components.** For new UI/services always extend
   `AppTable`, `AppModal`, `AppButton`, `AppCard`, `AppCheckbox`,
   `AppForm*`, `BaseController`, etc. Never render raw `<table>` /
   `<input type="checkbox">` / duplicate a repository class. If
   `AppTable`'s built-ins are missing something, extend `AppTable`.

3. **Translate everything (GOLDEN — human has asked repeatedly).**
   Every new string, on every tier, must land in all three
   supported locales:
   - Frontend base (en-US) → `digitalmaktab-spa-core/src/locales/en-US/translation.json`
   - Frontend country locales →
     `digitalmaktab-spa-country-afghanistan/src/locales/{fa-AF,ps-AF}/translation.json`
     (and any additional country modules that ship translations)
   - Mobile locales → `digitalmaktab-mobile-country-afghanistan/src/locales/{en-US,fa-AF,ps-AF}/translation.json`
     (mobile ships all three in one package — no core/country split
     like the SPA has). `check-mobile-i18n.sh` enforces coverage.
   - Backend → `Resources/Localization/Controllers/*.resx` +
     `.fa-AF.resx` + `.ps-AF.resx` per controller.
   Never leave a screen rendering a raw key like `foo.bar.label`.
   `check-i18n-parity.sh --strict` runs in pre-commit on every
   repo and refuses the commit on any gap.

4. **Per-controller / per-screen localizer.** Never dump every string
   into `MainController` on the backend. Each controller gets its own
   `IStringLocalizer<TController>` + its own `.resx` set. On the
   frontend, each screen owns its own JSON namespace under
   `translation.json`.

5. **AppTable is the only table.** No raw `<table>` in any screen —
   ever. Extend `AppTable` if it lacks a feature. Every admin table
   MUST match the `StudentList` shape: show/hide filter, row actions,
   toolbar actions, export. Tables also expose:
   - Double-click a row → opens the detail/edit view.
   - Right-click → context menu.
   Every table filter, including API scope selectors, belongs in the shared
   filter panel: use column filters or `filterControls` (draft values, Apply,
   Reset). `scopeControls` is for non-filter context/actions only. Forward all
   applied criteria to paged/export loaders; keep the table mounted on empty
   results so filters remain accessible.
   Use these where they apply. **Confirmation for destructive actions
   is mandatory** — use `AppModal` (there's a built-in confirm on
   `AppTable`'s delete flow).

6. **Loop cycles: finish carryovers first.** Every cycle starts by
   closing any half-shipped work from the previous cycle before
   touching a new feature. Never leave a feature half.

7. **Multi-repo, commit locally, don't push.** Restated because the
   human has reminded me many times.

## Module composition (countries and schools)

- Installed SPA packages export `ApplicationModule` from spa-core, extending
  the type-only spa-sdk `ModuleDefinition`. Register them in
  `digitalmaktab-spa/src/plugins/modules.ts`.
- Core's `ApplicationModuleProvider` activates modules by school country and
  school ID, then composes routes, sidebar items, editor tabs, person/table
  columns, row transformations, translations, languages, calendar and grading.
  School contributions take precedence over country contributions.
- `AppTable` supports `moduleTableKey` and module-defined table behavior. Keep
  all custom UI on Core primitives; module DTOs/domains stay in their package.
- Backend modules extend SDK `CountryModuleBase` / `SchoolModuleBase` and
  register through `AddDigitalMaktabModule`. Core discovers their controllers,
  model configurations and mapper profiles, and enforces their country/school
  target. Module-owned records use `ModuleEntity` or `IModuleSchoolEntity` for
  tenant filtering and write protection. Background work uses a scoped
  `ModuleTenantContext` binding.
- Afghanistan is the working reference. Additional country and school packages
  follow the same contract; no lower-module implementation belongs in Core.
- Backend calendars continue to use `ICalendarProvider` +
  `ICalendarProviderResolver` in Core.Abstractions. Gregorian is in Core;
  Solar Hijri belongs to Afghanistan.
- See `digitalmaktab-docs/HOWTO-ADD-COUNTRY.md` and
  `HOWTO-ADD-COUNTRY-SPA.md` for current registration examples.

## Dev workflow — build + install ritual (READ CAREFULLY)

Because packages are consumed via **tarball install** (not `npm link`),
changes to SDK, `spa-core`, country or school packages do NOT hot-reload
into the running `npm start`. Use the automation scripts:

```bash
./scripts/sync-dotnet.sh   # Core.Abstractions + Core + Afghan .NET → API
./scripts/sync-spa.sh      # SDK + spa-core + country/school modules → SPA
./scripts/sync-all.sh      # both of the above in order
```

The scripts replay the full pack-and-swap ritual (clean+build+pack
each affected project, wipe the NuGet / npm caches those three
packages live in, swap the fresh tarballs into every consumer's
`node_modules`, clear CRA's webpack cache). They exit on first error
so a half-swap never silently lands.

**Auto-sync on `git pull`.** `scripts/install-hooks.sh` wires a
`post-merge` hook into every repo that invokes the right sync
script when a pull brings in files other repos consume. So a
`git pull` in `digitalmaktab-core` auto-runs `sync-dotnet.sh`;
a pull in `digitalmaktab-spa-core` auto-runs `sync-spa.sh`. Skip
with `SKIP_AUTO_SYNC=1 git pull` for a fast pull without the pack
cycle.

**One-command local dev**: `./scripts/dev-up.sh` starts the API,
SPA shell, and both watchers (`watch-dotnet.mjs` + `watch-spa.mjs`)
under one supervisor. Each child's output gets a `[label]` prefix
so the multiplexed stream stays legible; Ctrl+C tears every child
down cleanly (process-group kill). All-or-nothing: a child dying
on its own tears the rest down too so you never end up with 'the
watcher is dead but you still see the stale shell.'

CRITICAL (encoded in `sync-dotnet.sh`): `dotnet pack` may reuse a
stale `bin/` DLL if MSBuild's incremental cache thinks the assembly is
current — the packed nupkg then contains an OLD DLL and startup throws
`TypeLoadException` at DI registration. The script always runs
`dotnet clean -c Release && dotnet build -c Release` before each pack
to defeat this.

**Then — CRITICAL — the human must restart the dev servers.** CRA's
`react-scripts start` does not watch node_modules for JSON changes, so
the swapped translation bundles + component code stay stale in the
served webpack bundle until:

- Ctrl+C in `digitalmaktab-spa` terminal, then `npm start` again.
- Restart `dotnet watch run` in `digitalmaktab-api` for new
  Core-package DLLs to be picked up (`dotnet watch` does not detect
  transitive package DLL swaps).

Hard-refreshing the browser is NOT sufficient — the stale bundle is
in the dev server's memory, not the browser's cache. Any time a user
reports "translation not showing", "new component not appearing",
"endpoint not found", the answer is almost always: **restart
`npm start` and/or `dotnet watch run`**.

## Dev-only demo login accounts

Seeded automatically in Development env by `Seeder.SeedDevAccounts`.
All share password `Demo@1234`:

- ADMIN → `admin@demo.local`
- TEACHER → `teacher@demo.local`
- PARENT → `parent@demo.local`

Idempotent — skipped if the Demo School row already exists. Gated
behind `IsDevelopment()` so it cannot leak into staging/prod.

Root account (seeded from config): `root@digitalmaktab.com` with
password from the `RootUserPassword` config value.

## Commit hygiene

- One commit per affected repo per cycle.
- Commit messages: short subject explaining the "why", not the "what".
- Every commit ends with the Claude Code coauthor trailer.
- Never `git push` unless the human explicitly says so.

## When the human types `/loop`

- Fixed-interval mode: create the cron via `CronCreate` (session-only,
  auto-expires after 7 days), then execute the parsed prompt
  immediately.
- Read the loop skill instructions on first invocation — don't guess
  the schedule dance.

## Anti-patterns to flag

- Raw `<table>` / `<input type="checkbox">` / inline hex colors.
- New string that isn't in en-US + fa-AF + ps-AF.
- Direct DB access in a controller instead of a repository.
- Adding to `MainController` instead of a feature-specific controller.
- Skipping the pack + swap ritual after changing spa-core.
- Pushing to any git remote.
