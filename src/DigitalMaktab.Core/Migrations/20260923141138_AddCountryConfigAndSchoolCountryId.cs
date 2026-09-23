using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class AddCountryConfigAndSchoolCountryId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // --- Country: add the 4 config columns with generic defaults. ------------------
            migrationBuilder.AddColumn<int>(
                name: "CalendarSystem",
                table: "Country",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CurrencyCode",
                table: "Country",
                type: "text",
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<string>(
                name: "DefaultLanguageCode",
                table: "Country",
                type: "text",
                nullable: false,
                defaultValue: "en-US");

            migrationBuilder.AddColumn<int>(
                name: "GradeCount",
                table: "Country",
                type: "integer",
                nullable: false,
                defaultValue: 12);

            // --- Country: Afghanistan-specific overrides (CalendarSystem SOLAR_HIJRI=1). --
            // Non-Afghan countries keep the generic placeholders above; they should be
            // reviewed and updated as each country is genuinely onboarded.
            migrationBuilder.Sql(@"
                UPDATE ""Country""
                SET ""CalendarSystem"" = 1,
                    ""DefaultLanguageCode"" = 'fa-AF',
                    ""CurrencyCode"" = 'AFN',
                    ""GradeCount"" = 14
                WHERE ""CountryCode"" = 'AF';
            ");

            // --- School.CountryId: add nullable, backfill, then make NOT NULL. ------------
            // Cannot use a Guid.Empty default because that value doesn't exist in Country
            // and would break the FK we're about to add.
            migrationBuilder.AddColumn<Guid>(
                name: "CountryId",
                table: "School",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""School""
                SET ""CountryId"" = (SELECT ""Id"" FROM ""Country"" WHERE ""CountryCode"" = 'AF' LIMIT 1);
            ");

            migrationBuilder.AlterColumn<Guid>(
                name: "CountryId",
                table: "School",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_School_CountryId",
                table: "School",
                column: "CountryId");

            migrationBuilder.AddForeignKey(
                name: "FK_School_Country_CountryId",
                table: "School",
                column: "CountryId",
                principalTable: "Country",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_School_Country_CountryId",
                table: "School");

            migrationBuilder.DropIndex(
                name: "IX_School_CountryId",
                table: "School");

            migrationBuilder.DropColumn(
                name: "CountryId",
                table: "School");

            migrationBuilder.DropColumn(
                name: "CalendarSystem",
                table: "Country");

            migrationBuilder.DropColumn(
                name: "CurrencyCode",
                table: "Country");

            migrationBuilder.DropColumn(
                name: "DefaultLanguageCode",
                table: "Country");

            migrationBuilder.DropColumn(
                name: "GradeCount",
                table: "Country");
        }
    }
}
