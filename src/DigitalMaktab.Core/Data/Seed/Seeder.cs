using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using Newtonsoft.Json;

namespace digitalmaktabapi.Data.Seed
{
    public class Seeder
    {

        public static void SeedData(WebApplication app)
        {
            try
            {
                using var scope = app.Services.CreateScope();
                DataContext context = scope.ServiceProvider.GetRequiredService<DataContext>();

                if (!context.Countries.Any())
                {
                    var countryData = System.IO.File.ReadAllText("Data/Seed/countries.json");
                    var countries = JsonConvert.DeserializeObject<List<Country>>(countryData);
                    var countryPhoneCodeData = System.IO.File.ReadAllText("Data/Seed/countryphonecodes.json");
                    var countryPhoneCodes = JsonConvert.DeserializeObject<List<CountryPhoneCode>>(countryPhoneCodeData);

                    var cityData = System.IO.File.ReadAllText("Data/Seed/cities.json");
                    List<City>? allStates = JsonConvert.DeserializeObject<List<City>>(cityData);

                    if (null != countries)
                    {
                        foreach (var country in countries)
                        {
                            Guid guid = Guid.NewGuid();
                            CountryPhoneCode? phoneCode = countryPhoneCodes?.FirstOrDefault(x => x.Code == country.CountryCode);
                            country.CountryPhoneCode = (phoneCode == null ? "no code" : phoneCode.DialCode)!;
                            country.Id = guid;
                            country.UpdateUserId = guid;
                            country.CreationUserId = guid;
                            if (null != allStates)
                            {
                                ICollection<City> cities = allStates.Where(s => s.CId == country.CId).ToList();
                                cities.ToList().ForEach(obj => obj.GetType().GetProperty("CountryId")?.SetValue(obj, guid));
                                country.Cities = cities;
                            }
                            context.Countries.Add(country);
                        }
                        context.SaveChanges();
                    }
                }

                if (!context.Users.Any())
                {
                    // Seed Root User
                    var rootUserPassword = app.Configuration["RootUserPassword"];
                    if (string.IsNullOrEmpty(rootUserPassword))
                    {
                        throw new ArgumentNullException(nameof(app), "Root user password is not configured.");
                    }

                    Extensions.CreatePasswordHash(rootUserPassword, out byte[] passwordHash, out byte[] passwordSalt);

                    var rootUser = new User
                    {
                        Id = Guid.NewGuid(),
                        Email = "root@digitalmaktab.com",
                        UserRole = UserRole.ROOT_USER,
                        CreationDate = DateTime.UtcNow,
                        UpdateDate = DateTime.UtcNow,
                        CreationUserId = Guid.Empty,
                        UpdateUserId = Guid.Empty,
                        FirstName = app.Configuration["RootUserFirstName"] ?? "DefaultFirstName",
                        LastName = app.Configuration["RootUserLastName"] ?? "DefaultLastName",
                        Status = true,
                        PasswordHash = passwordHash,
                        PasswordSalt = passwordSalt
                    };
                    context.Users.Add(rootUser);
                    context.SaveChanges();
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
        }

    }
}