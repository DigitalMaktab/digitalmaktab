# Globalization Design

**Status:** Draft — target architecture, not yet implemented.
**Author:** initial version, 2026-09-23.
**Scope:** evolve Digital Maktab from an Afghanistan-only platform to a multi-country platform where new countries can be added with minimal core changes.

---

## 1. Motivation

The product today assumes Afghan defaults everywhere — the Solar Hijri calendar, the Afghan grade structure (up to grade 14), the Tazkira national-ID format, Dari and Pashto only, phone numbers in `+93`, and an implicit Afghani currency for fees. These assumptions are baked into enums, hardcoded seed defaults, and controller logic.

The goal is to let a new country (Pakistan, Iran, Tajikistan, an East African country, …) be onboarded by:

1. Seeding a `Country` row with its config,
2. Optionally adding a small country module for behavior that genuinely differs (calendar, national ID, curriculum),

without touching core code paths that already work for Afghanistan.

## 2. Where Afghanistan currently leaks

### 2.1 Data model

| Location | Afghan assumption |
|---|---|
| `Models/CalendarYear.cs` | `NativeYear` is a bare string, implicitly Solar Hijri |
| `Models/Language.cs` | Enum lists only Afghan/regional languages |
| `Models/NationalId.cs` | Fields (`Volume`, `Page`, `RegisterNumber`, `ElectronicNationalIdNumber`) are Tazkira-shaped |
| `Models/ClassName.cs` | Grades `FIRST..FOURTEENTH` — assumes Afghan 12/14-year structure |
| `Models/Address.cs` | `Village` field reads oddly in urban Western contexts |
| `Models/Fee.cs` | `Amount` is bare `decimal` — no `Currency` |

### 2.2 Configuration & seed

| Location | Afghan assumption |
|---|---|
| `Program.cs:122-133` | `SupportedCultures = { "en-US", "fa-AF", "ps-AF" }` — hardcoded list |
| `appsettings.json`, `.env` | `ROOT_USER_*`, mail templates, ZoomSettings — no country binding |
| `Services/Import/StudentImportService.cs:108` | `context.Countries.FirstOrDefaultAsync(c => c.CountryCode == "AF")` — literal fallback |
| `Services/Import/TeacherImportService.cs:88` | Same `"AF"` literal |
| `Data/Seed/Seeder.cs` | Seeds country phone codes but no per-country config beyond dial code |

### 2.3 UI / SPA

| Location | Afghan assumption |
|---|---|
| `digitalmaktabspa/src/locale/i18n.ts` | `supportedLngs: ["en-US","fa-AF","ps-AF"]` — hardcoded |
| `public/locales/{en-US,fa-AF,ps-AF}/translation.json` | Only three language files exist |
| Signup form | Requires an Afghan-shaped phone/address without asking for country |

### 2.4 Documentation / branding

| Location | Afghan assumption |
|---|---|
| `README.md` | "A Digital System for all Schools in Afghanistan." — Library "Afghanistan MOE Books" |
| Email templates in resx | Afghan-context greetings |

---

## 3. Target architecture

Hybrid: **config-in-DB** for the cheap things, **strategy pattern (interfaces + implementations)** for the concerns that genuinely need code.

```
┌─────────────────────────────────────────────────────────────┐
│  Core (country-agnostic)                                    │
│                                                             │
│  • Models: School, Branch, Class, Course, Student, Teacher, │
│    Enrollment, Fee, Attendance, Grade, CalendarYear, …      │
│  • Repositories, controllers, generic services              │
│  • Interfaces: ICalendarProvider, INationalIdValidator,     │
│    IGradeStructureProvider, ICurriculumProvider, …          │
│  • Country entity + config columns                          │
└─────────────────────────────────────────────────────────────┘
                            ▲                    ▲
                            │                    │
                       resolves at            resolves at
                       School.Country          School.Country
                            │                    │
      ┌─────────────────────┴──┐          ┌──────┴──────────────┐
      │  Countries/Afghanistan │          │  Countries/Pakistan │
      │                        │          │                     │
      │  • SolarHijriCalendar  │          │  • GregorianCalendar│
      │  • TazkiraValidator    │          │  • CNICValidator    │
      │  • MoEAfCurriculum     │          │  • FBiseCurriculum  │
      │  • fa-AF, ps-AF resx   │          │  • ur-PK, en-PK resx│
      │  • Books/MOE-Af/*.pdf  │          │  • Books/FBISE/*.pdf│
      └────────────────────────┘          └─────────────────────┘
```

## 4. What becomes what

### 4.1 Config on `Country` (DB, no code needed to add a country's basics)

