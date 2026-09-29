# CLAUDE.md — Ground rules for every session on this codebase

This file collects the persistent instructions the human has given across
sessions. Every future Claude working on this repo must read this first
and follow every rule. Golden rules are non-negotiable.

## Repos on disk (multi-repo, local commits only)

Working tree is a set of sibling directories under
`/Users/dahee/Desktop/projects/`:

- `digitalmaktab/` — this monorepo stub (mostly docs).
- `digitalmaktab-core/` — backend .NET packages
  (`DigitalMaktab.Core.Abstractions`, `DigitalMaktab.Core`,
  `DigitalMaktab.Core.SDK`). Packed as NuGet packages.
- `digitalmaktab-api/` — ASP.NET Core web host that consumes the Core
  NuGet packages.
- `digitalmaktab-spa-core/` — shared React/TypeScript component library
  (`@digitalmaktab/spa-core`). Packed as an npm tarball.
- `digitalmaktab-spa-country-afghanistan/` — Afghanistan country module
  (`@digitalmaktab/spa-country-afghanistan`) with the fa-AF + ps-AF
  translation bundles and country-specific grading. Also packed as a
  tarball. Additional country packages
  (`digitalmaktab-spa-country-<name>/`) follow the same shape.
- `digitalmaktab-spa-sdk/` — thin SPA SDK layer.
- `digitalmaktab-spa/` — the shell CRA app.

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
   Every new string, both frontend AND backend, must land in all three
   supported locales:
   - Frontend base (en-US) → `digitalmaktab-spa-core/src/locales/en-US/translation.json`
   - Frontend country locales →
     `digitalmaktab-spa-country-afghanistan/src/locales/{fa-AF,ps-AF}/translation.json`
     (and any additional country modules that ship translations)
   - Backend → `Resources/Localization/Controllers/*.resx` +
     `.fa-AF.resx` + `.ps-AF.resx` per controller.
   Never leave a screen rendering a raw key like `foo.bar.label`.

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
   Use these where they apply. **Confirmation for destructive actions
   is mandatory** — use `AppModal` (there's a built-in confirm on
   `AppTable`'s delete flow).

6. **Loop cycles: finish carryovers first.** Every cycle starts by
   closing any half-shipped work from the previous cycle before
   touching a new feature. Never leave a feature half.

7. **Multi-repo, commit locally, don't push.** Restated because the
   human has reminded me many times.

## SPA composition (per-country modules)

The SPA imports translations + grading via the country module system:

- `digitalmaktab-spa/src/locale/i18n.ts` imports `enUS` from spa-core
  and spreads `afghanistanModule.translations` from
  `spa-country-afghanistan`.
- Adding a country = new sibling repo mirroring
  `spa-country-afghanistan/` (see `docs/globalization.md` for the plan
  the human sketched). Country modules export `{ code, defaultLanguage,
  supportedLanguages, translations, grading }`.
- Backend country-specific logic uses `ICalendarProvider` +
  `ICalendarProviderResolver` in `DigitalMaktab.Core.Abstractions/Countries/`
  — one implementation per `CalendarSystem` (Gregorian in Core, Solar
  Hijri in `DigitalMaktab.Country.Afghanistan`).

## Dev workflow — build + install ritual (READ CAREFULLY)

Because packages are consumed via **tarball install** (not `npm link`),
changes to `spa-core` or `spa-country-afghanistan` do NOT hot-reload
into the running `npm start`. The ritual per-cycle when you touch
either:

```bash
# 1. Backend Core: pack BOTH .Abstractions and .Core (they're separate
#    NuGet packages — .Core references .Abstractions transitively, but
#    the API consumes them independently, so leaving .Abstractions
#    stale after editing a POCO throws
#    "Could not load type DigitalMaktab.Core.Models.<X>" at API
#    startup).
#
#    CRITICAL: `dotnet pack` may reuse a stale bin/ DLL if MSBuild's
#    incremental cache thinks the assembly is current — the packed
#    nupkg then contains an OLD DLL and startup throws
#    "Method 'Foo' does not have an implementation" (a
#    TypeLoadException at DI registration). Force a clean rebuild
#    before pack whenever an interface member changes: `dotnet clean
#    -c Release && dotnet build -c Release && dotnet pack --no-build`.
#    Same for the country .NET package below.
cd digitalmaktab-core && dotnet clean -c Release && dotnet build -c Release
cd digitalmaktab-core && dotnet pack src/DigitalMaktab.Core.Abstractions/DigitalMaktab.Core.Abstractions.csproj -c Release --no-build -o ../.nuget-local
cd digitalmaktab-core && dotnet pack src/DigitalMaktab.Core/DigitalMaktab.Core.csproj -c Release --no-build -o ../.nuget-local
cd ../digitalmaktab-country-afghanistan && dotnet clean -c Release && dotnet build -c Release && dotnet pack -c Release --no-build -o ../.nuget-local
rm -rf ~/.nuget/packages/digitalmaktab.core ~/.nuget/packages/digitalmaktab.core.abstractions ~/.nuget/packages/digitalmaktab.country.afghanistan
dotnet nuget locals http-cache --clear
cd ../digitalmaktab-api && dotnet restore --force --no-cache

# 2. spa-core → build + pack + hand-swap into the SPA's node_modules
cd ../digitalmaktab-spa-core && npm run build && npm pack --pack-destination ../.npm-local
rm -rf ../digitalmaktab-spa/node_modules/@digitalmaktab/spa-core /tmp/dm-extract
mkdir -p /tmp/dm-extract && cd /tmp/dm-extract && tar -xzf ../../.npm-local/digitalmaktab-spa-core-0.1.0-alpha.tgz
mv package ../digitalmaktab-spa/node_modules/@digitalmaktab/spa-core

# 3. spa-country-afghanistan → same pattern
cd ../digitalmaktab-spa-country-afghanistan && npm run build && npm pack --pack-destination ../.npm-local
rm -rf ../digitalmaktab-spa/node_modules/@digitalmaktab/spa-country-afghanistan /tmp/dm-country
mkdir -p /tmp/dm-country && cd /tmp/dm-country && tar -xzf ../../.npm-local/digitalmaktab-spa-country-afghanistan-0.1.0-alpha.tgz
mv package ../digitalmaktab-spa/node_modules/@digitalmaktab/spa-country-afghanistan

# 4. Clear CRA's webpack cache — it memoizes module-resolution maps
#    from the last dev-server run, so a new export in spa-core
#    reads as "not exported" until the cache is dropped.
rm -rf ../digitalmaktab-spa/node_modules/.cache

# 5. Type-check the SPA
cd ../digitalmaktab-spa && npx tsc --noEmit
```

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
