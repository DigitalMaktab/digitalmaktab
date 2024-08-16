using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Dtos;
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
    }
}