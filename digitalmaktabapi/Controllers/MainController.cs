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
        public async Task<ActionResult<IEnumerable<ClassNamesDto>>> GetClassNames()
        {
            var classNames = Enum.GetValues(typeof(ClassName))
                            .Cast<ClassName>()
                            .Select(e => new ClassNamesDto
                            {
                                Id = (int)e,
                                ClassName = this.localizer[e.ToString()].Value
                            }).ToList();

            return await Task.FromResult(Ok(classNames));
        }

        [HttpGet("className/{id}")]
        public async Task<ActionResult<ClassNamesDto>> GetClassName(int id)
        {
            if (Enum.IsDefined(typeof(ClassName), id))
            {
                var className = (ClassName)id;
                var classNameModel = new ClassNamesDto
                {
                    Id = id,
                    ClassName = this.localizer[className.ToString()].Value
                };
                return await Task.FromResult(Ok(classNameModel));
            }
            else
            {
                return await Task.FromResult(NotFound());
            }
        }
    }
}