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
using System.Net.Http.Headers;

namespace digitalmaktabapi.Helpers
{
    public static class Extensions
    {
        private static Session? session;
        public static void AddApplicationError(this HttpResponse response, string message)
        {
            response.Headers.Add("Application-Error", message);
            response.Headers.Add("Access-Control-Expose-Headers", "Application-Error");
            response.Headers.Add("Access-Control-Allow-Origin", "*");
        }

        public static void AddPagintaion(this HttpResponse response, int currentPage, int itemsPerPage, int totalItems, int totalPages)
        {
            var paginationHeader = new PaginationHeader(currentPage, itemsPerPage, totalItems, totalPages);
            var camelCaseFormatter = new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            };
            response.Headers.Add("Pagination", JsonConvert.SerializeObject(paginationHeader, camelCaseFormatter));
            response.Headers.Add("Access-Control-Expose-Headers", "Pagination");
        }

        public static async void ErrorResponse(this HttpResponse response, string message)
        {
            response.StatusCode = 400;
            var bytes = Encoding.UTF8.GetBytes(message);
            await response.Body.WriteAsync(bytes);
        }

        public static Session GetSessionDetails(ControllerBase controller)
        {
            Guid id = Guid.Parse(controller.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            string userRoleString = controller.User.FindFirst(ClaimTypes.Role)!.Value;
            string email = controller.User.FindFirst(ClaimTypes.Email)!.Value;

            if (!Enum.TryParse(userRoleString, out UserRole userRole))
            {
                userRole = UserRole.UNKNOWN;
            }

            session = new Session
            {
                Id = id,
                Email = email,
                UserRole = userRole
            };
            return session;
        }

        public static bool VerifyPasswordHash(string password, byte[] passwordHash, byte[] passwordSalt)
        {
            using (var hmac = new System.Security.Cryptography.HMACSHA512(passwordSalt))
            {
                var computedHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));

                for (int i = 0; i < computedHash.Length; i++)
                {
                    if (computedHash[i] != passwordHash[i]) return false;
                }

                return true;
            }
        }

        public static void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
        {
            using (var hmac = new System.Security.Cryptography.HMACSHA512())
            {
                passwordSalt = hmac.Key;
                passwordHash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(password));
            }
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
    }
}