using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class JoiningYearChangedToCalendarYear : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "JoiningYear",
                table: "Students",
                newName: "CalendarYearId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_CalendarYearId",
                table: "Students",
                column: "CalendarYearId");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_CalendarYear_CalendarYearId",
                table: "Students",
                column: "CalendarYearId",
                principalTable: "CalendarYear",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Students_CalendarYear_CalendarYearId",
                table: "Students");

            migrationBuilder.DropIndex(
                name: "IX_Students_CalendarYearId",
                table: "Students");

            migrationBuilder.RenameColumn(
                name: "CalendarYearId",
                table: "Students",
                newName: "JoiningYear");
        }
    }
}
