using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services.Auth;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace digitalmaktabapi.Tests
{
    public class AuthControllerTest
    {
        private readonly Mock<IAuthService> authServiceMock;
        private readonly Mock<IMapper> mapperMock;
        private readonly AuthController controller;

        public AuthControllerTest()
        {
            authServiceMock = new Mock<IAuthService>();
            mapperMock = new Mock<IMapper>();
            controller = new AuthController(authServiceMock.Object, mapperMock.Object);
        }

        [Fact]
        public async Task Authenticate_WhenAuthUserIsNull_ReturnsUnauthorized()
        {
            // Arrange
            var loginDto = new LoginDto { Email = "test@example.com", Password = "password" };
            authServiceMock.Setup(service => service.Authenticate(loginDto.Email, loginDto.Password))
                .ReturnsAsync((AuthUser?)null);

            // Act
            var result = await controller.Authenticate(loginDto);

            //Assert
            Assert.IsType<UnauthorizedResult>(result);
        }

        [Fact]
        public async Task Authenticate_WhenAuthUserEntityIsUnhandled_ReturnsUnauthorized()
        {
            // Arrange
            var loginDto = new LoginDto { Email = "test@example.com", Password = "password" };
            var unhandledEntity = new object(); // Example of an unhandled entity
            var authUser = new AuthUser { Entity = unhandledEntity, Token = "token" };

            authServiceMock.Setup(service => service.Authenticate(loginDto.Email, loginDto.Password))
                            .ReturnsAsync(authUser);

            // Act
            var result = await controller.Authenticate(loginDto);

            // Assert
            Assert.IsType<UnauthorizedResult>(result);
        }

        // [Fact]
        // public async Task Authenticate_WhenAuthUserIsSchool_ReturnsOkWithSchoolDto()
        // {
        //     // Arrange
        //     var loginDto = new LoginDto { Email = "test@example.com", Password = "password" };
        //     var school = new School
        //     {
        //         SchoolName = "Test School",
        //         Status = false,
        //         Address = new Address { },
        //         PhoneNumber = new PhoneNumber
        //         {
        //             CountryId = Guid.NewGuid(),
        //             Country = null,
        //             Number = "00980098"
        //         },
        //         Email = "test@example.com",
        //         PasswordHash = new byte[10],
        //         PasswordSalt = new byte[10],
        //         Code = 1,
        //         UserRole = UserRole.ADMIN
        //     };
        //     var authUser = new AuthUser { Entity = school, Token = "token" };
        //     var schoolDto = new SchoolDto
        //     {
        //         SchoolName = "Test School",
        //         Status = false,
        //         Address = new AddressDto { },
        //         PhoneNumber = new PhoneNumberDto { CountryId = Guid.NewGuid(), Country = null, Number = "00980098" },
        //         Email = "test@example.com",
        //         Code = 1,
        //         CreationUserId = Guid.NewGuid(),
        //         UpdateUserId = Guid.NewGuid(),
        //         CreationUserName = "",
        //         UpdateUserName = "",
        //         CreationDate = new DateTime(),
        //         UpdateDate = new DateTime(),
        //         Logo = ""
        //     };

        //     authServiceMock.Setup(service => service.Authenticate(loginDto.Email, loginDto.Password))
        //                     .ReturnsAsync(authUser);
        //     mapperMock.Setup(mapper => mapper.Map<SchoolDto>(school)).Returns(schoolDto);

        //     // Act
        //     var result = await controller.Authenticate(loginDto);

        //     // Assert
        //     var okResult = Assert.IsType<OkObjectResult>(result);
        //     var returnValue = Assert.IsType<dynamic>(okResult.Value);
        //     Assert.Equal(schoolDto, returnValue.admin);
        //     Assert.Equal(authUser.Token, returnValue.Token);
        // }
    }
}