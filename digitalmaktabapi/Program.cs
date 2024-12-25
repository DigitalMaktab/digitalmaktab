using System.Globalization;
using System.Net;
using System.Text;
using AspNetCoreRateLimit;
using digitalmaktabapi.Controllers;
using digitalmaktabapi.Data;
using digitalmaktabapi.Data.Seed;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Helpers;
using digitalmaktabapi.Models;
using digitalmaktabapi.Services;
using digitalmaktabapi.Services.Auth;
using digitalmaktabapi.Services.DMCryptography;
using digitalmaktabapi.Services.Mail;
using digitalmaktabapi.Services.PDF;
using digitalmaktabapi.Services.Providers;
using DinkToPdf;
using DinkToPdf.Contracts;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Add Localization
builder.Services.AddLocalization(options => options.ResourcesPath = "Resources/Localization");
builder.Services
.AddControllers()
.AddNewtonsoftJson(a => a.SerializerSettings.ReferenceLoopHandling = Newtonsoft.Json.ReferenceLoopHandling.Ignore)
.AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new DateTimeConverter());
    }
)
.AddViewLocalization();
builder.Services.Configure<RequestLocalizationOptions>(options =>
{
    var supportedCultures = new List<CultureInfo>
    {
        new ("en-US"),
        new ("fa-AF"),
        new ("ps-AF")
    };
    options.DefaultRequestCulture = new RequestCulture("en-US");
    options.SupportedCultures = supportedCultures;
    options.SupportedUICultures = supportedCultures;
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(a =>
{
    a.SwaggerDoc("v1", new OpenApiInfo { Title = "Digital API", Version = "v1" });
    // Configure the route naming convention
    a.DocumentFilter<CamelCaseDocumentFilter>();
    // Configure Swagger to use Bearer Token Authentication.
    a.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Enter 'Bearer {your-token}'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey
    });

    a.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add DataContext
// builder.Services.AddDbContext<DataContext>(x => x.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")).EnableSensitiveDataLogging());
var connectionString = builder.Configuration.GetConnectionString("MySqlConnection");
builder.Services.AddDbContext<DataContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
    options => options.EnableStringComparisonTranslations())
);

// Adding Cross Origin Resrouce Sharing Policy

// Mail Settings
builder.Services.Configure<MailSettings>(builder.Configuration.GetSection("MailSettings"));
builder.Services.AddTransient<IMailService, MailService>();

// Add Services
builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddTransient<ReportService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<CryptographyService>();

// Add Validation
// Adding Fluent Validation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddScoped<IValidator<SchoolForAddDto>, SchoolForAddDtoValidator>();
builder.Services.AddScoped<IValidator<LoginDto>, LoginDtoValidator>();
builder.Services.AddScoped<IValidator<UpdatePasswordDto>, UpdatePasswordDtoValidator>();
builder.Services.AddScoped<IValidator<AddStudentDto>, AddStudentDtoValidator>();
builder.Services.AddScoped<IValidator<AddCalendarYearDto>, AddCalendarYearDtoValidator>();
builder.Services.AddScoped<IValidator<AddTeacherDto>, AddTeacherDtoValidator>();
builder.Services.AddScoped<IValidator<AddRootBookDto>, AddRootBookDtoValidator>();
builder.Services.AddScoped<IValidator<AddSubjectDto>, AddSubjectDtoValidator>();
builder.Services.AddScoped<IValidator<AddCourseDto>, AddCourseDtoValidator>();
builder.Services.AddScoped<IValidator<AddScheduleDto>, AddScheduleDtoValidator>();
builder.Services.AddScoped<IValidator<AddAttendanceDto>, AddAttendanceDtoValidator>();
builder.Services.AddScoped<IValidator<AttendanceAddDto>, AttendanceAddDtoValidator>();
builder.Services.AddScoped<IValidator<AddGradeDto>, AddGradeDtoValidator>();
builder.Services.AddScoped<IValidator<GradeAddDto>, GradeAddDtoValidator>();
builder.Services.AddScoped<IValidator<AddRootUserDto>, AddRootUserDtoValidator>();

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

// Add Repositories
builder.Services.AddScoped<IRootRepository, RootRepository>();
builder.Services.AddScoped<ISchoolRepository, SchoolRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();
builder.Services.AddScoped<ITeacherRepository, TeacherRepository>();

