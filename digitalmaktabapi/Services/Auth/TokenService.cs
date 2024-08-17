using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using digitalmaktabapi.Data;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services.DMCryptography;
using DotCommon.Extensions;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace digitalmaktabapi.Services.Auth
{
    public class TokenService(IConfiguration configuration, DataContext dataContext)
    {
        private readonly IConfiguration configuration = configuration;
        private readonly DataContext dataContext = dataContext;

        public async Task<string> GenerateToken(Session session)
        {
            using var encryptionService = new CryptographyService();
            CalendarYear? calendarYear = await this.dataContext.CalendarYears.FirstOrDefaultAsync(a => a.Status == true);

            Claim? calendarYearIdClaim = new(AppClaimTypes.CalendaryYearId, "");

            if (calendarYear != null)
            {
                calendarYearIdClaim = new Claim(AppClaimTypes.CalendaryYearId, encryptionService.Encrypt(calendarYear.Id.ToString()));
            }

            var claims = new[]
                        {
                new Claim(ClaimTypes.NameIdentifier, encryptionService.Encrypt(session.Id.ToString())),
                new Claim(ClaimTypes.Email, encryptionService.Encrypt(session.Email)),
                new Claim(ClaimTypes.Role, encryptionService.Encrypt(session.UserRole.ToString())),
                new Claim(ClaimTypes.Sid, encryptionService.Encrypt(session.SchoolId.ToString())),
                calendarYearIdClaim
            };

            var key = new SymmetricSecurityKey(Encoding
                .UTF8.GetBytes(this.configuration.GetSection("AppSettings:Token").Value!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.Now.AddDays(30),
                SigningCredentials = creds,
                Issuer = this.configuration.GetSection("AppSettings:Issuer").Value!,
                Audience = this.configuration.GetSection("AppSettings:Audience").Value!
            };

            var tokenHandler = new JwtSecurityTokenHandler();

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new JwtSecurityTokenHandler().WriteToken(token);

        }
    }
}