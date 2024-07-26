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
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
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

            // modelBuilder.Entity<School>()
            //     .OwnsOne(a => a.Address, address =>
            //     {
            //         address.WithOwner().HasForeignKey("SchoolId");
            //         address.HasOne(d => d.District)
            //         .WithMany()
            //         .HasForeignKey(a => a.DistrictId);
            //     });

            // modelBuilder.Entity<School>()
            //     .OwnsOne(a => a.PhoneNumber, pn =>
            //     {
            //         pn.WithOwner().HasForeignKey("SchoolId");
            //         pn.HasOne(d => d.Country)
            //         .WithMany()
            //         .HasForeignKey(a => a.CountryId);
            //     });

            // modelBuilder.Entity<Student>()
            //     .OwnsOne(a => a.PrimaryAddress, address =>
            //     {
            //         address.WithOwner().HasForeignKey("StudentId");
            //         address.HasOne(d => d.District)
            //         .WithMany()
            //         .HasForeignKey(a => a.DistrictId);
            //     });
            // modelBuilder.Entity<Student>()
            //     .OwnsOne(a => a.SecondaryAddress, address =>
            //     {
            //         address.WithOwner().HasForeignKey("StudentId");
            //         address.HasOne(d => d.District)
            //         .WithMany()
            //         .HasForeignKey(a => a.DistrictId);
            //     });
            // modelBuilder.Entity<Student>()
            //     .OwnsOne(a => a.PhoneNumber, pn =>
            //     {
            //         pn.WithOwner().HasForeignKey("StudentId");
            //         pn.HasOne(d => d.Country)
            //         .WithMany()
            //         .HasForeignKey(a => a.CountryId);
            //     });

            modelBuilder.Entity<School>().OwnsOne(a => a.Address);
            modelBuilder.Entity<School>().OwnsOne(a => a.PhoneNumber);

            modelBuilder.Entity<Student>().OwnsOne(a => a.PrimaryAddress);
            modelBuilder.Entity<Student>().OwnsOne(a => a.SecondaryAddress);
            modelBuilder.Entity<Student>().OwnsOne(a => a.PhoneNumber);
            modelBuilder.Entity<Student>().OwnsOne(a => a.NationalId);

        }
    }
}