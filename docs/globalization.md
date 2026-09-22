# Platform & Extensibility Architecture

**Status:** Draft — target architecture, not yet implemented.
**Last revised:** 2026-09-23.
**Supersedes:** the previous "Globalization Design" draft (same file, earlier version).
**Scope:** evolve Digital Maktab from a single Afghan school-management app into a **platform** where new countries and individual schools can extend behavior through code (SDK / plugins) or through configuration (admin UI), across both a hosted SaaS and self-hosted deployments.

---

## 1. Vision

Three concentric ways to extend the platform, in order of investment:

1. **Platform code (`Core`)** — the reusable universal model. Built by the platform team. Changes only when the platform releases a new version.
2. **Country modules** — code extensions delivering country-specific behavior (calendar systems, national-ID formats, curriculum, regulatory reports). Built by the platform team or accredited country partners. Shipped as .NET NuGet packages + npm packages.
3. **School plugins** — code extensions for a single school (or a district / diocese / franchise). Built by the school's own dev team or an integrator. Same SDK as country modules; scope is one school by convention.

And, alongside code, a fourth path for schools without a dev team:

4. **Runtime configuration** — admins define custom fields, custom roles, custom fee categories through the UI. Stored as JSONB with definition metadata. No code required.

A new country needs a country module. A big school with a dev team writes a plugin. A small school clicks admin config. The same product serves all three.

## 2. Deployment models — supported from day one

**Both** SaaS and self-hosted are first-class deployment targets. The SDK is the shared substrate; the two topologies differ in tenancy, plugin trust, and operational responsibility.

### 2.1 SaaS multi-tenant

A hosted platform, run by the Digital Maktab team, that serves many schools.

- **Tenancy:** many schools in one deployment. All requests carry a school identity resolved from the JWT. Data isolated by `SchoolId` in every query (repository-level filter + optional Postgres RLS as defense in depth).
- **Country modules:** ship as trusted first-party or accredited third-party packages. Statically referenced by the host.
- **School plugins:** initially, **only vetted plugins from trusted publishers** run in the SaaS host. Uploaded → code-reviewed → deployed alongside next release. Sandboxing for arbitrary third-party plugins is a future goal (see §7); until it exists, don't run untrusted school code on shared infrastructure.
- **Frontend:** one hosted SPA bundle. Country + trusted school plugin frontends composed via Vite Module Federation, loaded at runtime based on the logged-in school.

### 2.2 Self-hosted

A single school (or district) runs their own instance. Fully trusted code, no sandboxing needed.

- **Tenancy:** typically single-tenant. Multi-tenant possible if a district runs one instance for many schools.
- **Country modules:** operator picks which country modules to include in their build.
- **School plugins:** operator's own dev team writes them in-tree or as separate projects, statically referenced. Full trust, direct DB access, everything.
- **Frontend:** operator forks the SPA (or uses the published `@digitalmaktab/core-ui` package) and composes their plugins at build time.

### 2.3 Same SDK, different rules

The .NET and TypeScript SDK contracts are identical for both deployment models. What differs is **trust and lifecycle**:

| Concern | SaaS | Self-hosted |
|---|---|---|
| Plugin loading | Static reference or curated `plugins/` folder | Static reference (fork or npm install) |
| Trust model | Vetted publishers only (until sandbox exists) | Full trust |
| Data isolation | Repository filters + RLS | Not needed (single tenant) or app-layer |
| Upgrade cadence | Rolling, coordinated across all tenants | On operator's schedule |
| Migrations | Platform-managed | Operator-managed |
| Support surface | Platform team owns | Operator team owns |

## 3. Where Afghanistan leaks today

Snapshot of Afghan-specific assumptions currently embedded in the code, seed data, and SPA — the migration surface for §8.

### 3.1 Data model

| Location | Afghan assumption |
|---|---|
| `Models/CalendarYear.cs` | `NativeYear` is a bare string, implicitly Solar Hijri |
| `Models/Language.cs` | Enum lists only Afghan/regional languages |
| `Models/NationalId.cs` | Fields (`Volume`, `Page`, `RegisterNumber`, `ElectronicNationalIdNumber`) are Tazkira-shaped |
| `Models/ClassName.cs` | Grades `FIRST..FOURTEENTH` — assumes Afghan 12/14-year structure |
| `Models/Address.cs` | `Village` field reads oddly in urban Western contexts |
| `Models/Fee.cs` | `Amount` is a bare `decimal` — no `Currency` |
| `Models/Student.cs` | Native/Father/Grandfather naming convention hardcoded on the aggregate |

