using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class ClassBranchAndSchoolRelationshipAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SchoolId",
                table: "Branch",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Branch_SchoolId",
                table: "Branch",
                column: "SchoolId");

            migrationBuilder.AddForeignKey(
                name: "FK_Branch_School_SchoolId",
                table: "Branch",
                column: "SchoolId",
                principalTable: "School",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Branch_School_SchoolId",
                table: "Branch");

            migrationBuilder.DropIndex(
                name: "IX_Branch_SchoolId",
                table: "Branch");

            migrationBuilder.DropColumn(
                name: "SchoolId",
                table: "Branch");
        }
    }
}
