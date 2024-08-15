using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class StudentClassIdChanged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Student_Class_CurrentClassId",
                table: "Student");

            migrationBuilder.RenameColumn(
                name: "CurrentClassId",
                table: "Student",
                newName: "ClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_CurrentClassId",
                table: "Student",
                newName: "IX_Student_ClassId");

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Class_ClassId",
                table: "Student",
                column: "ClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Student_Class_ClassId",
                table: "Student");

            migrationBuilder.RenameColumn(
                name: "ClassId",
                table: "Student",
                newName: "CurrentClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_ClassId",
                table: "Student",
                newName: "IX_Student_CurrentClassId");

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Class_CurrentClassId",
                table: "Student",
                column: "CurrentClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