### 3.2 Configuration & seed

| Location | Afghan assumption |
|---|---|
| `Program.cs:122-133` | `SupportedCultures = { "en-US", "fa-AF", "ps-AF" }` — hardcoded list |
| `Services/Import/StudentImportService.cs:108` | `context.Countries.FirstOrDefaultAsync(c => c.CountryCode == "AF")` — literal fallback |
| `Services/Import/TeacherImportService.cs:88` | Same `"AF"` literal |
| `Data/Seed/Seeder.cs` | Seeds country phone codes but no per-country config beyond dial code |

### 3.3 SPA

| Location | Afghan assumption |
|---|---|
| `src/locale/i18n.ts` | `supportedLngs: ["en-US","fa-AF","ps-AF"]` hardcoded |
| `screens/school/student/StudentEditor.tsx` | Renders Afghan-only fields; no dynamic composition |

---

## 4. Solution & project structure

Split the current single `digitalmaktabapi` project into a multi-project solution. Country modules and school plugins are **their own .NET projects** referencing SDK NuGets.

```
DigitalMaktab.sln
├── src/
│   ├── DigitalMaktab.Core.Abstractions/            ← stable interfaces, minimal surface, SemVer-strict
│   │   ├── Extensibility/           (IPlugin, ICountryModule, ISchoolPluginBuilder, extension points)
│   │   ├── Countries/               (ICalendarProvider, INationalIdValidator, ICurriculumProvider)
│   │   ├── Domain/                  (aggregate abstractions, marker interfaces)
│   │   └── DigitalMaktab.Core.Abstractions.csproj
│   │
│   ├── DigitalMaktab.Core/                          ← implementation of universal aggregates
│   │   ├── Models/                  (Student, Teacher, School, Country, Class, …)
│   │   ├── Data/                    (DataContext, generic repos, Core migrations)
│   │   ├── Services/                (Auth, Mail, PDF, Upload, generic Import base)
│   │   ├── Controllers/             (universal endpoints)
│   │   ├── Extensibility/
│   │   │   ├── Runtime custom-field framework  (Models, Services, Validator)
│   │   │   ├── PluginLoader/                    (discovers & wires plugins at startup)
│   │   │   └── EventBus/                        (domain events for plugin hooks)
│   │   └── DigitalMaktab.Core.csproj → references Abstractions
│   │
│   ├── DigitalMaktab.SDK/                           ← developer ergonomics, base classes
│   │   ├── PluginBase.cs, CountryModuleBase.cs
│   │   ├── EntityExtensionBuilder<TCore, TExtension>
│   │   ├── Testing/                (in-memory fixtures for plugin authors)
│   │   └── DigitalMaktab.SDK.csproj → references Abstractions
│   │
│   ├── DigitalMaktab.Country.Afghanistan/           ← reference country module
│   │   ├── Models/                  (AfghanStudentDetails, AfghanTeacherDetails, TazkiraDocument, …)
│   │   ├── Providers/               (SolarHijriCalendarProvider, AfghanistanCurriculum)
│   │   ├── Validators/TazkiraValidator.cs
│   │   ├── EntityConfigurations/    (EF Core mappings for TPT extensions)
│   │   ├── Migrations/              (owns its own schema)
│   │   ├── Resources/               (fa-AF, ps-AF resx + MOE PDFs)
│   │   ├── AfghanistanCountryModule.cs → services.AddAfghanistanModule()
│   │   └── DigitalMaktab.Country.Afghanistan.csproj → references Abstractions + SDK
│   │
│   ├── DigitalMaktab.Country.Pakistan/              ← future
│   │
│   ├── DigitalMaktab.Api/                           ← thin ASP.NET Core host
│   │   ├── Program.cs               (.AddCore().AddAfghanistanModule().AddPluginLoader() …)
│   │   ├── appsettings.json
│   │   └── DigitalMaktab.Api.csproj → references Core + selected Country modules
│   │
│   └── DigitalMaktab.Api.SaaS/                      ← SaaS-specific host (optional companion to .Api)
│       ├── Program.cs               (adds tenant resolution, RLS setup, plugin curation)
│       └── DigitalMaktab.Api.SaaS.csproj
│
├── plugins/                                          ← self-hosted operators drop their plugins here
│   └── (empty by default — populated at deploy time)
│
├── samples/
│   └── KabulHighSchool.Plugin/                       ← reference school plugin
│       ├── KabulStudentExtras.cs
│       ├── TransportRoutesController.cs
│       ├── KabulBusRouteAssigner.cs
│       ├── KabulHighSchoolPlugin.cs → ISchoolPlugin
│       └── Migrations/
│
└── tests/
    ├── DigitalMaktab.Core.Tests/
    ├── DigitalMaktab.Country.Afghanistan.Tests/
    ├── DigitalMaktab.SDK.Tests/
    └── KabulHighSchool.Plugin.Tests/
```

