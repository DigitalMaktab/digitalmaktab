# Multi-Repo Split — Moved

The canonical documents now live in the docs repo:

- **Backend split** → [`digitalmaktab-docs/MULTI-REPO.md`](https://github.com/DigitalMaktab/digitalmaktab-docs/blob/main/MULTI-REPO.md)
- **SPA split** → [`digitalmaktab-docs/SPA-MULTI-REPO.md`](https://github.com/DigitalMaktab/digitalmaktab-docs/blob/main/SPA-MULTI-REPO.md)

(Locally if you have the sibling repos cloned: `../digitalmaktab-docs/MULTI-REPO.md` and `../digitalmaktab-docs/SPA-MULTI-REPO.md`.)

---

## Why this file is a stub

This monorepo is a **historical snapshot** — the codebase was split into sibling repos across two waves:

**Backend wave** (commit `957cfb2`):
- [`digitalmaktab-core`](https://github.com/DigitalMaktab/digitalmaktab-core) — reusable core (NuGets)
- [`digitalmaktab-api`](https://github.com/DigitalMaktab/digitalmaktab-api) — ASP.NET host
- [`digitalmaktab-country-afghanistan`](https://github.com/DigitalMaktab/digitalmaktab-country-afghanistan) — first country module
- [`digitalmaktab-desktop`](https://github.com/DigitalMaktab/digitalmaktab-desktop) — Electron client
- [`digitalmaktab-docs`](https://github.com/DigitalMaktab/digitalmaktab-docs) — architecture & design docs

**SPA wave** (later, see `SPA-MULTI-REPO.md` in the docs repo):
- [`digitalmaktab-spa-sdk`](https://github.com/DigitalMaktab/digitalmaktab-spa-sdk) — extension contracts (types-only npm)
- [`digitalmaktab-spa-core`](https://github.com/DigitalMaktab/digitalmaktab-spa-core) — reusable UI + hooks + api client + i18n scaffolding (npm)
- [`digitalmaktab-spa-country-afghanistan`](https://github.com/DigitalMaktab/digitalmaktab-spa-country-afghanistan) — Dari + Pashto bundles + CountryModule metadata (npm)
- [`digitalmaktab-spa`](https://github.com/DigitalMaktab/digitalmaktab-spa) — thin shell consuming the three packages above

All new work happens in those sibling repos. Original handoff content used to live here inline; it has since evolved (machine-specific paths stripped, closed gaps marked, versioning notes added) and been mirrored into the docs repo. Kept in sync via this stub instead of a diverging copy.

---

*Delete this file (and the monorepo itself) when you're satisfied both splits are stable.*
