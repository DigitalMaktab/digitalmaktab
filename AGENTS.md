# Persistent agent instructions

Read [CLAUDE.md](CLAUDE.md) before working on DigitalMaktab. It contains the
project-wide rules for this repository and its sibling `digitalmaktab-*`
repositories. These instructions apply in every session, including resumed work.

## Mandatory discovery and reuse before implementation

Before proposing or implementing a change, thoroughly inspect the relevant
existing implementation across the affected repositories. Search database
entities, owned values, configurations, migrations, DTOs, services, repositories,
SDK contracts, UI components and module extension points. Trace their actual
callers and behavior; a name search alone is not sufficient.

- Reuse an existing table, field, relationship, component or service whenever it
  represents the same concept. Extend it compatibly when behavior is missing.
  Do not introduce a parallel representation, duplicate source of truth or copied
  implementation merely because it is easier to access from the current module.
- Put shared concepts and behavior in the appropriate backend Core, spa-core or
  shared mobile/SDK layer. If the capability belongs in Core, implement or extend
  it there before consuming it from the API, shell, country or school module.
- Keep country-specific and school-specific data and rules in their respective
  modules. Extend Core through its existing composition contracts. When a shared
  capability needs customization, add a minimal extension point to Core rather
  than embedding a lower module's rules in Core or forking Core behavior below it.
- Before adding any new persistent field/table, component, service or contract,
  record briefly in the implementation update or change description what was
  checked, why existing options cannot represent the need, and why the selected
  layer owns it. If an existing option fits, reuse or extend it instead.
- Apply this check to fixes and refactors as well as new features. Preserve
  existing data and compatibility when consolidating duplicates; use the normal
  migration and consumer validation workflow.

The objective is one authoritative representation of each concept and reusable
behavior at the correct layer, with country and school modules contributing only
their own specialization.
