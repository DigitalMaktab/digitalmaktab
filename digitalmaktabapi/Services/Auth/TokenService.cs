using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using digitalmaktabapi.Helpers;
using DotCommon.Extensions;
using Microsoft.IdentityModel.Tokens;

namespace digitalmaktabapi.Services.Auth
{
    public class TokenService(IConfiguration configuration)
    {
        private readonly IConfiguration configuration = configuration;

        public string GenerateToken(Session session)
        {
            var claims = new[]
                        {
                new Claim(ClaimTypes.NameIdentifier, session.Id.ToString()),
                new Claim(ClaimTypes.Email, session.Email),
                new Claim(ClaimTypes.Role, session.UserRole.ToString()),
                new Claim(ClaimTypes.Sid, session.SchoolId.ToString())
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