**Frontend companion structure (SPA + published packages):**

```
digitalmaktabspa/                                   ← app repository (existing)
  src/                                              ← host application

digitalmaktabspa-packages/                          ← published npm packages
  packages/
    @digitalmaktab/core-ui                          ← reusable components (AppCard, AppTable, AppModal, …)
    @digitalmaktab/plugin-sdk                       ← definePlugin(), extension points, types
    @digitalmaktab/testing                          ← Storybook helpers, mock providers
  countries/
    @digitalmaktab/country-afghanistan-ui           ← Afghan-specific form components
  plugins/
    @kabul-high-school/spa-plugin                   ← sample school plugin
```

Module Federation (Vite) at runtime for SaaS; static composition (fork or npm install) for self-hosted.

## 5. Extension architecture — four layers

Every extensible aggregate follows the same four-layer shape. Storage strategy differs deliberately per layer because the layers have wildly different characteristics.

### 5.1 The four layers

| Layer | Storage | # variants | Fields per variant | Change frequency | Query patterns |
|---|---|---|---|---|---|
| **1. Core (platform code)** | Native columns on the aggregate | 1 | ~15 | Platform release | Everywhere; heavy |
| **2. Country plugin (code, per-country module)** | **TPT** — native columns in `AfghanStudentDetails` joined 1:1 to `Student.Id` | 3–20 | ~10–30 | Country onboarding / regulation change | Country-scoped reports |
| **3. School plugin (code, per-school project)** | **TPT** — native columns in plugin-owned tables joined 1:1 to core aggregates | 10–1000s | ~5–50 | Plugin release cycle | School-scoped |
| **4. Runtime custom fields (admin config)** | **JSONB column** on the core aggregate + `CustomFieldDefinition` table | 100s–1000s | ~5–20 | At admin will | Almost always `WHERE SchoolId = ?` first |

### 5.2 Why TPT at country and school-plugin layers

Perf wins over JSONB by 30–50% for country-specific field access. Native columns, native indexes, native FKs, native uniqueness constraints, native `EXPLAIN`. Adding a new country or plugin is a migration in that module's own migration assembly — not a change to Core. See §6 for the Postgres details.

### 5.3 Why JSONB at the runtime config layer

You cannot have one table per school (hundreds of schools = hundreds of tables). Runtime custom fields are defined by admins, so a fixed schema is impossible. School-scoped queries narrow to a small row set before any JSON extraction, keeping the impact bounded. Hot custom fields can be materialized via Postgres generated columns on request.

### 5.4 Data model illustration

```csharp
// DigitalMaktab.Core - the universal Student aggregate
public class Student : Base
{
    public required Guid SchoolId { get; set; }
    public required Guid CountryId { get; set; }
    public required Guid CalendarYearId { get; set; }
    public required Guid JoiningClassId { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required DateTime DateOfBirth { get; set; }
    public required Gender Gender { get; set; }
    public required string Email { get; set; }
    public required byte[] PasswordHash { get; set; }
    public required byte[] PasswordSalt { get; set; }
    public required UserRole UserRole { get; set; }
    public required bool Status { get; set; }

    [Column(TypeName = "jsonb")]
    public JsonDocument? SchoolCustomData { get; set; }   // runtime config layer
}

// DigitalMaktab.Country.Afghanistan - country layer TPT extension
public class AfghanStudentDetails : Base
{
    public required Guid StudentId { get; set; }          // 1:1 FK to Student.Id
    public required Student Student { get; set; }
    public required string FirstNameNative { get; set; }
    public required string LastNameNative { get; set; }
    public required string FatherNameNative { get; set; }
    public required string GrandFatherNameNative { get; set; }
    public required int AsasNumber { get; set; }
    public TazkiraDocument? NationalId { get; set; }
    public IsOrphan IsOrphan { get; set; }
    public Language MotherTongue { get; set; }
}

// KabulHighSchool.Plugin - school plugin layer TPT extension
public class KabulStudentExtras : Base
{
    public required Guid StudentId { get; set; }          // 1:1 FK to Student.Id
    public required Student Student { get; set; }
    public BusRoute? AssignedBusRoute { get; set; }
    public required Guid? AssignedBusRouteId { get; set; }
    public string? ScholarshipCode { get; set; }
    public string? SecondaryParentEmail { get; set; }
}
```