// Add CSRF Protection
builder.Services.AddAntiforgery(options => options.HeaderName = "X-CSRF-TOKEN");
// Register IMemoryCache
builder.Services.AddMemoryCache();
// Add rate limiting
builder.Services.AddInMemoryRateLimiting();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
// Add Rate limiters
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// Add Logging information
builder.Services.AddSingleton<ILoggerFactory, LoggerFactory>();

builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));


// Add Cors Service
// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowLocalhost",
//         builder => builder
//             .WithOrigins("http://localhost:3000")
//             .AllowAnyHeader()
//             .AllowAnyMethod());

//     options.AddPolicy("AllowNgrok",
//         builder => builder
//             .WithOrigins("https://113c-2001-4bb8-2c0-56cb-acd1-2e70-a9ed-fb6e.ngrok-free.app")
//             .AllowAnyHeader()
//             .AllowAnyMethod());
// });

// builder.Services.AddCors(options =>
// {
//     options.AddPolicy("AllowAll", policy =>
//     {
//         policy.AllowAnyOrigin()
//               .AllowAnyHeader()
//               .AllowAnyMethod();
//     });
// });

builder.Services.AddCors();

var app = builder.Build();

// Configure Localizer Service Provider
ServiceLocator.ServiceProvider = app.Services;

// Configure Localization
app.UseRequestLocalization(app.Services.GetRequiredService<IOptions<RequestLocalizationOptions>>().Value);


app.Use(async (context, next) =>
{
    string acceptLanguage = context.Request.Headers.AcceptLanguage.ToString();
    CultureInfo? culture = null;

    if (!string.IsNullOrEmpty(acceptLanguage))
    {
        var cultures = acceptLanguage.Split(',');
        if (cultures.Length > 0)
        {
            foreach (var lang in cultures)
            {
                try
                {
                    culture = CultureInfo.GetCultureInfo(lang.Split(';')[0]);
                    break;
                }
                catch (CultureNotFoundException)
                {
                    // Culture not found, try the next one
                }
            }
        }
    }

    // If culture is still null, use a default culture
    culture ??= new CultureInfo("en-US"); // You can use any default culture you prefer

    CultureInfo.DefaultThreadCurrentCulture = culture;
    CultureInfo.DefaultThreadCurrentUICulture = culture;
    await next();
});


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        var localizer = app.Services.GetRequiredService<IStringLocalizer<Program>>();
        c.SwaggerEndpoint("/swagger/v1/swagger.json", localizer["DigitalMaktabAPIV1"]);
    });
}
else
{
    app.UseExceptionHandler(builder =>
    {
        builder.Run(async context =>
        {
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var error = context.Features.Get<IExceptionHandlerFeature>();

            if (error != null)
            {
                context.Response.AddApplicationError(error.Error.Message);
                await context.Response.WriteAsync(error.Error.Message);
            }
        });
    });
}

// Add Cross-Site Scripting (XSS) Prevention
// app.Use(async (context, next) =>
// {
//     context.Response.Headers.Append("Content-Security-Policy", "default-src 'self'; script-src 'self' https://trusted.cdn.com; style-src 'self'");
//     await next();
// });



Seeder.SeedCountries(app);

// Enable CORS
// app.UseCors("AllowLocalhost");
// app.UseCors("AllowNgrok");

// app.UseCors("AllowAll");

// Static files and SPA fallback
app.UseDefaultFiles();


if (app.Environment.IsDevelopment())
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new PhysicalFileProvider(
            Path.Combine(Directory.GetCurrentDirectory(), "Resources")
        ),
        RequestPath = "/resources"
    });
}
else
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new CompositeFileProvider(
            new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot")),
            new PhysicalFileProvider(Path.Combine(Directory.GetCurrentDirectory(), "Resources"))
        ),
        RequestPath = ""
    });
}

// app.Use(async (context, next) =>
// {
//     context.Response.Headers.Append("Content-Security-Policy",
//         "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;");
//     await next();
// });

app.MapFallbackToFile("index.html");

// Security and CSP


// HTTPS Redirection in Production
if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());

app.UseIpRateLimiting();


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
