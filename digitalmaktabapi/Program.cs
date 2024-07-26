using System.Globalization;
using System.Net;
using System.Text;
using digitalmaktabapi.Data;
using digitalmaktabapi.Data.Seed;
using digitalmaktabapi.Dtos;
using digitalmaktabapi.Helpers;
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
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Localization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Add Localization
builder.Services.AddLocalization(options => options.ResourcesPath = "Resources");
builder.Services.AddControllers().AddViewLocalization();
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

// Add Repositories
builder.Services.AddScoped<IRootRepository, RootRepository>();
builder.Services.AddScoped<ISchoolRepository, SchoolRepository>();
builder.Services.AddScoped<IStudentRepository, StudentRepository>();



builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));
var app = builder.Build();

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

Seeder.SeedCountries(app);

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