Each extension owns its own table + migration. Core stays untouched. Queries that only need Core fields skip the joins.

### 5.5 Runtime custom-field framework (for schools without a dev team)

Alongside the plugin layer, an admin-facing custom-field system covers schools that don't want to (or can't) ship code.

```csharp
public class CustomFieldDefinition : Base
{
    public required Guid SchoolId { get; set; }
    public required string EntityType { get; set; }         // "Student", "Teacher", "Class", …
    public required string FieldKey { get; set; }           // "busRoute", "scholarshipCode"
    public required string DisplayNameEn { get; set; }
    public string? DisplayNameNative { get; set; }
    public required CustomFieldType DataType { get; set; }  // TEXT, NUMBER, DATE, BOOLEAN, DROPDOWN
    public string? DropdownOptions { get; set; }
    public required bool IsRequired { get; set; }
    public required bool ShowInList { get; set; }
    public required int SortOrder { get; set; }
}
```

Runtime flow:
1. Admin defines fields via UI.
2. SPA loads definitions before rendering entity forms.
3. Universal fields + country plugin fields + school plugin fields + custom fields render together.
4. Custom values persist to the JSONB column on the aggregate.

The plugin and admin-config approaches **coexist per school**. A school might have both a plugin (advanced features) and custom fields (long-tail attributes).

### 5.6 Per-entity classification

Not everything needs every layer. Realistic classification:

| Entity | Core | Country plugin | School plugin | Runtime config |
|---|:---:|:---:|:---:|:---:|
| Student | ✓ | ✓ | ✓ | ✓ |
| Teacher | ✓ | ✓ | ✓ | ✓ |
| Class | ✓ | ✓ | ✓ | ✓ |
| Subject | ✓ | ✓ | ✓ | ✓ |
| Course | ✓ | ✓ | ✓ | ✓ |
| Grade | ✓ | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ | ✓ |
| Fee | ✓ | ✓ | ✓ | ✓ |
| Enrollment | ✓ | ✓ | ✓ | ✓ |
| Schedule | ✓ | ✓ | ✓ | ✓ |
| CalendarYear | ✓ | ✓ | — | — |
| Address | ✓ | ✓ | — | — |
| Country | ✓ | — | — | — |
| Branch | ✓ | — | ✓ | ✓ |
| UserRole | ✓ | — | ✓ (custom roles) | ✓ |

## 6. Storage & performance principles

### 6.1 Postgres feature usage

- **TPT joins:** 1:1 by primary key — Postgres B-tree lookup ~2–5μs per row. Negligible for realistic queries.
- **JSONB:** Postgres binary JSON. Native operators (`->`, `->>`, `@>`) and GIN indexes. Field access ~5μs uncached.
- **Generated columns:** materialise hot JSON fields as native columns for fast indexing without schema migrations for admins:
  ```sql
  ALTER TABLE "Student" ADD COLUMN "BusRoute" text
    GENERATED ALWAYS AS ("SchoolCustomData"->>'busRoute') STORED;
  ```
- **Row-Level Security (RLS):** in SaaS, enable Postgres RLS on every tenant table. Even if a repository forgets to filter by `SchoolId`, the DB refuses to leak. Defense in depth.

### 6.2 Query patterns (applied at every layer)

- **Always project.** List views select a `StudentListDto` with the columns actually shown — not the full entity graph.
- **Avoid N+1.** Bulk operations preload lookups into memory. `context.Students.Where(...).Select(s => s.Email).ToHashSetAsync()` — one query, not N.
- **Batch writes.** `AddRange` + one `SaveChangesAsync` per import. The current student import runs ~1500 queries for 501 rows; batched it's 3.
- **`AsNoTracking()`** for read-only queries.

### 6.3 Indexes

- Every FK gets an index (EF Core adds these for navigations; verify for owned entities and JSONB).
- Uniqueness at DB level, not just app logic. `UNIQUE (SchoolId, Email)` on Student/Teacher/User.
- Composite indexes for common filter patterns — e.g. `(SchoolId, CalendarYearId, JoiningClassId)`.
- Generated column + index for any JSONB field used in reports.

