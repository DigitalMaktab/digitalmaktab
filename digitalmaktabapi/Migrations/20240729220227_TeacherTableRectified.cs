using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class TeacherTableRectified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClassId",
                table: "Teacher",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "TeacherId",
                table: "Class",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Teacher_ClassId",
                table: "Teacher",
                column: "ClassId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Teacher_Class_ClassId",
                table: "Teacher",
                column: "ClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Teacher_Class_ClassId",
                table: "Teacher");

            migrationBuilder.DropIndex(
                name: "IX_Teacher_ClassId",
                table: "Teacher");

            migrationBuilder.DropColumn(
                name: "ClassId",
                table: "Teacher");

            migrationBuilder.DropColumn(
                name: "TeacherId",
                table: "Class");
        }
    }
}
