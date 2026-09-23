# Multi-Repo Split — Handoff & Ongoing Workflow

**Status:** the split has been executed locally. Six sibling repos exist alongside the current monorepo. This document tells you what happened, how to push them to GitHub, how to work in the new layout day-to-day, and what's left.

---

## What was extracted

Six new local git repos at `/Users/dahee/Desktop/projects/`:

| Directory | Content | Distributed as |
|---|---|---|
| `digitalmaktab-core/` | `DigitalMaktab.Core.Abstractions` + `DigitalMaktab.SDK` + `DigitalMaktab.Core` | NuGet packages |
| `digitalmaktab-api/` | `DigitalMaktab.Api` (ASP.NET host) | Docker image / binary |
| `digitalmaktab-country-afghanistan/` | Afghanistan country module | NuGet package |
| `digitalmaktab-spa/` | React SPA | Static bundle / npm |
| `digitalmaktab-desktop/` | Electron desktop client | Installer |
| `digitalmaktab-docs/` | Design docs (globalization.md and others) | Rendered site later |

**Git history was preserved via `git subtree split` per project path.** Each new repo has the commits that ever touched its files, from `26df06e` (project baseline) through `de47378` (Phase A step 5).

**The current monorepo (`digitalmaktab/`) is untouched.** Treat it as a historical snapshot; delete it whenever you're happy with the new repos.

---

## Verified so far

- `digitalmaktab-core` builds standalone (`dotnet build DigitalMaktab.Core.sln`).
- `digitalmaktab-core` packs to 3 NuGets (Core.Abstractions, SDK, Core) at version `0.1.0-alpha`.
- `digitalmaktab-country-afghanistan` builds standalone using **PackageReference** on Core NuGets from the shared local feed at `../.nuget-local/` — no ProjectReference to Core anymore.
- `digitalmaktab-api` builds standalone using PackageReference on both Core + Country.Afghanistan.
- `digitalmaktab-api` runs end-to-end: `dotnet run` in that repo → API listens on `:5000` → `/api/main/countries`, `/api/auth`, `/api/school/dashboard` all return 200. Startup log confirms Solar Hijri and Gregorian calendar providers both resolve through the resolver.

---

## What you need to do to push these to GitHub

Each new repo has one initial local commit chain and no remote. You need to:

### 1. Create the empty GitHub repos

Under the `DigitalMaktab` org (or wherever you want them), create six empty repositories with these names — no README, no gitignore, no license (all handled locally):

- `digitalmaktab-core`
- `digitalmaktab-api`
- `digitalmaktab-country-afghanistan`
- `digitalmaktab-spa`
- `digitalmaktab-desktop`
- `digitalmaktab-docs`

### 2. Push each local repo

For each:

```bash
cd /Users/dahee/Desktop/projects/digitalmaktab-core
git remote add origin git@github.com:DigitalMaktab/digitalmaktab-core.git
git branch -M main
git push -u origin main
```

Repeat for the other five (swap the repo name in both places).

### 3. Set up GitHub Packages auth for local dev

The country and api repos reference private NuGets from the DigitalMaktab GitHub Packages feed. Your local machine needs a Personal Access Token with `read:packages` scope to pull them:

1. GitHub → Settings → Developer settings → Personal access tokens → **classic** → generate one with `read:packages` (+ `write:packages` if you want to publish locally).
2. Add it to `~/.nuget/NuGet.config`:
   ```xml
   <configuration>
     <packageSources>
       <add key="github" value="https://nuget.pkg.github.com/DigitalMaktab/index.json" />
     </packageSources>
     <packageSourceCredentials>
       <github>
         <add key="Username" value="YOUR_GITHUB_USERNAME" />
         <add key="ClearTextPassword" value="ghp_YOUR_TOKEN_HERE" />
       </github>
     </packageSourceCredentials>
   </configuration>
   ```
3. In CI, the workflows already use `${{ secrets.GITHUB_TOKEN }}` — no setup needed once the repos are on GitHub.

### 4. First release of the packages

