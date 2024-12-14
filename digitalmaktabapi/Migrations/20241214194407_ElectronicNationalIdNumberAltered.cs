using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class ElectronicNationalIdNumberAltered : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "NationalId_ElectoricNationIdNumber",
                table: "Student",
                newName: "NationalId_ElectronicNationalIdNumber");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "NationalId_ElectronicNationalIdNumber",
                table: "Student",
                newName: "NationalId_ElectoricNationIdNumber");
        }
    }
}
