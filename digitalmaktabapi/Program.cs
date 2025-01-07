using System.Collections;
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
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RestSharp;

var builder = WebApplication.CreateBuilder(args);

// Load environment variables from .env in development
if (builder.Environment.IsDevelopment())
{
    DotNetEnv.Env.Load();
}

builder.Configuration
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables();


// Replace placeholders in configuration with environment variable values
void ReplacePlaceholders(IConfiguration config, string parentKey = "")
{
    foreach (var child in config.GetChildren())
    {
        string key = string.IsNullOrEmpty(parentKey) ? child.Key : $"{parentKey}:{child.Key}";
        if (child.Value != null && child.Value.StartsWith("${") && child.Value.EndsWith("}"))
        {
            string envVarName = child.Value.TrimStart(new char[] { '$', '{' }).TrimEnd(new char[] { '}', ' ' });
            string envVarValue = Environment.GetEnvironmentVariable(envVarName) ?? string.Empty;

            if (!string.IsNullOrWhiteSpace(envVarValue))
            {
                builder.Configuration[key] = envVarValue;
            }
            else
            {
                Console.WriteLine($"Warning: Environment variable '{envVarName}' is not set.");
            }
        }

        ReplacePlaceholders(child, key);
    }
}

// Perform the replacement
ReplacePlaceholders(builder.Configuration);
// Validate and fetch all required environment variables
string[] requiredVariables =
[
    "CONNECTION_STRING_DEFAULT",
    "CONNECTION_STRING",
    "APP_TOKEN",
    "APP_ISSUER",
    "APP_AUDIENCE",
    "MAIL_SERVER",
    "MAIL_PORT",
    "MAIL_USERNAME",
    "MAIL_PASSWORD",
    "SENDGRID_API_KEY",
    "MAIL_FAILSAFE_CODE",
    "ZOOM_ACCOUNT_ID",
    "ZOOM_CLIENT_ID",
    "ZOOM_CLIENT_SECRET",
    "ZOOM_SECRET_TOKEN",
    "ZOOM_VERIFICATION_TOKEN",
    "ROOT_USER_PASSWORD",
    "ROOT_USER_FIRST_NAME",
    "ROOT_USER_LAST_NAME"
];

foreach (var variable in requiredVariables)
{
    if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(variable)))
    {
        throw new InvalidOperationException($"Environment variable {variable} is not set.");
    }
}
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
var connectionString = builder.Configuration.GetConnectionString("Connection");
// builder.Services.AddDbContext<DataContext>(options =>
//     options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString),
//     options => options.EnableStringComparisonTranslations())
// );

builder.Services.AddDbContext<DataContext>(options =>
    options.UseNpgsql(connectionString));

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
builder.Services.AddScoped<IValidator<AddCourseSectionDto>, AddCourseSectionDtoValidator>();
builder.Services.AddScoped<IValidator<AddLearningMaterialDto>, AddLearningMaterialDtoValidator>();

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNgrok", builder =>
    {
        builder.WithOrigins("https://72a3-2001-4bb8-2cc-1aaa-1d6e-9c24-8ab3-95b9.ngrok-free.app")
               .AllowAnyHeader()
               .AllowAnyMethod();
    });
});

builder.Services.AddCors();

// Zoom settings
// builder.Services.AddAuthentication(options =>
// {
//     options.DefaultScheme = "Cookie";
//     options.DefaultChallengeScheme = "Zoom";

// })
// .AddCookie("Cookie")
// .AddOAuth("Zoom", options =>
// {
//     options.ClientId = builder.Configuration.GetSection("ZoomSettings:ClientId").Value!;
//     options.ClientSecret = builder.Configuration.GetSection("ZoomSettings:ClientSecrect").Value!;
//     options.CallbackPath = "/oauth/callback";

//     options.AuthorizationEndpoint = "https://zoom.us/oauth/authorize";
//     options.TokenEndpoint = "https://zoom.us/oauth/token";
//     options.SaveTokens = true;

//     options.Scope.Add("meeting:write");
//     options.Scope.Add("user:read");

//     options.Events = new Microsoft.AspNetCore.Authentication.OAuth.OAuthEvents
//     {
//         OnCreatingTicket = async context =>
//         {
//             var request = new RestRequest("https://api.zoom.us/v2/users/me", Method.Get);
//             request.AddHeader("Authorization", $"Bearer {context.AccessToken}");
//             var client = new RestClient();
//             var response = await client.ExecuteAsync(request);

//             //TODO: Save user information if needed
//         }
//     };
// });

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 1024 * 1024 * 1024; // Set limit to 1 GB
});


// Add Logging
builder.Logging.AddConsole();
builder.Logging.AddDebug();

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



Seeder.SeedData(app);

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

app.Use(async (context, next) =>
{
    context.Request.EnableBuffering(); // Enable buffering for large requests
    await next();
});

app.UseCors(x => x.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
app.UseCors("AllowNgrok");

app.UseIpRateLimiting();


app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
