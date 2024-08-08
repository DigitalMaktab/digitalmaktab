using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class StudentBranchIdsRemoved : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Student_Branch_CurrentBranchId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Branch_JoiningBranchId",
                table: "Student");

            migrationBuilder.DropIndex(
                name: "IX_Student_CurrentBranchId",
                table: "Student");

            migrationBuilder.DropIndex(
                name: "IX_Student_JoiningBranchId",
                table: "Student");

            migrationBuilder.DropColumn(
                name: "CurrentBranchId",
                table: "Student");

            migrationBuilder.DropColumn(
                name: "JoiningBranchId",
                table: "Student");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CurrentBranchId",
                table: "Student",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "JoiningBranchId",
                table: "Student",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Student_CurrentBranchId",
                table: "Student",
                column: "CurrentBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Student_JoiningBranchId",
                table: "Student",
                column: "JoiningBranchId");

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Branch_CurrentBranchId",
                table: "Student",
                column: "CurrentBranchId",
                principalTable: "Branch",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Branch_JoiningBranchId",
                table: "Student",
                column: "JoiningBranchId",
                principalTable: "Branch",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