### 6.4 Bulk operations

- Import services: single transaction with batched inserts. Preload all `Exists()` checks into a HashSet, `AddRange`, one `SaveChangesAsync`.
- Very large imports (>10k rows): `Npgsql.NpgsqlBinaryImporter` via `COPY`.
- Pure data seeding: bypass EF for raw SQL when EF's overhead is unnecessary.

### 6.5 Caching

- Reference data (Country, CountryLanguage, CalendarYear, CustomFieldDefinition, plugin manifests) cached in memory with change notifications.
- SPA IndexedDB cache in `api/client.ts` needs cache-tag invalidation on mutations — currently it's too aggressive and can serve stale data after writes.

### 6.6 Cross-layer report boundaries

- Country-scoped reports live in country modules — no attempt to unify Afghan and Pakistani detail tables.
- School plugin reports live in the plugin — no attempt to reach into another school's tables.
- Cross-school reports on runtime custom fields are inherently expensive — publish nightly snapshot aggregates for platform dashboards; do not query JSONB at scale.

---

## 7. The SDK contract

Every extension point is a public API commitment. Breaking one breaks every plugin in the world. The SDK follows strict SemVer: patch for bugfixes, minor for additions, major for breaking changes with a deprecation window.

### 7.1 Backend SDK — `DigitalMaktab.SDK`

**Plugin identity:**

```csharp
public interface IPlugin
{
    string PluginCode { get; }           // globally unique, e.g. "kabul-high-school"
    Version SdkVersion { get; }          // which SDK version the plugin was built against
    void Configure(IPluginBuilder builder);
}

public interface ICountryModule : IPlugin
{
    string CountryCode { get; }          // ISO 3166-1 alpha-2
}

public interface ISchoolPlugin : IPlugin
{
    string SchoolCode { get; }           // globally unique per platform deployment
}
```

**Extension points exposed by `IPluginBuilder`:**

```csharp
public interface IPluginBuilder
{
    // Entity extensions (1:1 TPT)
    IPluginBuilder ExtendEntity<TCore, TExtension>()
        where TCore : Base
        where TExtension : Base, ICoreEntityExtension<TCore>;

    // Controllers
    IPluginBuilder AddController<TController>() where TController : ControllerBase;

    // Services (register or override)
    IPluginBuilder AddService<TInterface, TImpl>() where TImpl : TInterface;
    IPluginBuilder DecorateService<TInterface, TDecorator>() where TDecorator : TInterface;

    // Country-specific providers (country modules only)
    IPluginBuilder ProvideCalendar<T>() where T : ICalendarProvider;
    IPluginBuilder ProvideNationalIdValidator<T>() where T : INationalIdValidator;
    IPluginBuilder ProvideCurriculum<T>() where T : ICurriculumProvider;

    // Domain event subscriptions
    IPluginBuilder OnEvent<TEvent, THandler>()
        where TEvent : IDomainEvent
        where THandler : IEventHandler<TEvent>;

    // Lifecycle hooks
    IPluginBuilder BeforeSave<TEntity, THook>() where THook : IBeforeSave<TEntity>;
    IPluginBuilder AfterSave<TEntity, THook>() where THook : IAfterSave<TEntity>;

    // EF Core plumbing
    IPluginBuilder RegisterEntityConfiguration(IEntityTypeConfiguration configuration);
    IPluginBuilder RegisterMigrationAssembly(Assembly assembly);

    // Localization
    IPluginBuilder AddResourceAssembly(Assembly assembly);
}
```

**Sample school plugin:**

```csharp
public class KabulHighSchoolPlugin : ISchoolPlugin
{
    public string PluginCode => "kabul-high-school";
    public string SchoolCode => "kabul-high";
    public Version SdkVersion => new(1, 0, 0);

    public void Configure(IPluginBuilder builder)
    {
        builder.ExtendEntity<Student, KabulStudentExtras>();
        builder.AddController<TransportRoutesController>();
        builder.AddService<IBusRouteAssigner, KabulBusRouteAssigner>();
        builder.OnEvent<StudentEnrolled, AssignBusRouteOnEnrollment>();
        builder.BeforeSave<Fee, EnforceScholarshipDiscount>();
        builder.RegisterMigrationAssembly(typeof(KabulHighSchoolPlugin).Assembly);
        builder.AddResourceAssembly(typeof(KabulHighSchoolPlugin).Assembly);
    }
}
```

