using System.Threading.Tasks;
using digitalmaktabapi.Data;
using digitalmaktabapi.Models;
using Moq;
using Xunit;
using Microsoft.EntityFrameworkCore;
using digitalmaktabapi.Helpers;

public class SchoolRepositoryTests
{
    private readonly Mock<IRootRepository> _mockRootRepository;
    private readonly SchoolRepository _schoolRepository;
    private readonly DataContext _context;

    public SchoolRepositoryTests()
    {
        _mockRootRepository = new Mock<IRootRepository>();

        var options = new DbContextOptionsBuilder<DataContext>()
            .UseInMemoryDatabase(databaseName: "SchoolDatabase")
            .Options;

        _context = new DataContext(options);
        _schoolRepository = new SchoolRepository(_context, _mockRootRepository.Object);
    }

    [Fact]
    public async Task Authenticate_ShouldReturnNull_WhenSchoolNotFound()
    {
        // Arrange
        var email = "nonexistent@example.com";
        var password = "password";

        // Act
        var result = await _schoolRepository.Authenticate(email, password);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Authenticate_ShouldReturnNull_WhenPasswordIsIncorrect()
    {
        // Arrange
        var email = "test@example.com";
        var password = "wrongpassword";
        byte[] passwordHash = new byte[1024], passwordSalt = new byte[1024];
        var school = new School
        {
            Email = email,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            Status = true,
            SchoolName = "Test School",
            Address = new Address { Street = "123 Test St" },
            PhoneNumber = new PhoneNumber
            {
                Number = "123-456-7890",
                CountryId = Guid.NewGuid(),
                Country = new Country
                {
                    CountryName = "United States",
                    CountryCode = "US",
                    CountryPhoneCode = "+1",
                    Cities = new List<City>(),
                    CId = new Random().Next(),
                    Status = true
                }
            },
            Code = 123,
            UserRole = UserRole.ADMIN
        };

        _context.Schools.Add(school);
        await _context.SaveChangesAsync();

        // Act
        var result = await _schoolRepository.Authenticate(email, password);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task Authenticate_ShouldReturnSchool_WhenCredentialsAreCorrect()
    {
        // Arrange
        var email = "test@example.com";
        var password = "correctpassword";
        var passwordHash = new byte[] { /* hash */ };
        var passwordSalt = new byte[] { /* salt */ };

        Extensions.CreatePasswordHash(password, out passwordHash, out passwordSalt);

        var school = new School
        {
            Email = email,
            PasswordHash = passwordHash,
            PasswordSalt = passwordSalt,
            Status = true,
            SchoolName = "Test School",
            Address = new Address { Street = "123 Test St" },
            PhoneNumber = new PhoneNumber
            {
                Number = "123-456-7890",
                CountryId = Guid.NewGuid(),
                Country = new Country
                {
                    CountryName = "United States",
                    CountryCode = "US",
                    CountryPhoneCode = "+1",
                    Cities = new List<City>(),
                    CId = new Random().Next(),
                    Status = true
                }
            },
            Code = 123,
            UserRole = UserRole.ADMIN
        };

        _context.Schools.Add(school);
        await _context.SaveChangesAsync();

        // Act
        var result = await _schoolRepository.Authenticate(email, password);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(email, result.Email);
    }

    [Fact]
    public async Task Exists_ShouldReturnTrue_WhenEmailExists()
    {
        // Arrange
        var email = "test@example.com";
        var school = new School
        {
            Email = email,
            Status = true,
            SchoolName = "Test School",
            Address = new Address { Street = "123 Test St" },
            PhoneNumber = new PhoneNumber
            {
                Number = "123-456-7890",
                CountryId = Guid.NewGuid(),
                Country = new Country
                {
                    CountryName = "United States",
                    CountryCode = "US",
                    CountryPhoneCode = "+1",
                    Cities = new List<City>(),
                    CId = new Random().Next(),
                    Status = true
                }
            },
            PasswordHash = new byte[] { /* hash */ },
            PasswordSalt = new byte[] { /* salt */ },
            Code = 123,
            UserRole = UserRole.ADMIN
        };

        _context.Schools.Add(school);
        await _context.SaveChangesAsync();

        // Act
        var result = await _schoolRepository.Exists(email);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task Exists_ShouldReturnFalse_WhenEmailDoesNotExist()
    {
        // Arrange
        var email = "nonexistent@example.com";

        // Act
        var result = await _schoolRepository.Exists(email);

        // Assert
        Assert.False(result);
    }

}