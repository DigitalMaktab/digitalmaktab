using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class RootRepository(DataContext context) : BaseRepository(context), IRootRepository
    {
        private readonly DataContext context = context;

        public async Task<User> Authenticate(string email, string password)
        {
            var user = await this.context.Users.FirstOrDefaultAsync(a => a.Email == email && a.Status == true);
            if (user == null) return null;

            if (!Extensions.VerifyPasswordHash(password, user.PasswordHash, user.PasswordSalt))
            {
                return null;
            }
            return user;
        }

        public async Task<bool> Exists(string prop)
        {
            return await this.context.Users.AnyAsync(a => a.Email.ToLower().Equals(prop.ToLower()));
        }

        public async Task<CalendarYear> GetActiveCalendarYear()
        {
            var entity = await this.context.CalendarYears.FirstOrDefaultAsync(a => a.Status == true);
            return entity;
        }

        public async Task<Book> GetBook(Guid bookId)
        {
            var entity = await this.context.Books.FirstOrDefaultAsync(a => a.Id == bookId);
            return entity;
        }

        public async Task<PagedList<Book>> GetBooks(Guid? schoolId, UserParams userParams)
        {
            var entities = this.context.Books.
                Where(
                    a => a.SchoolId == schoolId ||
                    a.SchoolId == Guid.Empty ||
                    !a.SchoolId.HasValue).AsQueryable();

            if (userParams.ClassId.HasValue && userParams.ClassId != Guid.Empty)
            {
                entities = this.context.Books
                .Where(
                    a => a.Subject.Courses
                    .Any(a => a.ClassId == userParams.ClassId));
            }

            if (!string.IsNullOrEmpty(userParams.SearchTerm))
            {
                string searchTerm = userParams.SearchTerm.ToLower();
                entities = entities.Where(b => b.BookTitle.ToLower().Contains(searchTerm));
            }
            return await PagedList<Book>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }


        public async Task<Subject> GetSubject(Guid id)
        {
            var entity = await this.context.Subjects.Include(a => a.Book).FirstOrDefaultAsync(a => a.Id == id);
            return entity;
        }

        public async Task<PagedList<Subject>> GetSubjects(UserParams userParams)
        {
            var entities = this.context.Subjects
                .Include(a => a.Book)
                .AsQueryable();

            if (userParams.SearchTerm != null)
            {
                entities = entities.Where(
                    a => a.SubjectName.Contains(userParams.SearchTerm));
            }
            return await PagedList<Subject>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<CalendarYear> GetCalendarYear(Guid calendarYearId)
        {
            var entity = await this.context.CalendarYears.FirstOrDefaultAsync(a => a.Id == calendarYearId);
            return entity;
        }

        public async Task<PagedList<CalendarYear>> GetCalendarYears(UserParams userParams)
        {
            var entities = this.context.CalendarYears.AsQueryable();
            return await PagedList<CalendarYear>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<PagedList<City>> GetCities(Guid countryId, UserParams userParams)
        {
            var entities = this.context.Cities.Where(a => a.CountryId == countryId).AsQueryable();
            return await PagedList<City>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<City> GetCity(Guid cityId)
        {
            var entity = await this.context.Cities.FirstOrDefaultAsync(a => a.Id == cityId);
            return entity;
        }


        public async Task<PagedList<Country>> GetCountries(UserParams userParams)
        {
            // The supported countries needs to be properly created later with a separate table of it self.
            var supportedCountries = new[] { "AF" };
            var entities = this.context.Countries
                .Where(a => supportedCountries.Contains(a.CountryCode))
                .OrderBy(a => a.CountryName)
                .AsQueryable();
            return await PagedList<Country>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<Country> GetCountry(Guid countryId)
        {
            var entity = await this.context.Countries.FirstOrDefaultAsync(a => a.Id == countryId);
            return entity;
        }

        public async Task<District> GetDistrict(Guid districtId)
        {
            var entity = await this.context.Districts.FirstOrDefaultAsync(a => a.Id == districtId);
            return entity;
        }

        public async Task<PagedList<District>> GetDistricts(Guid cityId, UserParams userParams)
        {
            var entities = this.context.Districts.Where(a => a.CityId == cityId).AsQueryable();
            return await PagedList<District>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<User> Register(User user, string password)
        {
            Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;

            await this.context.Users.AddAsync(user);
            await this.context.SaveChangesAsync();
            return user;
        }

        public async Task<bool> UpdatePassword(User user, string password)
        {
            Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            user.PasswordHash = passwordHash;
            user.PasswordSalt = passwordSalt;
            return await this.context.SaveChangesAsync() > 0;
        }
    }
}