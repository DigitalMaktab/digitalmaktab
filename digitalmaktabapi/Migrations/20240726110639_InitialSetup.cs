using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class InitialSetup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Branch",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    BranchName = table.Column<string>(type: "TEXT", nullable: false),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Branch", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Country",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    CountryName = table.Column<string>(type: "TEXT", nullable: false),
                    CountryCode = table.Column<string>(type: "TEXT", nullable: false),
                    CountryPhoneCode = table.Column<string>(type: "TEXT", nullable: false),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Country", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "City",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    StateCode = table.Column<string>(type: "TEXT", nullable: false),
                    StateName = table.Column<string>(type: "TEXT", nullable: false),
                    CountryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_City", x => x.Id);
                    table.ForeignKey(
                        name: "FK_City_Country_CountryId",
                        column: x => x.CountryId,
                        principalTable: "Country",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "District",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    DistrictName = table.Column<string>(type: "TEXT", nullable: false),
                    CityId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_District", x => x.Id);
                    table.ForeignKey(
                        name: "FK_District_City_CityId",
                        column: x => x.CityId,
                        principalTable: "City",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "School",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SchoolName = table.Column<string>(type: "TEXT", nullable: false),
                    Address_Street = table.Column<string>(type: "TEXT", nullable: true),
                    Address_DistrictId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Address_Village = table.Column<string>(type: "TEXT", nullable: true),
                    Address_Region = table.Column<string>(type: "TEXT", nullable: true),
                    Address_PostalCode = table.Column<string>(type: "TEXT", nullable: true),
                    Address_AddressType = table.Column<int>(type: "INTEGER", nullable: true),
                    PhoneNumber_CountryId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PhoneNumber_Number = table.Column<string>(type: "TEXT", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<byte[]>(type: "BLOB", nullable: false),
                    PasswordSalt = table.Column<byte[]>(type: "BLOB", nullable: false),
                    Logo = table.Column<string>(type: "TEXT", nullable: false),
                    Code = table.Column<int>(type: "INTEGER", nullable: false),
                    UserRole = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_School", x => x.Id);
                    table.ForeignKey(
                        name: "FK_School_Country_PhoneNumber_CountryId",
                        column: x => x.PhoneNumber_CountryId,
                        principalTable: "Country",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_School_District_Address_DistrictId",
                        column: x => x.Address_DistrictId,
                        principalTable: "District",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Students",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    SchoolId = table.Column<Guid>(type: "TEXT", nullable: false),
                    FirstNameNative = table.Column<string>(type: "TEXT", nullable: false),
                    LastNameNative = table.Column<string>(type: "TEXT", nullable: false),
                    FatherNameNative = table.Column<string>(type: "TEXT", nullable: false),
                    GrandFatherNameNative = table.Column<string>(type: "TEXT", nullable: false),
                    FirstNameEnglish = table.Column<string>(type: "TEXT", nullable: false),
                    LastNameEnglish = table.Column<string>(type: "TEXT", nullable: false),
                    FatherNameEnglish = table.Column<string>(type: "TEXT", nullable: false),
                    GrandFatherNameEnglish = table.Column<string>(type: "TEXT", nullable: false),
                    AsasNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    JoiningYear = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    JoiningAge = table.Column<int>(type: "INTEGER", nullable: false),
                    JoiningClass = table.Column<int>(type: "INTEGER", nullable: false),
                    JoiningBranchId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CurrentClass = table.Column<int>(type: "INTEGER", nullable: false),
                    ClassType = table.Column<int>(type: "INTEGER", nullable: false),
                    CurrentBranchId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Shift = table.Column<int>(type: "INTEGER", nullable: false),
                    PrimaryAddress_Street = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryAddress_DistrictId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PrimaryAddress_Village = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryAddress_Region = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryAddress_PostalCode = table.Column<string>(type: "TEXT", nullable: true),
                    PrimaryAddress_AddressType = table.Column<int>(type: "INTEGER", nullable: true),
                    SecondaryAddress_Street = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryAddress_DistrictId = table.Column<Guid>(type: "TEXT", nullable: true),
                    SecondaryAddress_Village = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryAddress_Region = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryAddress_PostalCode = table.Column<string>(type: "TEXT", nullable: true),
                    SecondaryAddress_AddressType = table.Column<int>(type: "INTEGER", nullable: true),
                    NationalId_ElectoricNationIdNumber = table.Column<string>(type: "TEXT", nullable: true),
                    NationalId_NationalIdNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    NationalId_Volume = table.Column<int>(type: "INTEGER", nullable: true),
                    NationalId_Page = table.Column<int>(type: "INTEGER", nullable: true),
                    NationalId_RegisterNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    BrotherName = table.Column<string>(type: "TEXT", nullable: true),
                    FUncleName = table.Column<string>(type: "TEXT", nullable: true),
                    FCousinName = table.Column<string>(type: "TEXT", nullable: true),
                    MUncleName = table.Column<string>(type: "TEXT", nullable: true),
                    MCousinName = table.Column<string>(type: "TEXT", nullable: true),
                    PhoneNumber_CountryId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PhoneNumber_Number = table.Column<string>(type: "TEXT", nullable: true),
                    BloodGroup = table.Column<int>(type: "INTEGER", nullable: true),
                    DisabilityType = table.Column<int>(type: "INTEGER", nullable: false),
                    IsOrphan = table.Column<int>(type: "INTEGER", nullable: false),
                    MotherTongue = table.Column<int>(type: "INTEGER", nullable: false),
                    DateOfBirth = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Gender = table.Column<int>(type: "INTEGER", nullable: false),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<byte[]>(type: "BLOB", nullable: false),
                    PasswordSalt = table.Column<byte[]>(type: "BLOB", nullable: false),
                    UserRole = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 4),
                    CreationUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreationDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdateUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    UpdateDate = table.Column<DateTime>(type: "TEXT", nullable: true, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Status = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Students", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Students_Branch_CurrentBranchId",
                        column: x => x.CurrentBranchId,
                        principalTable: "Branch",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Students_Branch_JoiningBranchId",
                        column: x => x.JoiningBranchId,
                        principalTable: "Branch",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Students_Country_PhoneNumber_CountryId",
                        column: x => x.PhoneNumber_CountryId,
                        principalTable: "Country",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Students_District_PrimaryAddress_DistrictId",
                        column: x => x.PrimaryAddress_DistrictId,
                        principalTable: "District",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Students_District_SecondaryAddress_DistrictId",
                        column: x => x.SecondaryAddress_DistrictId,
                        principalTable: "District",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Students_School_SchoolId",
                        column: x => x.SchoolId,
                        principalTable: "School",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_City_CountryId",
                table: "City",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_District_CityId",
                table: "District",
                column: "CityId");

            migrationBuilder.CreateIndex(
                name: "IX_School_Address_DistrictId",
                table: "School",
                column: "Address_DistrictId");

            migrationBuilder.CreateIndex(
                name: "IX_School_PhoneNumber_CountryId",
                table: "School",
                column: "PhoneNumber_CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_CurrentBranchId",
                table: "Students",
                column: "CurrentBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_JoiningBranchId",
                table: "Students",
                column: "JoiningBranchId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_PhoneNumber_CountryId",
                table: "Students",
                column: "PhoneNumber_CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_PrimaryAddress_DistrictId",
                table: "Students",
                column: "PrimaryAddress_DistrictId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_SchoolId",
                table: "Students",
                column: "SchoolId");

            migrationBuilder.CreateIndex(
                name: "IX_Students_SecondaryAddress_DistrictId",
                table: "Students",
                column: "SecondaryAddress_DistrictId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Students");

            migrationBuilder.DropTable(
                name: "Branch");

            migrationBuilder.DropTable(
                name: "School");

            migrationBuilder.DropTable(
                name: "District");

            migrationBuilder.DropTable(
                name: "City");

            migrationBuilder.DropTable(
                name: "Country");
        }
    }
}
