using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace digitalmaktabapi.Migrations
{
    /// <inheritdoc />
    public partial class BookSubjectRelationshipAdded : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subject_Book_BookId",
                table: "Subject");

            migrationBuilder.DropIndex(
                name: "IX_Subject_BookId",
                table: "Subject");

            migrationBuilder.AddColumn<Guid>(
                name: "SubjectId",
                table: "Book",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Book_SubjectId",
                table: "Book",
                column: "SubjectId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Book_Subject_SubjectId",
                table: "Book",
                column: "SubjectId",
                principalTable: "Subject",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Book_Subject_SubjectId",
                table: "Book");

            migrationBuilder.DropIndex(
                name: "IX_Book_SubjectId",
                table: "Book");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "Book");

            migrationBuilder.CreateIndex(
                name: "IX_Subject_BookId",
                table: "Subject",
                column: "BookId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subject_Book_BookId",
                table: "Subject",
                column: "BookId",
                principalTable: "Book",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
