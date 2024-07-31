using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class RootRepository(DataContext context) : BaseRepository(context), IRootRepository
    {
        private readonly DataContext context = context;

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
                    a => a.Subject.ClassSubjects
                    .Any(a => a.ClassId == userParams.ClassId));
            }
            return await PagedList<Book>.CreateAsync(entities, userParams.PageNumber, userParams.PageSize);
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
            var entities = this.context.Countries.AsQueryable();
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
    }
}