```csharp
public class Country : Base
{
    public required string CountryName { get; set; }
    public required string CountryCode { get; set; }        // ISO 3166-1 alpha-2
    public required string CountryPhoneCode { get; set; }
    public ICollection<City> Cities { get; set; }

    // NEW: per-country configuration
    public required CalendarSystem CalendarSystem { get; set; }   // SOLAR_HIJRI, GREGORIAN, ISLAMIC
    public required string DefaultLanguageCode { get; set; }      // e.g. "fa-AF", "en-PK"
    public required ICollection<CountryLanguage> Languages { get; set; }
    public required string CurrencyCode { get; set; }             // ISO 4217, e.g. "AFN", "PKR"
    public required string CurrencySymbol { get; set; }
    public required int GradeCount { get; set; }                  // 12, 14, 13…
    public string? MoeName { get; set; }                          // display: "Ministry of Education"
    public string? MoeBooksResourcePath { get; set; }             // where seeded books live
}

public enum CalendarSystem { GREGORIAN, SOLAR_HIJRI, ISLAMIC }

public class CountryLanguage : Base
{
    public required Guid CountryId { get; set; }
    public required Country Country { get; set; }
    public required string LanguageCode { get; set; }             // "fa-AF"
    public required string DisplayName { get; set; }              // "دری" (native rendering)
    public required bool IsDefault { get; set; }
    public required bool IsRtl { get; set; }
}
```

### 4.2 `School` binds to `Country`

```csharp
public class School : Base
{
    // … existing fields
    public required Guid CountryId { get; set; }
    public required Country Country { get; set; }
}
```

`Address.PhoneNumber.CountryId` already exists — good. But `School.CountryId` needs to be added so *every* country-driven decision (calendar, language, currency, ID validator) can resolve from one place regardless of address changes.

### 4.3 Strategy interfaces (code, one implementation per country)

```csharp
public interface ICalendarProvider
{
    CalendarSystem System { get; }
    string FormatYear(DateOnly gregorian);                        // "1405" or "2026"
    DateOnly ParseYear(string native);
    DateOnly StartOfAcademicYear(int gregorianYear);
    DayOfWeek FirstDayOfWeek { get; }                             // Saturday in AF, Monday in PK
}

public interface INationalIdValidator
{
    bool IsValid(NationalIdDocument document, out string? errorKey);
    NationalIdDocument Parse(string raw);
    string Format(NationalIdDocument document);
}

public interface IGradeStructureProvider
{
    IReadOnlyList<GradeLevel> AllGrades();                        // per country
    string DisplayName(GradeLevel g, string cultureCode);
}

public interface ICurriculumProvider
{
    IReadOnlyList<StandardSubject> StandardSubjects(GradeLevel g);
    string? BookPath(StandardSubject s);
}
```

`NationalIdDocument` becomes a discriminated shape rather than the current Afghan-only property bag — either a polymorphic entity (TPH) or a JSON column keyed by `Country.NationalIdSchemaVersion`.

### 4.4 DI resolution

Two viable patterns:

**A. Country-keyed registration (simple):**

```csharp
services.AddScoped<ICalendarProvider, SolarHijriCalendarProvider>();
services.AddScoped<ICalendarProvider, GregorianCalendarProvider>();
services.AddScoped<ICalendarProviderResolver>();  // picks by School.Country.CalendarSystem
```

Consumers ask for `ICalendarProviderResolver.For(school)` rather than `ICalendarProvider` directly.

**B. Keyed services (.NET 8 native):**

```csharp
services.AddKeyedScoped<ICalendarProvider, SolarHijriCalendarProvider>(CalendarSystem.SOLAR_HIJRI);
services.AddKeyedScoped<ICalendarProvider, GregorianCalendarProvider>(CalendarSystem.GREGORIAN);
```

Consumers use `[FromKeyedServices(CalendarSystem.SOLAR_HIJRI)]`. Cleaner but requires the key to be known at the injection site — which usually means resolving through a factory anyway.

**Recommendation:** pattern A (explicit resolver) — simpler for downstream code and works with existing DI.

## 5. Folder layout

```
digitalmaktabapi/
  Controllers/                    # unchanged (country-agnostic)
  Models/                         # unchanged (core entities)
  Data/                           # unchanged (generic repos)
  Services/
    Import/                       # unchanged (uses ICurriculumProvider for defaults)
    Calendar/
      ICalendarProvider.cs
      CalendarProviderResolver.cs
    NationalId/
      INationalIdValidator.cs
      NationalIdValidatorResolver.cs
    Curriculum/
      ICurriculumProvider.cs
      CurriculumProviderResolver.cs
  Countries/                      # NEW — one folder per country
    Afghanistan/
      SolarHijriCalendarProvider.cs
      TazkiraValidator.cs
      AfghanistanCurriculum.cs
      AfghanistanCountryModule.cs   # registers all above with DI
      Resources/
        Books/*.pdf
        Localization/*.resx
    Pakistan/                      # future — same shape
      GregorianCalendarProvider.cs
      CNICValidator.cs
      …
```

