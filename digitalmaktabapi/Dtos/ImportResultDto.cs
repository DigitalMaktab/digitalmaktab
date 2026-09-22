namespace digitalmaktabapi.Dtos
{
    // Shared shape for any bulk-import endpoint (students, teachers, …).
    // The Frontend BulkImportModal expects this JSON schema regardless of entity.
    public class ImportResultDto
    {
        public int TotalRows { get; set; }
        public int CreatedCount { get; set; }
        public int SkippedCount { get; set; }
        public List<ImportError> Errors { get; set; } = [];
        public List<ImportCredential> GeneratedPasswords { get; set; } = [];
    }

    public class ImportError
    {
        public required int Row { get; set; }
        public string? Field { get; set; }
        public required string Message { get; set; }
    }

    public class ImportCredential
    {
        public required string Email { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Password { get; set; }
    }
}