**Scoping.** School plugin services and controllers are only wired for requests where `School.PluginCode == plugin.SchoolCode`. The `IPluginScopeResolver` in Core handles this — plugins don't manually check.

### 7.2 Frontend SDK — `@digitalmaktab/plugin-sdk`

```ts
import { definePlugin } from "@digitalmaktab/plugin-sdk";
import KabulBusRouteField from "./components/KabulBusRouteField";
import TransportRoutesScreen from "./screens/TransportRoutesScreen";

export default definePlugin({
  pluginCode: "kabul-high-school",
  schoolCode: "kabul-high",
  sdkVersion: "1.0.0",

  extendForm: {
    student: [
      { slot: "after-address", component: KabulBusRouteField, order: 100 },
    ],
  },

  addTableColumn: {
    studentList: [
      { header: "table.kabul.busRoute", accessor: "kabul.busRoute", order: 50 },
    ],
  },

  addMenuItem: [
    { path: "/transport", labelKey: "menu.kabul.transport", roles: ["ADMIN"] },
  ],

  addRoute: [
    { path: "/transport/routes", component: TransportRoutesScreen, roles: ["ADMIN"] },
  ],

  translations: {
    "en-US": { "menu.kabul.transport": "Transport", "table.kabul.busRoute": "Bus Route" },
    "fa-AF": { "menu.kabul.transport": "ترانسپورت", "table.kabul.busRoute": "مسیر بس" },
    "ps-AF": { "menu.kabul.transport": "ترانسپورت", "table.kabul.busRoute": "د بس لار" },
  },
});
```

**Discovery.** In SaaS, plugins load at runtime via Vite Module Federation, keyed by the logged-in school. In self-hosted, plugins are `npm install`ed and statically composed at build time.

### 7.3 Versioning & compatibility

- **`DigitalMaktab.Core.Abstractions`** is the SemVer-strict contract. Major bumps are rare, painful, and always come with a migration guide.
- **`DigitalMaktab.Core`** implementation can change freely as long as it honors the Abstractions contract.
- **`DigitalMaktab.SDK`** is minor-versioned to reflect added helpers; never adds new required extension points without a major bump.
- Plugins declare `SdkVersion`. Host checks compatibility at load time and refuses incompatible plugins with a clear error.
- Deprecation cycle: mark for one minor, remove in next major. Include a compiler-warning attribute.

## 8. Multi-tenancy & isolation (SaaS)

### 8.1 Tenant identity

Every authenticated request carries `SchoolId` from the JWT. `ITenantContext` (scoped) exposes it. Repositories use it as the default filter for every query touching tenant data.

### 8.2 Data isolation

Two-layer defense:
- **App layer:** every repository accepts `SchoolId` and filters on it. Reviewed via code review + tests.
- **DB layer:** Postgres RLS enabled on every tenant table. Policy: `USING ("SchoolId" = current_setting('app.tenant_id')::uuid)`. Even if an app-layer filter is missed, the DB refuses.

### 8.3 Plugin isolation (SaaS-only concern)

Plugins run in-process with full trust in v1. Isolation guarantees are:
- **Data:** plugin services obtain `SchoolId` from `ITenantContext` — cannot easily reach other tenants' data if they use provided repositories.
- **Code:** plugins loaded via `AssemblyLoadContext` for unload/reload; not for security.

**What v1 does NOT provide:**
- Resource limits (CPU, memory) per plugin.
- Prevention of malicious plugins reading DB directly, calling external APIs, etc.

Therefore, in v1 SaaS: **only vetted plugins from trusted publishers run in the SaaS host.** Untrusted third-party plugins are self-hosted only.

Sandboxing options for a future SaaS third-party plugin marketplace:
- **WASM plugins** (WebAssembly with limited API surface — like Envoy filters, Shopify Functions)
- **DSL** (a restricted scripting language with governor limits — like Salesforce Apex)
- **Per-plugin OS sandbox** (each plugin in its own process/container, with well-defined IPC — expensive)

None are cheap. Marketplace with untrusted plugins is a Phase F or later concern.

## 9. Deployment topologies

### 9.1 SaaS multi-tenant

