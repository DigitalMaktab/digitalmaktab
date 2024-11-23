using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using digitalmaktabapi.Models;
using FluentValidation;
using Microsoft.Extensions.Localization;

namespace digitalmaktabapi.Helpers
{
    public static class Extensions
    {
        private static Session? session;
        public static void AddApplicationError(this HttpResponse response, string message)
        {
            response.Headers.Append("Application-Error", message);
            response.Headers.Append("Access-Control-Expose-Headers", "Application-Error");
            response.Headers.Append("Access-Control-Allow-Origin", "*");
        }

        public static void AddPagintaion(this HttpResponse response, int currentPage, int itemsPerPage, int totalItems, int totalPages)
        {
            var paginationHeader = new PaginationHeader(currentPage, itemsPerPage, totalItems, totalPages);
            var camelCaseFormatter = new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            };
            response.Headers.Append("Pagination", JsonConvert.SerializeObject(paginationHeader, camelCaseFormatter));
            response.Headers.Append("Access-Control-Expose-Headers", "Pagination");
        }

        public static async void ErrorResponse(this HttpResponse response, string message)
        {
            response.StatusCode = 400;
            var bytes = Encoding.UTF8.GetBytes(message);
            await response.Body.WriteAsync(bytes);
        }

        public static Session GetSessionDetails(ControllerBase controller)
        {
            // Ensure `controller.User` is not null
            if (controller?.User == null || !controller.User.Identity?.IsAuthenticated == true)
            {
                throw new UnauthorizedAccessException("User is not authenticated.");
            }

            // Extract claims safely
            Guid id = ParseGuidClaim(controller.User.FindFirst(ClaimTypes.NameIdentifier), "NameIdentifier");
            string userRoleString = controller.User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;
            string email = controller.User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;
            Guid schoolId = ParseGuidClaim(controller.User.FindFirst(ClaimTypes.Sid), "Sid");

            // Optional claim for CalendarYearId
            Guid? calendarYearId = null;
            Claim? calendarYearIdClaim = controller.User.FindFirst(AppClaimTypes.CalendaryYearId);
            if (calendarYearIdClaim != null && Guid.TryParse(calendarYearIdClaim.Value, out Guid parsedGuid))
            {
                calendarYearId = parsedGuid;
            }

            // Parse user role safely
            if (!Enum.TryParse(userRoleString, out UserRole userRole))
            {
                userRole = UserRole.UNKNOWN;
            }

            // Create and return the session object
            return new Session
            {
                Id = id,
                Email = email,
                UserRole = userRole,
                SchoolId = schoolId,
                CalendarYearId = calendarYearId ?? Guid.Empty
            };
        }

        // Helper method for parsing GUID claims
        private static Guid ParseGuidClaim(Claim? claim, string claimType)
        {
            if (claim == null || !Guid.TryParse(claim.Value, out Guid guid))
            {
                throw new UnauthorizedAccessException($"Required claim '{claimType}' is missing or invalid.");
            }
            return guid;
        }


        public static bool VerifyPasswordHash(string password, byte[] passwordHash, byte[] passwordSalt)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA512(passwordSalt);
            var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));

            for (int i = 0; i < computedHash.Length; i++)
            {
                if (computedHash[i] != passwordHash[i]) return false;
            }

            return true;
        }

        public static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using var hmac = new System.Security.Cryptography.HMACSHA512();
            passwordSalt = hmac.Key;
            passwordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
        }


        public static int GenerateRandomCode()
        {
            Random random = new();
            int code;
            do
            {
                code = random.Next(100000, 999999); // Generates a random number between 0 and 999999 (inclusive).
            } while (code < 100000);
            return code;
        }

        public static string GeneratePassword(int length)
        {
            const string validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890!@#$%^&*()";
            Random random = new();
            return new string(Enumerable.Repeat(validChars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        public static RequestHeader GetRequestHeaders(HttpRequest request)
        {
            RequestHeader requestHeader = new();
            if (request.Headers.TryGetValue("Accept-Language", out var headerValue))
            {
                requestHeader.AcceptLanguage = headerValue.FirstOrDefault();
            }
            return requestHeader;
        }

        // Used to validate files with fluent validation.
        public static IRuleBuilderOptions<T, IFormFile?> ValidateFile<T>(
            this IRuleBuilder<T, IFormFile?> ruleBuilder,
            long maxSize,
            IStringLocalizer localizer,
            params string[] allowedExtensions)
        {
            return ruleBuilder
                .Must(file => file == null || file.Length > 0)
                .WithMessage(localizer["FileCannotBeEmpty"])
                .Must(file => file == null || file.Length <= maxSize)
                .WithMessage(localizer["FileSizeLimit", maxSize / (1024 * 1024)])
                .Must(file => file == null || allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower()))
                .WithMessage(localizer["AllowedFileTypes", string.Join(", ", allowedExtensions)]);
        }
    }
}