# Render deployment

Digital Maktab runs on Render as one Docker web service, `digitalmaktab`, which
serves both the API and the SPA from the same origin. Its database is a
separate Render Postgres instance, `digitalmaktab-db`. The service is defined by
the monorepo's root `Dockerfile`.

| Resource | Render name | Plan |
| --- | --- | --- |
| API + SPA (Docker) | `digitalmaktab` | Starter, 1 GB disk at `/var/data` |
| PostgreSQL 16 | `digitalmaktab-db` | Basic 256 MB |

The mobile apps (Expo), the desktop report generator (Electron) and the marketing
videos (Remotion) are not web services, so they are not hosted on Render.

## Publishing

```bash
./deploy/render/publish.sh
```

The script:

1. Pushes each sibling repo's **committed** `HEAD` to `origin/main`.
   Uncommitted changes are reported and stay local.
2. Writes those exact commits to `versions.env`.
3. Commits `versions.env` to this repo and pushes it.
4. Asks Render to deploy that commit, then waits for `/health/ready`.

Requirements:

- the `gh` CLI, logged in
- `~/.config/digitalmaktab/render.env` containing `RENDER_API_KEY=...`

The file is outside every repo, so the key is never committed.

## How the image is built

- `fetch.sh` clones every repo listed in `versions.env` at its pinned commit.
  - It authenticates with per-repo, read-only GitHub deploy keys.
  - The keys come from the Render secret file `deploy_keys`, mounted as a
    BuildKit secret. They are not baked into any image layer.
  - Run `./deploy/render/publish.sh --setup-keys` to rotate the keys or to add a
    new repo.
  - New repos must also be added to `REPOS` in `publish.sh`.
- `build.sh` follows the same steps as `scripts/sync-dotnet.sh` and
  `scripts/sync-spa.sh`:
  - It packs Core, SDK and every `digitalmaktab-country-*` module into a private
    feed.
  - It publishes the API.
  - It packs the SPA SDK, spa-core and every `digitalmaktab-spa-country-*` /
    `-school-*` package.
  - It builds the SPA shell into the API's `wwwroot`.

  New country or school packages are picked up automatically once they are
  listed in `publish.sh`. You can run `build.sh` locally against fresh clones to
  verify a release before publishing.
- `start.sh` is the container entrypoint. It runs once per start, before the
  API:
  - It moves `/app/Resources` (uploads, backups, generated files) onto the
    persistent disk.
  - On first boot only, it writes the Data Protection key-ring marker into an
    empty `/var/data/keys`.

## Environment on the service

The required variables are listed in `digitalmaktab-api/Program.cs`. Production
additionally sets:

- `CONNECTION_STRING`: the internal connection string of `digitalmaktab-db`.
- Data Protection key ring:
  - `DataProtection__KeyRingPath=/var/data/keys`
  - `DataProtection__KeyRingId` set to a fixed UUID
  - `DataProtection__AllowUnencryptedKeyStorage=true`

  The key XML sits on Render's disk, which is encrypted at rest. That disk is
  the only instance's storage. **Never delete the disk or change the
  KeyRingId**: saved AI keys, durable payment/registration replies and queued
  welcome mail cannot be decrypted without the original key ring. Back up
  `/var/data/keys` separately from database backups.
- `ForwardedHeaders__KnownNetworks__0/1`: trusts Render's proxy for client IPs,
  so rate limits apply to each visitor instead of to Render's proxy address.
  The service is reachable only through that proxy.
- `PORT=5000`: matches the Kestrel endpoint in `appsettings.json`.

A service with a disk cannot run several instances and does not get
zero-downtime deploys. Each deploy restarts the app briefly.

## Custom domain

`digitalmaktab.com` lapsed and is now registered to someone else, so the app
runs on `https://digitalmaktab.onrender.com`. To attach another domain:

1. Add it under the service's **Settings → Custom Domains**.
2. Create the DNS records Render shows.

The SPA uses its own origin for API calls, so no rebuild is needed.

## Fresh databases

The historical Core migration chain cannot build a schema from an empty
database: `AddDynamicSchoolStaff` alters `CustomRole`, which no earlier
migration creates. On a brand-new database, `start.sh` first runs the
`bootstrap/` tool. It follows the same method as the actual-API load harness:

1. Create the schema from the current Core model with `EnsureCreated`.
2. Replay each migration's raw SQL (check constraints and expression/search
   indexes). Statements for constraints the model already created are skipped
   and logged.
3. Record every Core migration as applied.

Afghanistan then applies its own migrations at API startup. The bootstrap does
nothing once any table exists, so restarts and existing databases are
unaffected.