```
                           ┌──────────────────────────────┐
                           │  digitalmaktab.com           │
                           │                              │
Requests ─── LB ─── Kestrel ─┼──── DigitalMaktab.Api.SaaS ─┼── Postgres (RLS-partitioned)
                           │      ├─ Core                 │
                           │      ├─ Country.Afghanistan  │
                           │      ├─ Country.Pakistan     │
                           │      ├─ VettedPlugin.A       │
                           │      └─ VettedPlugin.B       │
                           │  SPA (CDN) + Module Federation for plugins
                           └──────────────────────────────┘
```

### 9.2 Self-hosted (single school)

```
                     ┌────────────────────────────────┐
                     │  school.example.edu            │
Requests ─── Kestrel ─┼── DigitalMaktab.Api           ─┼── Postgres (single tenant)
                     │      ├─ Core                    │
                     │      ├─ Country.Afghanistan     │
                     │      └─ SchoolPlugin (in-tree)  │
                     │  SPA served by Kestrel or CDN
                     └────────────────────────────────┘
```

### 9.3 Self-hosted (district — small multi-tenant)

Same as SaaS shape but operated by the district; RLS enabled, only district schools inside.

## 10. Localization strategy

- **Core resx** — cross-cutting strings (buttons, generic errors).
- **Country module resx** — country-specific strings (calendar labels, validation errors, MOE curriculum names). `IStringLocalizer<T>` resolves from the country's assembly.
- **School plugin resx / translations** — plugin ships its own resx and JSON. Plugin's translation contributions merged into the SPA i18n bundle at runtime (SaaS) or build time (self-hosted).
- **Supported cultures** — derived from the union of all `CountryLanguage` rows at startup, not hardcoded in `Program.cs`.

## 11. EF Core migrations across projects

- **Core** owns migrations for universal tables.
- **Each country module** owns its migrations in its own assembly (`optionsBuilder.UseNpgsql(cs, x => x.MigrationsAssembly("DigitalMaktab.Country.Afghanistan"))`).
- **Each school plugin** owns its migrations.
- **Host startup** runs Core migrations first, then country modules, then loaded plugins — each in its own migration table (`__EFMigrationsHistory_<assembly>`).
- Plugin uninstall: their tables remain (no destructive drops in v1) — operator's decision to clean up manually.

## 12. Migration plan from current state

Each step is independently deployable and reversible.

1. **Split the API into Core + Api + Country.Afghanistan projects.** Move existing code — no logic change. Solution builds identically. ~1 day.
2. **Extract `DigitalMaktab.Core.Abstractions`.** Move interfaces (repositories, base, upcoming extension points) into a stable package. ~half day.
3. **Add country config columns to `Country`.** `CalendarSystem`, `DefaultLanguageCode`, `CurrencyCode`, `GradeCount`. Data seed backfills Afghanistan values. ~half day.
4. **Add `School.CountryId` FK.** Backfill existing schools with Afghanistan's Id. Set NOT NULL. ~half day.
5. **Introduce `ICalendarProvider` + `SolarHijriCalendarProvider`.** First strategy interface, one implementation. Prove the resolver pattern. ~1 day.
6. **Extract Afghan Student/Teacher fields into TPT tables.** `AfghanStudentDetails`, `AfghanTeacherDetails`. Shadow-write to both old and new columns until verified, then drop old columns from Core. ~2 days.
7. **Add `SchoolCustomData jsonb` columns.** Plumbing only, no admin UI yet. ~half day.
8. **Un-hardcode `"AF"` in imports and `SupportedCultures` in `Program.cs`.** Derive from data. ~half day.
9. **Build `DigitalMaktab.SDK` and `IPluginBuilder`.** First cut of the extension-point contract. Country modules use it internally as validation of the API. ~2–3 days.
10. **Extract country resx into the Afghanistan module.** Move Afghan strings out of Core's resx files. ~half day.
11. **Introduce plugin loader.** Static plugin discovery (`services.AddSchoolPlugin<KabulHighSchoolPlugin>()`). Not runtime dynamic yet. ~1 day.
12. **Add stub `DigitalMaktab.Country.Pakistan` project.** Proves the pattern for a second country. ~half day.
13. **Reference `KabulHighSchool.Plugin` sample.** End-to-end school plugin as executable documentation of the SDK. ~2 days.
14. **Runtime custom-field framework (v1).** `CustomFieldDefinition` CRUD + JSONB persistence + backend validation. Admin UI is Phase D. ~2 days.
15. **Vite Module Federation for SPA plugins.** Runtime plugin loading in the SPA. ~2–3 days.
16. **Admin UI for custom fields.** ~1 week.
17. **Multi-tenancy hardening.** Postgres RLS policies, `ITenantContext`, per-tenant DB metrics. Only needed for SaaS deployment. ~1 week.

