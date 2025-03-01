using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class DataContext(DbContextOptions<DataContext> options) : DbContext(options)
    {
        public DbSet<School> Schools { get; set; }
        public DbSet<Student> Students { get; set; }
        public DbSet<Country> Countries { get; set; }
        public DbSet<City> Cities { get; set; }
        public DbSet<District> Districts { get; set; }
        public DbSet<Book> Books { get; set; }
        public DbSet<CalendarYear> CalendarYears { get; set; }
        public DbSet<Subject> Subjects { get; set; }
        public DbSet<Class> Classes { get; set; }
        public DbSet<Course> Courses { get; set; }
        public DbSet<Enrollment> Enrollments { get; set; }
        public DbSet<Fee> Fees { get; set; }
        public DbSet<Grade> Grades { get; set; }
        public DbSet<Schedule> Schedules { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<User> Users { get; set; }
        public DbSet<Branch> Branches { get; set; }
        public DbSet<Attendance> Attendances { get; set; }
        public DbSet<Assignment> Assignments { get; set; }
        public DbSet<LearningMaterial> LearningMaterials { get; set; }
        public DbSet<QuestionBank> QuestionBanks { get; set; }
        public DbSet<Quiz> Quizzes { get; set; }
        public DbSet<QuizAttemp> QuizAttemps { get; set; }
        public DbSet<AssignmentSubmission> AssignmentSubmissions { get; set; }
        public DbSet<Progress> Progresses { get; set; }
        public DbSet<CourseSection> CourseSections { get; set; }
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);


            // Set default delete behavior to Restrict for all relationships
            foreach (var foreignKey in modelBuilder.Model.GetEntityTypes()
                .SelectMany(e => e.GetForeignKeys()))
            {
                foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
            }

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(Base).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType).Property(nameof(Base.CreationDate))
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    modelBuilder.Entity(entityType.ClrType).Property(nameof(Base.UpdateDate))
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                }
            }

            foreach (var entityType in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(BaseNoIdentifier).IsAssignableFrom(entityType.ClrType))
                {
                    modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseNoIdentifier.CreationDate))
                        .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    modelBuilder.Entity(entityType.ClrType).Property(nameof(BaseNoIdentifier.UpdateDate))
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                }
            }

            modelBuilder.Entity<School>()
                .Property(a => a.UserRole)
                .HasDefaultValue(UserRole.ADMIN);

            modelBuilder.Entity<Student>()
                .Property(a => a.UserRole)
                .HasDefaultValue(UserRole.STUDENT);

            modelBuilder.Entity<User>()
                .Property(a => a.UserRole)
                .HasDefaultValue(UserRole.ROOT_USER);

            modelBuilder.Entity<School>().OwnsOne(a => a.Address);
            modelBuilder.Entity<School>().OwnsOne(a => a.PhoneNumber);

            modelBuilder.Entity<Student>().OwnsOne(a => a.PrimaryAddress);
            modelBuilder.Entity<Student>().OwnsOne(a => a.SecondaryAddress);
            modelBuilder.Entity<Student>().OwnsOne(a => a.PhoneNumber);
            modelBuilder.Entity<Student>().OwnsOne(a => a.NationalId);


            modelBuilder.Entity<Teacher>().OwnsOne(a => a.PrimaryAddress);
            modelBuilder.Entity<Teacher>().OwnsOne(a => a.PhoneNumber);
            modelBuilder.Entity<Class>()
                .HasOne(c => c.Teacher)
                .WithMany(t => t.Classes) // Assuming a teacher can teach multiple classes
                .HasForeignKey(c => c.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Subject>()
            .HasOne(a => a.Book)
                .WithOne(a => a.Subject)
                .HasForeignKey<Book>(a => a.SubjectId);
        }
    }
}