```bash
cd digitalmaktab-core
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

The `publish.yml` action packs and publishes to GitHub Packages. Repeat for `digitalmaktab-country-afghanistan` once it's on origin.

---

## Day-to-day dev workflow

### Scenario A: work on one country only (Afghan team)

```bash
git clone git@github.com:DigitalMaktab/digitalmaktab-country-afghanistan.git
cd digitalmaktab-country-afghanistan
dotnet restore                        # pulls Core.Abstractions + SDK from GH Packages
dotnet build
dotnet test
```

They never touch Core, Api, SPA, or other countries. When they need a Core.Abstractions bump, they either wait for a release or contact the platform team.

### Scenario B: work on core + a country at the same time (platform team iterating)

Reason we set up the shared local feed at `../.nuget-local/` — it lets you iterate cross-repo without pushing packages to GH Packages:

```bash
# Change something in digitalmaktab-core
cd digitalmaktab-core
# edit code...
dotnet pack -c Release -o ../.nuget-local   # local feed gets a fresh 0.1.0-alpha nupkg

# The consuming repo now sees the new package on the next restore.
cd ../digitalmaktab-country-afghanistan
rm -rf obj bin                              # force restore to re-resolve
dotnet restore
dotnet build
```

Both repos' `NuGet.config` list `../.nuget-local` as a package source, so this Just Works.

Advanced: for tight iteration, temporarily swap a PackageReference for a ProjectReference — commit revert before pushing.

### Scenario C: bump Core.Abstractions with a breaking change

1. In `digitalmaktab-core`, bump `<Version>` in the relevant csproj (e.g. `0.2.0-alpha` for pre-release, or `2.0.0` for major).
2. Tag + push → GH Action publishes.
3. In each downstream repo (`digitalmaktab-api`, `digitalmaktab-country-*`), update `<PackageReference Version="…">`, resolve any breaking changes, commit + push.

This is the coordinated release ceremony that was invisible before.

---

## The shared local feed

`/Users/dahee/Desktop/projects/.nuget-local/` currently holds:

- `DigitalMaktab.Core.Abstractions.0.1.0-alpha.nupkg` (+ .snupkg)
- `DigitalMaktab.SDK.0.1.0-alpha.nupkg` (+ .snupkg)
- `DigitalMaktab.Core.0.1.0-alpha.nupkg` (+ .snupkg)
- `DigitalMaktab.Country.Afghanistan.0.1.0-alpha.nupkg` (+ .snupkg)

Every consuming repo has `../.nuget-local` in its `NuGet.config` package sources. `.gitignore` in each repo excludes `.nupkg` / `.snupkg`, so packages stay local.

---

## What's still monolithic (deliberate)

- **`docs/globalization.md`** was extracted to `digitalmaktab-docs`, but also stays in the monorepo for now as reference. Delete from monorepo when you're happy with the new location.
- **`.env`** was carried over into `digitalmaktab-api/.env` (still gitignored). Any secrets/env should stay in whichever local clone the operator uses.

## Known gaps

1. ~~**`AddScheduleDto.cs` mis-classified DTO**~~ — **closed** by `digitalmaktab-core` commit `39bfdbc` (moved to `Dtos/`, namespace updated to `digitalmaktabapi.Dtos`).
2. **Repository interfaces (`IStudentRepository` etc.)** are in `Core/Data/`, not Abstractions. Moving them requires either generic-ifying (`IRepository<T>`) or moving the DTOs they reference (`SchoolDashboardDto`). Deferred to Phase B.
3. **Namespaces still `digitalmaktabapi.*`** across all extracted repos. Rename to `DigitalMaktab.Core.*`, `DigitalMaktab.Api.*`, etc. is a separate follow-up commit per repo.
4. **`digitalmaktab-desktop`** currently has one commit (its extraction commit) — its subtree only picked up the "chore: add desktop app scaffold" ancestor because that's the only history that touched `digitalmaktabdesktop/` in the monorepo.
5. ~~**CI on api repo doesn't build a Docker image yet**~~ — **closed** by `digitalmaktab-api` commit `9b2bf7f` (docker job builds + pushes to ghcr.io on main).
6. **No published version yet** — everything is at `0.1.0-alpha`. First real cut = tag `v0.1.0` (or whatever) in `digitalmaktab-core`, let the workflow publish.

## Undoing

If any of this went sideways and you want to abandon the split:

```bash
rm -rf /Users/dahee/Desktop/projects/digitalmaktab-{core,api,country-afghanistan,spa,desktop,docs}
rm -rf /Users/dahee/Desktop/projects/.nuget-local
cd /Users/dahee/Desktop/projects/digitalmaktab
git branch -D split-abstractions split-core split-sdk split-afghanistan split-api split-spa split-desktop split-docs
```

The monorepo is untouched throughout. Nothing above deletes anything you can't recreate.