## 13. Phasing (realistic timeline)

Each phase is shippable. Later phases depend on earlier.

### Phase A — Foundation (~1 week)

Steps 1–5 above. Multi-project split, country config columns, first strategy interface. Behavior unchanged; foundations only.

### Phase B — TPT extraction & SDK v1 (~2 weeks)

Steps 6–11. Afghan fields moved into TPT tables. First cut of the SDK with `IPluginBuilder`. Reference country module & sample school plugin as executable specs.

### Phase C — Runtime config layer (~1 week)

Steps 7 revisited + 14. `SchoolCustomData` populated via a first-cut admin API. No dynamic form rendering yet — just plumbing.

### Phase D — Frontend plugins (~2–3 weeks)

Step 15 + Vite Module Federation setup for `@digitalmaktab/*` packages. Runtime plugin loading in SPA. Sample school plugin renders a real screen.

### Phase E — Admin UI for custom fields (~1 week)

Step 16. Schools without dev teams get a working experience.

### Phase F — Multi-tenancy hardening & SaaS deployment (~2–3 weeks)

Step 17. Postgres RLS, `ITenantContext`, tenant-scoped metrics. Deploy first SaaS instance.

### Phase G — Sandboxed third-party plugin marketplace (deferred, months of work)

Only if there's demand for arbitrary third-party plugins in the SaaS host. Not before Phases A–F are stable.

**Total to first non-Afghan school running in production, self-hosted, with a plugin:** ~2 months of focused work.
**Total to a hosted SaaS with tenant isolation and vetted plugins:** ~4 months.
**Total to an open plugin marketplace with untrusted plugins:** at least 12+ months beyond that; consider carefully whether it's needed.

## 14. Open questions

- **`ClassName` as enum vs entity.** Enum works for Afghanistan's 1–14 grades but not for Pakistani "Nursery"/"Prep". Replace with a `GradeLevel` entity keyed by country, with cross-country codes (`grade-1`, `nursery`).
- **Zoom vs alternatives per country.** Abstract into `IOnlineClassProvider` when the second country arrives.
- **Currency & FX.** Display in school's currency; no conversion in v1. Global admin dashboards accept mixed-currency reality.
- **Multi-country root users.** If a root user manages schools across countries, screens need a country selector; otherwise root users are country-scoped. Recommendation: country-scoped by default, "super admin" flag for cross-country.
- **Data residency.** Some countries mandate in-country data. Regional deployments become required if this hits. Design DBs to be shardable by country from day one — don't put `AfghanStudentDetails` in the same DB as `PakistaniStudentDetails` unless RLS + region rules allow it.
- **Plugin trust in SaaS.** Vetted-publisher-only in v1. Marketplace with untrusted plugins requires sandboxing (WASM / DSL / OS isolation) — years of work.
- **Plugin data on uninstall.** When a plugin is disabled or a school migrates off it, do we drop the plugin's tables or leave them? Recommendation: leave, operator cleans up manually. Never drop tenant data automatically.
- **Cross-plugin dependencies.** Can plugin A require plugin B? If yes, we need a manifest system and load ordering. If no (recommended for v1), plugins compose only through Core's extension points.
- **Custom field schema deletion.** When an admin deletes a `CustomFieldDefinition`, keep the JSON values (soft delete, 30-day undelete) or purge? Recommendation: soft delete, purge after 30 days.
- **SPA plugin loading order.** Module Federation loads plugins lazily. If a plugin registers a menu item, it must load before the menu renders. Solution: a manifest fetched at login that lists plugin URLs, then Promise.all before initial render.

## 15. What this doc is *not*

- Not a commitment to ship every phase — each phase gate on real customer need.
- Not a rewrite. Every step is additive; existing Afghan behavior keeps working throughout.
- Not final on SDK interface shapes — expect refinement through Phases B–D.
- Not a security audit. Multi-tenant plugin sandboxing (Phase G) needs a proper threat model and third-party review before shipping.

---

*Next step, once this doc is reviewed:* start **Phase A**. First concrete change is the solution split — create `DigitalMaktab.Core`, `DigitalMaktab.Api`, `DigitalMaktab.Country.Afghanistan`, `DigitalMaktab.Core.Abstractions`, and `DigitalMaktab.SDK` csproj files, move existing files, wire references. No logic changes in that first commit.
