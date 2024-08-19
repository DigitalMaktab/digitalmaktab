using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class AttendanceRectified : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Class_ClassId",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance");

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "Attendance",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AlterColumn<Guid>(
                name: "ClassId",
                table: "Attendance",
                type: "TEXT",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "TEXT");

            migrationBuilder.AddColumn<Guid>(
                name: "EnrollmentId",
                table: "Attendance",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Attendance_EnrollmentId",
                table: "Attendance",
                column: "EnrollmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Class_ClassId",
                table: "Attendance",
                column: "ClassId",
                principalTable: "Class",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Enrollment_EnrollmentId",
                table: "Attendance",
                column: "EnrollmentId",
                principalTable: "Enrollment",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Class_ClassId",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Enrollment_EnrollmentId",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance");

            migrationBuilder.DropIndex(
                name: "IX_Attendance_EnrollmentId",
                table: "Attendance");

            migrationBuilder.DropColumn(
                name: "EnrollmentId",
                table: "Attendance");

            migrationBuilder.AlterColumn<Guid>(
                name: "StudentId",
                table: "Attendance",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "ClassId",
                table: "Attendance",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "TEXT",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Class_ClassId",
                table: "Attendance",
                column: "ClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
