using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;

namespace digitalmaktabapi.Data
{
    public interface IRootRepository : IBaseRepository
    {
        Task<PagedList<Country>> GetCountries(UserParams userParams);
        Task<Country> GetCountry(Guid countryId);
        Task<PagedList<City>> GetCities(Guid countryId, UserParams userParams);
        Task<City> GetCity(Guid cityId);
        Task<PagedList<District>> GetDistricts(Guid cityId, UserParams userParams);
        Task<District> GetDistrict(Guid districtId);
        Task<PagedList<Book>> GetBooks(Guid? schoolId, UserParams userParams);
        Task<Book> GetBook(Guid bookId);
    }
}