Each `<Country>CountryModule.cs` exposes one extension method `services.AddAfghanistanModule()` called from `Program.cs`. That's the only file `Program.cs` needs to touch to onboard a new country.

## 6. Migration plan for existing Afghan data

The DB currently has one school (`Test School`), 10 seeded students, 4 teachers, 6 classes, 30 enrollments, etc., all assumed Afghan. Migration steps:

1. **Add columns to `Country` with defaults** — a data migration seeds `CalendarSystem`, `DefaultLanguageCode`, `CurrencyCode`, `GradeCount` for every existing country row using best-guess defaults (Afghanistan → SOLAR_HIJRI/fa-AF/AFN/14; others → GREGORIAN/en-US/USD/12 as placeholder until reviewed).
2. **Add `School.CountryId`** — data migration backfills every existing School with the Afghanistan country ID. Column NOT NULL after backfill.
3. **`CountryLanguage` seed** — populate from the current `SupportedCultures` list, tagged to Afghanistan.
4. **Extract Solar Hijri arithmetic into `AfghanistanCalendarProvider`** — no consumers change yet (still one implementation).
5. **Convert `NationalId` to polymorphic shape** — Afghan schools keep Tazkira fields; new field `NationalIdSchema` on Country tells the client which form to render.
6. **Un-hardcode `"AF"`** — imports look up `School.Country.CountryCode` instead of the literal.
7. **Introduce `Countries/Afghanistan/` folder** — move calendar/validator/curriculum in. Add `AfghanistanCountryModule` registration.
8. **Remove `SupportedCultures` hardcoding in `Program.cs`** — derive from union of all `CountryLanguage` rows.

Each step is independently deployable and reversible. No breaking change for the existing school until step 5 (NationalId shape change), which can be blue-green migrated behind a feature flag.

## 7. Suggested phasing

| Phase | Deliverable | Est. effort |
|---|---|---|
| **1. Foundations** | Country config columns, School.CountryId, un-hardcode "AF" defaults, seed AF row | 1-2 days |
| **2. Calendar strategy** | ICalendarProvider + resolver + AfghanistanCalendarProvider + stub GregorianCalendarProvider | 1 day |
| **3. Language config** | CountryLanguage table + seed, drive `SupportedCultures` and SPA i18n `supportedLngs` from DB | 1-2 days |
| **4. Countries/ folder** | Reshape file layout, move existing Afghan-specific classes, add `AddAfghanistanModule()` extension | 1 day |
| **5. Currency on Fees** | Add `Fee.CurrencyCode`, default from school country, display formatted amounts in reports | 1 day |
| **6. National ID rework** | Polymorphic `NationalIdDocument`, INationalIdValidator, Tazkira as one implementation | 3-4 days |
| **7. Grade structure** | IGradeStructureProvider, remove ClassName hard enum, drive grades from country config | 2-3 days |
| **8. First non-AF country** | Add `Countries/Pakistan/` end-to-end, verify school onboarding without core changes | 3-5 days |

**Total for a first non-Afghan school running end-to-end:** ~3 weeks of focused work.

## 8. Open questions

- **`ClassName` as enum vs entity.** The enum works for Afghanistan's fixed 1–14 grades. Pakistan has "Nursery" and "Prep" that don't map to integers. Do we (a) extend the enum with more values, (b) replace it with a `GradeLevel` entity per country, or (c) keep the enum and translate through `IGradeStructureProvider`? **Recommendation:** (b) — entity per country, but with a well-known code (`grade-1`, `grade-2`, `nursery`, `prep`) so cross-country reporting stays tractable.
- **Zoom vs alternatives per country.** Zoom is US-based and blocked/expensive in some countries. Do we abstract online-class into `IOnlineClassProvider`? Probably yes when we add a second country, not before.
- **Currency display and FX.** Do fees for a Pakistani school need to be readable in AFN by a global admin? Probably not — display in school's currency, no FX conversion in v1.
- **Multi-country root users.** Can a ROOT_USER manage schools in multiple countries? If yes, some root screens need country selection.
- **Resx locations for country modules.** ASP.NET Core's `IStringLocalizer` uses a global resources path. If Pakistan's Urdu strings live in `Countries/Pakistan/Resources/`, we'll need to either configure multiple resource providers or centralize under `Resources/Localization/<country>/`.
- **Data migration for existing prod schools.** If Digital Maktab is already live, we need a plan for zero-downtime migration through phases 1-5.

## 9. What this doc is *not*

- Not a commitment to ship every phase — pick what makes sense as needs arise.
- Not a rewrite. Every phase is additive; existing Afghan behavior keeps working throughout.
- Not final on interface shapes — the sketches above will get refined as we implement the first strategy (probably `ICalendarProvider`).

---

*Next step, once this doc is reviewed:* start Phase 1 (Foundations) — add Country config columns and un-hardcode the `"AF"` defaults. That's the smallest change that unblocks every subsequent phase.
