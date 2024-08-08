using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class StudentTableNameChanged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Students_StudentId",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Enrollment_Students_StudentId",
                table: "Enrollment");

            migrationBuilder.DropForeignKey(
                name: "FK_Fee_Students_StudentId",
                table: "Fee");

            migrationBuilder.DropForeignKey(
                name: "FK_Schedule_Students_StudentId",
                table: "Schedule");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Branch_CurrentBranchId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Branch_JoiningBranchId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_CalendarYear_CalendarYearId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Class_CurrentClassId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Class_JoiningClassId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_Country_PhoneNumber_CountryId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_District_PrimaryAddress_DistrictId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_District_SecondaryAddress_DistrictId",
                table: "Students");

            migrationBuilder.DropForeignKey(
                name: "FK_Students_School_SchoolId",
                table: "Students");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Students",
                table: "Students");

            migrationBuilder.RenameTable(
                name: "Students",
                newName: "Student");

            migrationBuilder.RenameIndex(
                name: "IX_Students_SecondaryAddress_DistrictId",
                table: "Student",
                newName: "IX_Student_SecondaryAddress_DistrictId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_SchoolId",
                table: "Student",
                newName: "IX_Student_SchoolId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_PrimaryAddress_DistrictId",
                table: "Student",
                newName: "IX_Student_PrimaryAddress_DistrictId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_PhoneNumber_CountryId",
                table: "Student",
                newName: "IX_Student_PhoneNumber_CountryId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_JoiningClassId",
                table: "Student",
                newName: "IX_Student_JoiningClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_JoiningBranchId",
                table: "Student",
                newName: "IX_Student_JoiningBranchId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_CurrentClassId",
                table: "Student",
                newName: "IX_Student_CurrentClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_CurrentBranchId",
                table: "Student",
                newName: "IX_Student_CurrentBranchId");

            migrationBuilder.RenameIndex(
                name: "IX_Students_CalendarYearId",
                table: "Student",
                newName: "IX_Student_CalendarYearId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Student",
                table: "Student",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollment_Student_StudentId",
                table: "Enrollment",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Fee_Student_StudentId",
                table: "Fee",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Schedule_Student_StudentId",
                table: "Schedule",
                column: "StudentId",
                principalTable: "Student",
                principalColumn: "Id");

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

            migrationBuilder.AddForeignKey(
                name: "FK_Student_CalendarYear_CalendarYearId",
                table: "Student",
                column: "CalendarYearId",
                principalTable: "CalendarYear",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Class_CurrentClassId",
                table: "Student",
                column: "CurrentClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Class_JoiningClassId",
                table: "Student",
                column: "JoiningClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Student_Country_PhoneNumber_CountryId",
                table: "Student",
                column: "PhoneNumber_CountryId",
                principalTable: "Country",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Student_District_PrimaryAddress_DistrictId",
                table: "Student",
                column: "PrimaryAddress_DistrictId",
                principalTable: "District",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Student_District_SecondaryAddress_DistrictId",
                table: "Student",
                column: "SecondaryAddress_DistrictId",
                principalTable: "District",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Student_School_SchoolId",
                table: "Student",
                column: "SchoolId",
                principalTable: "School",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Attendance_Student_StudentId",
                table: "Attendance");

            migrationBuilder.DropForeignKey(
                name: "FK_Enrollment_Student_StudentId",
                table: "Enrollment");

            migrationBuilder.DropForeignKey(
                name: "FK_Fee_Student_StudentId",
                table: "Fee");

            migrationBuilder.DropForeignKey(
                name: "FK_Schedule_Student_StudentId",
                table: "Schedule");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Branch_CurrentBranchId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Branch_JoiningBranchId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_CalendarYear_CalendarYearId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Class_CurrentClassId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Class_JoiningClassId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_Country_PhoneNumber_CountryId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_District_PrimaryAddress_DistrictId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_District_SecondaryAddress_DistrictId",
                table: "Student");

            migrationBuilder.DropForeignKey(
                name: "FK_Student_School_SchoolId",
                table: "Student");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Student",
                table: "Student");

            migrationBuilder.RenameTable(
                name: "Student",
                newName: "Students");

            migrationBuilder.RenameIndex(
                name: "IX_Student_SecondaryAddress_DistrictId",
                table: "Students",
                newName: "IX_Students_SecondaryAddress_DistrictId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_SchoolId",
                table: "Students",
                newName: "IX_Students_SchoolId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_PrimaryAddress_DistrictId",
                table: "Students",
                newName: "IX_Students_PrimaryAddress_DistrictId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_PhoneNumber_CountryId",
                table: "Students",
                newName: "IX_Students_PhoneNumber_CountryId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_JoiningClassId",
                table: "Students",
                newName: "IX_Students_JoiningClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_JoiningBranchId",
                table: "Students",
                newName: "IX_Students_JoiningBranchId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_CurrentClassId",
                table: "Students",
                newName: "IX_Students_CurrentClassId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_CurrentBranchId",
                table: "Students",
                newName: "IX_Students_CurrentBranchId");

            migrationBuilder.RenameIndex(
                name: "IX_Student_CalendarYearId",
                table: "Students",
                newName: "IX_Students_CalendarYearId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Students",
                table: "Students",
                column: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Attendance_Students_StudentId",
                table: "Attendance",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Enrollment_Students_StudentId",
                table: "Enrollment",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Fee_Students_StudentId",
                table: "Fee",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Schedule_Students_StudentId",
                table: "Schedule",
                column: "StudentId",
                principalTable: "Students",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Branch_CurrentBranchId",
                table: "Students",
                column: "CurrentBranchId",
                principalTable: "Branch",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Branch_JoiningBranchId",
                table: "Students",
                column: "JoiningBranchId",
                principalTable: "Branch",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_CalendarYear_CalendarYearId",
                table: "Students",
                column: "CalendarYearId",
                principalTable: "CalendarYear",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Class_CurrentClassId",
                table: "Students",
                column: "CurrentClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Class_JoiningClassId",
                table: "Students",
                column: "JoiningClassId",
                principalTable: "Class",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_Country_PhoneNumber_CountryId",
                table: "Students",
                column: "PhoneNumber_CountryId",
                principalTable: "Country",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_Students_District_PrimaryAddress_DistrictId",
                table: "Students",
                column: "PrimaryAddress_DistrictId",
                principalTable: "District",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_District_SecondaryAddress_DistrictId",
                table: "Students",
                column: "SecondaryAddress_DistrictId",
                principalTable: "District",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Students_School_SchoolId",
                table: "Students",
                column: "SchoolId",
                principalTable: "School",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
