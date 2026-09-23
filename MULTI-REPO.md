# Multi-Repo Split — Moved

The canonical version of this document now lives in the docs repo:

**→ [`digitalmaktab-docs/MULTI-REPO.md`](https://github.com/DigitalMaktab/digitalmaktab-docs/blob/main/MULTI-REPO.md)**

(Or locally, if you have the sibling repos cloned: `../digitalmaktab-docs/MULTI-REPO.md`.)

---

## Why this file is a stub

This monorepo is a **historical snapshot** — the codebase was split into six sibling repos in commit `957cfb2`. All new work happens there:

- [`digitalmaktab-core`](https://github.com/DigitalMaktab/digitalmaktab-core) — reusable core (NuGets)
- [`digitalmaktab-api`](https://github.com/DigitalMaktab/digitalmaktab-api) — ASP.NET host
- [`digitalmaktab-country-afghanistan`](https://github.com/DigitalMaktab/digitalmaktab-country-afghanistan) — first country module
- [`digitalmaktab-spa`](https://github.com/DigitalMaktab/digitalmaktab-spa) — React SPA
- [`digitalmaktab-desktop`](https://github.com/DigitalMaktab/digitalmaktab-desktop) — Electron client
- [`digitalmaktab-docs`](https://github.com/DigitalMaktab/digitalmaktab-docs) — architecture & design docs

The original handoff content that used to live here (extraction steps, cross-repo dev workflow, push instructions, known gaps) was maintained in-place initially but has since evolved with several updates (machine-specific paths stripped, closed gaps marked, versioning-strategy notes) — all in the docs repo. Kept in sync via this stub instead of a diverging copy.

---

*Delete this file (and the monorepo itself) when you're satisfied the split is stable.*
