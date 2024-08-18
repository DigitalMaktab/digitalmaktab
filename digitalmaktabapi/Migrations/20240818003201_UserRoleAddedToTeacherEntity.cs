using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class UserRoleAddedToTeacherEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "UserRole",
                table: "Teacher",
                type: "INTEGER",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "INTEGER",
                oldDefaultValue: 3);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "UserRole",
                table: "Teacher",
                type: "INTEGER",
                nullable: false,
                defaultValue: 3,
                oldClrType: typeof(int),
                oldType: "INTEGER");
        }
    }
}
