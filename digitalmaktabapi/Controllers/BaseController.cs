using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Controllers
{
    public class BaseController : ControllerBase
    {
        protected readonly IMapper? mapper;
        protected readonly IStringLocalizer? localizer;

        // Properties to hold session details
        protected Guid Id => SessionDetails.Id;
        protected Guid SchoolId => SessionDetails.SchoolId;
        protected string Email => SessionDetails.Email;
        protected UserRole UserRole => SessionDetails.UserRole;
        protected Guid CalendarYearId => SessionDetails.CalendarYearId;

        private Session? _sessionDetails;

        // Lazy initialization of session details
        protected Session SessionDetails
        {
            get
            {
                if (_sessionDetails == null)
                {
                    _sessionDetails = Extensions.GetSessionDetails(this);
                    if (_sessionDetails == null)
                    {
                        throw new UnauthorizedAccessException("Session details are not available.");
                    }
                }
                return _sessionDetails;
            }
        }

        // Constructor
        protected BaseController(IMapper? mapper = null, IStringLocalizer? localizer = null)
        {
            this.mapper = mapper;
            this.localizer = localizer;
        }
    }
}