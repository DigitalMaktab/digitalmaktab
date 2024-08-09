using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MainController(
        IRootRepository rootRepository,
        IStringLocalizer<MainController> localizer) : ControllerBase
    {
        private readonly IRootRepository rootRepository = rootRepository;
        private readonly IStringLocalizer<MainController> localizer = localizer;


        [HttpGet("books")]
        public async Task<IActionResult> GetBooks([FromQuery] UserParams userParams)
        {
            Guid schoolId = Extensions.GetSessionDetails(this).SchoolId;
            var books = await this.rootRepository.GetBooks(schoolId, userParams);
            return Ok(books);
        }


        [HttpGet("countries")]
        public async Task<IActionResult> GetCountries([FromQuery] UserParams userParams)
        {
            var countires = await this.rootRepository.GetCountries(userParams);
            return Ok(countires);
        }

        [HttpGet("country/{countryId}")]
        public async Task<IActionResult> GetCountry(Guid countryId)
        {
            var country = await this.rootRepository.GetCountry(countryId);
            return Ok(country);
        }


        [HttpGet("cities/{countryId}")]
        public async Task<IActionResult> GetCities(Guid countryId, [FromQuery] UserParams userParams)
        {
            var cities = await this.rootRepository.GetCities(countryId, userParams);
            return Ok(cities);
        }

        [HttpGet("city/{cityId}")]
        public async Task<IActionResult> GetCity(Guid cityId)
        {
            var city = await this.rootRepository.GetCity(cityId);
            return Ok(city);
        }

        [HttpGet("districts/{cityId}")]
        public async Task<IActionResult> GetDistricts(Guid cityId, [FromQuery] UserParams userParams)
        {
            var districts = await this.rootRepository.GetDistricts(cityId, userParams);
            return Ok(districts);
        }

        [HttpGet("district/{districtId}")]
        public async Task<IActionResult> GetDistrict(Guid districtId)
        {
            var district = await this.rootRepository.GetDistrict(districtId);
            return Ok(district);
        }

        [HttpGet("classNames")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetClassNames()
        {
            var classTypes = GetEnumList<ClassName>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("className/{id}")]
        public async Task<ActionResult<EnumsDto>> GetClassName(int id)
        {
            return await GetEnumResponse<ClassName>(id);
        }

        [HttpGet("classTypes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetClasTypes()
        {
            var classTypes = GetEnumList<ClassType>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("classType/{id}")]
        public async Task<ActionResult<EnumsDto>> GetClassType(int id)
        {
            return await GetEnumResponse<ClassType>(id);
        }


        [HttpGet("bloodGroups")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetBloodGroups()
        {
            var classTypes = GetEnumList<BloodGroup>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("bloodGroup/{id}")]
        public async Task<ActionResult<EnumsDto>> GetBloodGroup(int id)
        {
            return await GetEnumResponse<BloodGroup>(id);
        }

        [HttpGet("disabilities")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetDisabilities()
        {
            var classTypes = GetEnumList<DisabilityType>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("disability/{id}")]
        public async Task<ActionResult<EnumsDto>> GetDisability(int id)
        {
            return await GetEnumResponse<DisabilityType>(id);
        }

        [HttpGet("examTypes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetExamTypes()
        {
            var classTypes = GetEnumList<ExamType>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("examType/{id}")]
        public async Task<ActionResult<EnumsDto>> GetExamType(int id)
        {
            return await GetEnumResponse<ExamType>(id);
        }


        [HttpGet("genders")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetGenders()
        {
            var classTypes = GetEnumList<Gender>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("gender/{id}")]
        public async Task<ActionResult<EnumsDto>> GetGender(int id)
        {
            return await GetEnumResponse<Gender>(id);
        }

        [HttpGet("isOrphans")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetIsOrphans()
        {
            var classTypes = GetEnumList<IsOrphan>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("isOrphan/{id}")]
        public async Task<ActionResult<EnumsDto>> GetIsOrphan(int id)
        {
            return await GetEnumResponse<IsOrphan>(id);
        }


        [HttpGet("languages")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetLanguages()
        {
            var classTypes = GetEnumList<Language>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("language/{id}")]
        public async Task<ActionResult<EnumsDto>> GetLanguage(int id)
        {
            return await GetEnumResponse<Language>(id);
        }

        [HttpGet("months")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetMonths()
        {
            var classTypes = GetEnumList<Month>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("month/{id}")]
        public async Task<ActionResult<EnumsDto>> GetMonth(int id)
        {
            return await GetEnumResponse<Month>(id);
        }

        [HttpGet("scheduleTimes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetSchedculeTimes()
        {
            var classTypes = GetEnumList<ScheduleTime>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("scheduleTime/{id}")]
        public async Task<ActionResult<EnumsDto>> GetScheduleTime(int id)
        {
            return await GetEnumResponse<ScheduleTime>(id);
        }

        [HttpGet("shifts")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetShifts()
        {
            var classTypes = GetEnumList<Shift>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("shift/{id}")]
        public async Task<ActionResult<EnumsDto>> GetShift(int id)
        {
            return await GetEnumResponse<Shift>(id);
        }

        [HttpGet("addressTypes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetAddressTypes()
        {
            var classTypes = GetEnumList<AddressType>();
            return await Task.FromResult(Ok(classTypes));
        }

        [HttpGet("addressType/{id}")]
        public async Task<ActionResult<EnumsDto>> GetAddressType(int id)
        {
            return await GetEnumResponse<AddressType>(id);
        }

        [HttpGet("calendarYears")]
        public async Task<IActionResult> GetCalendarYears([FromQuery] UserParams userParams)
        {
            var calendarYears = await this.rootRepository.GetCalendarYears(userParams);
            return Ok(calendarYears);
        }

        [HttpGet("calendarYear/{calendarYearId}")]
        public async Task<IActionResult> GetCalendarYear(Guid calendarYearId)
        {
            var calendarYear = await this.rootRepository.GetCalendarYear(calendarYearId);
            return Ok(calendarYear);
        }

        // Helper methods

        private List<EnumsDto> GetEnumList<T>() where T : Enum
        {
            return Enum.GetValues(typeof(T))
                        .Cast<T>()
                        .Select(e => new EnumsDto
                        {
                            Id = Convert.ToInt32(e),
                            Name = this.localizer[e.ToString()].Value
                        }).ToList();
        }

        private EnumsDto GetEnumById<T>(int id) where T : Enum
        {
            var enumValue = (T)Enum.ToObject(typeof(T), id);
            return new EnumsDto
            {
                Id = id,
                Name = this.localizer[enumValue.ToString()].Value
            };
        }

        private async Task<ActionResult<EnumsDto>> GetEnumResponse<T>(int id) where T : Enum
        {
            if (Enum.IsDefined(typeof(T), id))
            {
                var enumValue = GetEnumById<T>(id);
                return await Task.FromResult(Ok(enumValue));
            }
            else
            {
                return await Task.FromResult(NotFound());
            }
        }
    }
}