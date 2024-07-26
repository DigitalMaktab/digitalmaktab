using System.Text;
using digitalmaktabapi.Data;
using digitalmaktabapi.Data.Seed;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services;
using digitalmaktabapi.Services.Auth;
using digitalmaktabapi.Services.Mail;
using digitalmaktabapi.Services.Providers;
using DinkToPdf;
using DinkToPdf.Contracts;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add DataContext
builder.Services.AddDbContext<DataContext>(x => x.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")).EnableSensitiveDataLogging());

// Mail Settings
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("MailSettings"));
builder.Services.AddTransient<IMailService, MailService>();

// Add Services
builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddTransient<PdfService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TokenService>();

// Add Validation
// Adding Fluent Validation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddScoped<IValidator<SchoolForAddDto>, SchoolForAddDtoValidator>();

// Add Data Seeder
// Add Seeds
builder.Services.AddScoped<Seeder>();


// Add Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = Encoding.ASCII.GetBytes(builder.Configuration.GetSection("AppSettings:Token").Value!);
        var issuer = builder.Configuration.GetSection("AppSettings:Issuer").Value!;
        var audience = builder.Configuration.GetSection("AppSettings:Audience").Value!;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateAudience = true,
            ValidateIssuer = true,
            ValidateLifetime = true,
            ValidIssuer = issuer,
            ValidAudience = audience
        };
    });

// Add Authorization
builder.Services.AddSingleton<IAuthorizationPolicyProvider, AuthorizationPolicyProvider>();
// Default Authorization will be replaced by the above custom provider.
builder.Services.AddAuthorization();

// builder.Services.AddAuthorization(options =>
// {
//     var adminPolicy = builder.Configuration.GetSection("AuthorizationPolicies:AdminPolicy").Value!;
//     var principalPolicy = builder.Configuration.GetSection("AuthorizationPolicies:PrincipalPolicy").Value!;
//     var headMasterPolicy = builder.Configuration.GetSection("AuthorizationPolicies:HeadMasterPolicy").Value!;
//     var teacherPolicy = builder.Configuration.GetSection("AuthorizationPolicies:TeacherPolicy").Value!;
//     var studentPolicy = builder.Configuration.GetSection("AuthorizationPolicies:StudentPolicy").Value!;

//     options.AddPolicy(adminPolicy, policy => policy.RequireRole(UserRole.ADMIN.ToString()));
//     options.AddPolicy(principalPolicy, policy => policy.RequireRole(UserRole.PRINCIPAL.ToString()));
//     options.AddPolicy(headMasterPolicy, policy => policy.RequireRole(UserRole.HEAD_MASTER.ToString()));
//     options.AddPolicy(teacherPolicy, policy => policy.RequireRole(UserRole.TEACHER.ToString()));
//     options.AddPolicy(studentPolicy, policy => policy.RequireRole(UserRole.STUDENT.ToString()));
// });


// Add Repositories
builder.Services.AddScoped<IRootRepository, RootRepository>();
builder.Services.AddScoped<ISchoolRepository, SchoolRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();



builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

Seeder.SeedCountries(app);

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
