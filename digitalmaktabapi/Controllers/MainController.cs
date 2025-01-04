using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Data;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Headers;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;
using DayOfWeek = digitalmaktabapi.Models.DayOfWeek;

namespace digitalmaktabapi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MainController(IRootRepository rootRepository,
    IMapper mapper,
    IStringLocalizer<MainController> localizer) : BaseController(mapper, localizer)
    {
        private readonly IRootRepository rootRepository = rootRepository;

        [HttpGet("books")]
        public async Task<IActionResult> GetBooks([FromQuery] UserParams userParams)
        {
            var books = await this.rootRepository.GetBooks(this.SchoolId, userParams);
            var booksToReturn = this.mapper!.Map<ICollection<BookDto>>(books);
            Response.AddPagintaion(books.CurrentPage, books.PageSize, books.TotalCount, books.TotalPages);
            return Ok(booksToReturn);
        }

        [HttpGet("subjects")]
        public async Task<IActionResult> GetSubjects([FromQuery] UserParams userParams)
        {
            var subjects = await this.rootRepository.GetSubjects(userParams);
            var subjectsToReturn = this.mapper!.Map<ICollection<SubjectDto>>(subjects);
            Response.AddPagintaion(subjects.CurrentPage, subjects.PageSize, subjects.TotalCount, subjects.TotalPages);
            return Ok(subjectsToReturn);
        }

        [AllowAnonymous]
        [HttpGet("subject/{subjectId}")]
        public async Task<IActionResult> GetSubject(Guid subjectId)
        {
            var subject = await this.rootRepository.GetSubject(subjectId);
            var subjectToReturn = this.mapper!.Map<SubjectDto>(subject);
            return Ok(subjectToReturn);
        }

        [AllowAnonymous]
        [HttpGet("countries")]
        public async Task<IActionResult> GetCountries([FromQuery] UserParams userParams)
        {
            var countires = await this.rootRepository.GetCountries(userParams);
            var countreisToReturn = this.mapper!.Map<ICollection<CountryDto>>(countires);
            Response.AddPagintaion(countires.CurrentPage, countires.PageSize, countires.TotalCount, countires.TotalPages);
            return Ok(countreisToReturn);
        }

        [AllowAnonymous]
        [HttpGet("country/{countryId}")]
        public async Task<IActionResult> GetCountry(Guid countryId)
        {
            var country = await this.rootRepository.GetCountry(countryId);
            var countryToReturn = this.mapper!.Map<CountryDto>(country);
            return Ok(countryToReturn);
        }

        [HttpGet("cities/{countryId}")]
        public async Task<IActionResult> GetCities(Guid countryId, [FromQuery] UserParams userParams)
        {
            var cities = await this.rootRepository.GetCities(countryId, userParams);
            var citiesToReturn = this.mapper!.Map<ICollection<CityDto>>(cities);
            Response.AddPagintaion(cities.CurrentPage, cities.PageSize, cities.TotalCount, cities.TotalPages);
            return Ok(citiesToReturn);
        }

        [HttpGet("city/{cityId}")]
        public async Task<IActionResult> GetCity(Guid cityId)
        {
            var city = await this.rootRepository.GetCity(cityId);
            var cityToReturn = this.mapper!.Map<CityDto>(city);
            return Ok(cityToReturn);
        }

        [HttpGet("districts/{cityId}")]
        public async Task<IActionResult> GetDistricts(Guid cityId, [FromQuery] UserParams userParams)
        {
            var districts = await this.rootRepository.GetDistricts(cityId, userParams);
            var districtsToReturn = this.mapper!.Map<ICollection<DistrictDto>>(districts);
            Response.AddPagintaion(districts.CurrentPage, districts.PageSize, districts.TotalCount, districts.TotalPages);
            return Ok(districtsToReturn);
        }

        [HttpGet("district/{districtId}")]
        public async Task<IActionResult> GetDistrict(Guid districtId)
        {
            var district = await this.rootRepository.GetDistrict(districtId);
            var districtToReturn = this.mapper!.Map<DistrictDto>(district);
            return Ok(districtToReturn);
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
            var months = GetEnumList<Month>();
            return await Task.FromResult(Ok(months));
        }

        [HttpGet("month/{id}")]
        public async Task<ActionResult<EnumsDto>> GetMonth(int id)
        {
            return await GetEnumResponse<Month>(id);
        }

        [HttpGet("days")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetDays()
        {
            var days = GetEnumList<DayOfWeek>();
            return await Task.FromResult(Ok(days));
        }

        [HttpGet("day/{id}")]
        public async Task<ActionResult<EnumsDto>> GetDay(int id)
        {
            return await GetEnumResponse<DayOfWeek>(id);
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
            var calendarYearsToReturn = this.mapper!.Map<ICollection<CalendarYearDto>>(calendarYears);
            Response.AddPagintaion(calendarYears.CurrentPage, calendarYears.PageSize, calendarYears.TotalCount, calendarYears.TotalPages);
            return Ok(calendarYearsToReturn);
        }

        [HttpGet("calendarYear/{calendarYearId}")]
        public async Task<IActionResult> GetCalendarYear(Guid calendarYearId)
        {
            return Ok(this.mapper!.Map<CalendarYear>(await this.rootRepository.GetCalendarYear(calendarYearId)));
        }

        [HttpGet("activeCalendarYear")]
        public async Task<IActionResult> GetActiveCalendarYear()
        {
            return Ok(this.mapper!.Map<CalendarYearDto>(await this.rootRepository.GetActiveCalendarYear()));
        }

        [AllowAnonymous]
        [HttpGet("schoolTypes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetSchoolTypes()
        {
            var schoolTypes = GetEnumList<SchoolType>();
            return await Task.FromResult(Ok(schoolTypes));
        }

        [HttpGet("schoolType/{id}")]
        public async Task<ActionResult<EnumsDto>> GetSchoolType(int id)
        {
            return await GetEnumResponse<SchoolType>(id);
        }


        [HttpGet("learningMaterialTypes")]
        public async Task<ActionResult<IEnumerable<EnumsDto>>> GetLearningMaterialTypes()
        {
            var learningMaterialTypes = GetEnumList<LearningMaterialType>();
            return await Task.FromResult(Ok(learningMaterialTypes));
        }

        [HttpGet("learningMaterialType/{id}")]
        public async Task<ActionResult<EnumsDto>> GetLearningMaterialType(int id)
        {
            return await GetEnumResponse<LearningMaterialType>(id);
        }

        // Helper methods

        private List<EnumsDto> GetEnumList<T>() where T : Enum
        {
            return Enum.GetValues(typeof(T))
                        .Cast<T>()
                        .Select(e => new EnumsDto
                        {
                            Id = Convert.ToInt32(e),
                            Name = this.localizer![e.ToString()].Value
                        }).ToList();
        }

        private EnumsDto GetEnumById<T>(int id) where T : Enum
        {
            var enumValue = (T)Enum.ToObject(typeof(T), id);
            return new EnumsDto
            {
                Id = id,
                Name = this.localizer![enumValue.ToString()].Value
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