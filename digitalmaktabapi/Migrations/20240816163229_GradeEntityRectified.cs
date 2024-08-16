using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class GradeEntityRectified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Grade_CalendarYear_CalendarYearId",
                table: "Grade");

            migrationBuilder.DropIndex(
                name: "IX_Grade_CalendarYearId",
                table: "Grade");

            migrationBuilder.DropColumn(
                name: "CalendarYearId",
                table: "Grade");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CalendarYearId",
                table: "Grade",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Grade_CalendarYearId",
                table: "Grade",
                column: "CalendarYearId");

            migrationBuilder.AddForeignKey(
                name: "FK_Grade_CalendarYear_CalendarYearId",
                table: "Grade",
                column: "CalendarYearId",
                principalTable: "CalendarYear",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
