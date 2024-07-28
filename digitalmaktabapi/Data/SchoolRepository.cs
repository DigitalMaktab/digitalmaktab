using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Linq;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Models;
using Microsoft.EntityFrameworkCore;

namespace digitalmaktabapi.Data
{
    public class SchoolRepository(DataContext context, IRootRepository rootRepository) : BaseRepository(context), ISchoolRepository
    {
        private readonly DataContext context = context;
        private readonly IRootRepository rootRepository = rootRepository;

        public async Task<School> Authenticate(string email, string password)
        {
            var school = await this.context.Schools.FirstOrDefaultAsync(a => a.Email == email);
            if (school == null) return null;

            if (!Helpers.Extensions.VerifyPasswordHash(password, school.PasswordHash, school.PasswordSalt))
            {
                return null;
            }
            return school;
        }

        public async Task<bool> Exists(string prop)
        {
            if (await this.context.Schools.AnyAsync(a => a.Email == prop))
            {
                return true;
            }
            return false;
        }

        public async Task<School> GetSchool(Guid id)
        {
            var school = await this.context.Schools.FirstOrDefaultAsync(a => a.Id == id);
            return school;
        }

        public async Task<PagedList<School>> GetSchools(UserParams userParams)
        {
            var schools = this.context.Schools.AsQueryable();

            return await PagedList<School>.CreateAsync(schools, userParams.PageNumber, userParams.PageSize);
        }

        public async Task<School> Register(School school, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            school.PasswordHash = passwordHash;
            school.PasswordSalt = passwordSalt;

            District district = await this.rootRepository.GetDistrict(school.Address.DistrictId ?? Guid.Empty);
            school.Address.District = district;

            await this.context.Schools.AddAsync(school);
            await this.context.SaveChangesAsync();
            return school;
        }

        public async Task<bool> UpdatePassword(School school, string password)
        {
            Helpers.Extensions.CreatePasswordHash(password, out byte[] passwordHash, out byte[] passwordSalt);
            school.PasswordHash = passwordHash;
            school.PasswordHash = passwordHash;

            int changes = await this.context.SaveChangesAsync();
            return changes > 0;
        }
    }
}