// Creates the Core schema in an EMPTY database, the same way the actual-API load
// harness does (tests/DigitalMaktab.Api.LoadHarness): the current Core model via
// EnsureCreated, then each migration's raw-SQL operations (check constraints,
// expression/search indexes the EF8 model cannot express), then every Core
// migration recorded as applied. Needed because the historical migration chain
// cannot build a database from nothing (AddDynamicSchoolStaff alters CustomRole,
// which no earlier migration creates).
//
// Country modules are NOT registered here: Afghanistan applies its own migrations
// (__AfghanistanMigrationsHistory) when the API starts, and the API's startup
// coordinator then runs its normal migrate/repair/seed sequence.
//
// A database that already has __EFMigrationsHistory is left untouched.
using DigitalMaktab.Core.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using Npgsql;

var connection = Environment.GetEnvironmentVariable("CONNECTION_STRING");
if (string.IsNullOrWhiteSpace(connection)) { Console.Error.WriteLine("bootstrap: CONNECTION_STRING is not set"); return 2; }

await using var db = new DataContext(new DbContextOptionsBuilder<DataContext>()
    .UseNpgsql(connection, o => o.CommandTimeout(600)).Options);

await using (var probe = new NpgsqlConnection(connection))
{
    await probe.OpenAsync();
    await using var cmd = new NpgsqlCommand(
        "select count(*) from information_schema.tables where table_schema='public'", probe);
    var tables = (long)(await cmd.ExecuteScalarAsync())!;
    if (tables > 0) { Console.WriteLine($"bootstrap: database already has {tables} table(s); nothing to do"); return 0; }
}

Console.WriteLine("bootstrap: empty database — creating Core schema from the current model");
if (!await db.Database.EnsureCreatedAsync()) { Console.Error.WriteLine("bootstrap: EnsureCreated did nothing"); return 1; }

var migrations = db.GetService<IMigrationsAssembly>();
var generator = db.GetService<IMigrationsSqlGenerator>();
var applied = 0; var skipped = new List<string>();
foreach (var id in db.Database.GetMigrations())
{
    var migration = migrations.CreateMigration(migrations.Migrations[id], db.Database.ProviderName!);
    foreach (var op in migration.UpOperations.OfType<SqlOperation>())
    foreach (var command in generator.Generate([op]))
    {
        try { await db.Database.ExecuteSqlRawAsync(command.CommandText); applied++; }
        catch (PostgresException ex)
        {
            // Model-created objects already exist; legacy repairs reference shapes the
            // current model no longer has. Both are expected on a model-built schema.
            skipped.Add($"{id}: {ex.SqlState} {ex.MessageText}");
        }
    }
}
var history = db.GetService<IHistoryRepository>();
await db.Database.ExecuteSqlRawAsync(history.GetCreateIfNotExistsScript());
foreach (var id in db.Database.GetMigrations())
    await db.Database.ExecuteSqlRawAsync(history.GetInsertScript(new HistoryRow(id, ProductInfo.GetVersion())));

Console.WriteLine($"bootstrap: applied {applied} migration SQL statement(s); {skipped.Count} skipped:");
foreach (var s in skipped) Console.WriteLine("  - " + s);
Console.WriteLine($"bootstrap: recorded {db.Database.GetMigrations().Count()} Core migrations as applied");
return 0;
