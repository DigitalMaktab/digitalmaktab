using System.Diagnostics;
using System.Globalization;
using ClosedXML.Excel;
using System.Text.Json;
using DigitalMaktab.Core.Data;
using DigitalMaktab.Core.Countries;
using DigitalMaktab.Core.Abstractions.Countries;
using DigitalMaktab.Core.Helpers;
using DigitalMaktab.Core.Models;
using DigitalMaktab.Core.Services.Mail;
using DigitalMaktab.Country.Afghanistan;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Npgsql;

// Separate executable: the actual API entry point and its package graph run in
// each child process. Outbound mail is replaced before building its DI; optional
// classroom recovery adds a bounded inner-filter pause at the actual leased body.
// No alternate controller/middleware/repository/authentication/state implementation.
var root=Path.GetFullPath(Environment.GetEnvironmentVariable("DM_LOAD_ROOT") ?? throw new InvalidOperationException("Missing private load root."));
var connection=Environment.GetEnvironmentVariable("DM_LOAD_DATABASE") ?? throw new InvalidOperationException("Missing private load database.");
var cs=new NpgsqlConnectionStringBuilder(connection);
if(!Path.IsPathFullyQualified(root)||Path.GetFileName(root).StartsWith("digitalmaktab-core-support.",StringComparison.Ordinal)!=true
    ||new DirectoryInfo(root).LinkTarget!=null||!Path.IsPathFullyQualified(cs.Host ?? "")||Path.GetFullPath(cs.Host ?? "")!=root||cs.Database!="full_app_load_tests"||cs.Username!="support_test"||cs.Port!=55439
    ||!Guid.TryParse(File.ReadAllText(Path.Combine(root,".dm-full-app-load")).Trim(),out _))
    throw new InvalidOperationException("Full API verification requires its harness-owned private database and directory.");
if(args is ["seed"]) { await Seed();return; }
if(args is ["classroom-recovery", var firstAddress, var secondAddress]) {
    if(Environment.GetEnvironmentVariable("DM_CLASSROOM_RECOVERY")!="1")throw new InvalidOperationException("Classroom recovery is verification-only.");
    await ClassroomRecovery.Run(root,firstAddress,secondAddress);return;
}
if(args is ["build-info"]) {
    object Identity(System.Reflection.Assembly assembly)=>new{version=assembly.GetCustomAttributes(typeof(System.Reflection.AssemblyInformationalVersionAttribute),false)
        .Cast<System.Reflection.AssemblyInformationalVersionAttribute>().Single().InformationalVersion,
        sha256=Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(File.ReadAllBytes(assembly.Location))).ToLowerInvariant()};
    Console.WriteLine(JsonSerializer.Serialize(new{runtime=Environment.Version.ToString(),api=Identity(typeof(DigitalMaktab.Api.Startup.ForwardHealService).Assembly),
        core=Identity(typeof(DataContext).Assembly),abstractions=Identity(typeof(Student).Assembly),country=Identity(typeof(AfghanistanModule).Assembly)}));return;
}
if(args is ["workbook",var ordinal]&&int.TryParse(ordinal,out var index)&&index is >=0 and <4) {
    using var wb=new XLWorkbook(Path.Combine(root,$"template-{index}.xlsx"));var sheet=wb.Worksheet(1);
    var values=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase){["FirstName"]="Imported",["LastName"]="Private",
        ["AsasNumber"]="5000",["DateOfBirth"]="2015-03-21",["Gender"]="MALE",["Email"]=$"imported-{index}@load.invalid",
        ["Phone"]="1234567",["ClassName"]="SECOND",["BranchName"]="Private main",["JoiningAge"]="10",["MonthlyFee"]="500"};
    foreach(var cell in sheet.Row(1).CellsUsed())if(values.TryGetValue(cell.GetString(),out var value))sheet.Cell(2,cell.Address.ColumnNumber).Value=value;
    wb.SaveAs(Path.Combine(root,$"import-{index}.xlsx"));return;
}
if(args is ["hold-fee"] or ["waits"]) {
    await using var sql=new NpgsqlConnection(connection);await sql.OpenAsync();
    if(args[0]=="waits"){
        await using var command=new NpgsqlCommand("SELECT count(*) FROM pg_stat_activity WHERE datname='full_app_load_tests' AND wait_event_type='Lock' AND application_name='dm-full-api-a' AND query ILIKE '%Fee%'",sql);
        Console.WriteLine(await command.ExecuteScalarAsync());return;
    }
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(root,"fixture.json")));
    var fee=fixture.RootElement.GetProperty("schools")[0].GetProperty("classes")[0].GetProperty("pupils")[0].GetProperty("feeId").GetGuid();
    await using var tx=await sql.BeginTransactionAsync();
    await using(var command=new NpgsqlCommand("SELECT \"Id\" FROM \"Fee\" WHERE \"Id\"=@id FOR UPDATE",sql,tx)){
        command.Parameters.AddWithValue("id",fee);command.CommandTimeout=10;await command.ExecuteScalarAsync();
    }
    Console.WriteLine("DM_LOAD_ROW_HELD");await Console.In.ReadLineAsync();await tx.RollbackAsync();return;
}
if(args is ["inspect"]) {
    new ServiceCollection().AddAfghanistanModule();await using var db=new DataContext(new DbContextOptionsBuilder<DataContext>().UseNpgsql(connection).Options);
    using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(root,"fixture.json")));
    var selectedDate=DateOnly.ParseExact(fixture.RootElement.GetProperty("civilDate").GetString()!,"yyyy-MM-dd",CultureInfo.InvariantCulture);
    var evidence=new List<object>();
    foreach(var school in await db.Schools.AsNoTracking().OrderBy(s=>s.Code).Select(s=>new{s.Id,s.Country.CountryCode}).ToArrayAsync()){
        var currentYear=await db.CalendarYears.Where(y=>y.Status).Select(y=>y.Id).SingleAsync();
        var civilDay=await DigitalMaktab.Core.Services.AttendanceReporting.DailyAttendanceWriter.Day(db,school.Id,currentYear,selectedDate,default);
        var students=await db.Students.CountAsync(s=>s.SchoolId==school.Id);
        var enrollments=await db.Enrollments.CountAsync(e=>e.Student.SchoolId==school.Id&&e.Class.SchoolId==school.Id);
        var sizes=await db.Classes.Where(c=>c.SchoolId==school.Id).Select(c=>new{Count=c.Enrollments.Count(e=>e.Status),c.StudentCapacity}).ToArrayAsync();
        evidence.Add(new{school.CountryCode,students,enrollments,
            editedProfiles=await db.Students.CountAsync(s=>s.SchoolId==school.Id&&s.FirstName=="Edited private"),
            afghanProfiles=await db.Set<DigitalMaktab.Country.Afghanistan.Models.AfghanStudentDetails>().CountAsync(d=>d.Student.SchoolId==school.Id),
            classes=sizes.Length,maximumClassSize=sizes.Max(c=>c.Count),capacityViolations=sizes.Count(c=>c.Count>c.StudentCapacity),
            payments=await db.Payments.CountAsync(p=>p.Fee.SchoolId==school.Id),paid=await db.Fees.Where(f=>f.SchoolId==school.Id).SumAsync(f=>f.PaidAmount),
            todayMarks=await db.Attendances.CountAsync(a=>a.Enrollment.Student.SchoolId==school.Id&&a.DateTime>=civilDay.From&&a.DateTime<civilDay.To),
            duplicatePlacements=await db.Enrollments.Where(e=>e.Student.SchoolId==school.Id&&e.Status).GroupBy(e=>new{e.StudentId,e.CalendarYearId}).CountAsync(g=>g.Count()>1)});
    }
    Console.WriteLine(JsonSerializer.Serialize(evidence));return;
}
if(args is not ["host",var name]||name is not("a" or "b"))throw new InvalidOperationException("Expected seed or host a|b.");
var work=Path.Combine(root,"host-"+name);Directory.CreateDirectory(work);Directory.SetCurrentDirectory(work);
if(File.Exists(".env"))throw new InvalidOperationException("Test host must never read a developer environment file.");
var settings=JsonSerializer.Deserialize<Dictionary<string,object?>>(File.ReadAllText(Path.Combine(root,"appsettings.json")))!;
File.WriteAllText("appsettings.json",JsonSerializer.Serialize(settings));
Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT","LoadVerification");
Environment.SetEnvironmentVariable("DOTNET_ENVIRONMENT","LoadVerification");
Environment.SetEnvironmentVariable("ASPNETCORE_APPLICATIONNAME",typeof(DigitalMaktab.Api.Startup.ForwardHealService).Assembly.GetName().Name);
var hostConnection=new NpgsqlConnectionStringBuilder(connection){ApplicationName="dm-full-api-"+name}.ConnectionString;
foreach(var key in new[]{"CONNECTION_STRING_DEFAULT","CONNECTION_STRING","LOCAL_CONNECTION_STRING"})Environment.SetEnvironmentVariable(key,hostConnection);
foreach(var (key,value) in new Dictionary<string,string>{
    ["APP_TOKEN"]="private-load-fixture-signing-key-0123456789012345678901234567890123456789",
    ["APP_ISSUER"]="private-load-fixture",["APP_AUDIENCE"]="private-load-fixture",
    ["MAIL_SERVER"]="127.0.0.1",["MAIL_PORT"]="1",["MAIL_USERNAME"]="fixture",["MAIL_PASSWORD"]="fixture",
    ["MAIL_SENDER_NAME"]="Private fixture",["MAIL_SENDER_EMAIL"]="fixture@invalid.test",["SENDGRID_API_KEY"]="fixture-not-a-real-key",
    ["MAIL_FAILSAFE_CODE"]="fixture",["ROOT_USER_PASSWORD"]="PrivateLoad@2026!",["ROOT_USER_FIRST_NAME"]="Private",["ROOT_USER_LAST_NAME"]="Fixture",
    ["IP_RATE_LIMIT_GENERAL_PERIOD"]="1s",["IP_RATE_LIMIT_GENERAL_LIMIT"]="500",
    ["IP_RATE_LIMIT_GENERAL_PERIOD_LONG"]="1m",["IP_RATE_LIMIT_GENERAL_LIMIT_LONG"]="10000",
    ["PAYMENT_WEBHOOK_SECRET"]="private-load-fixture-not-a-real-secret"})Environment.SetEnvironmentVariable(key,value);
var installed=false;
using var metrics=new RuntimeProbe(Path.Combine(root,$"metrics-{name}-{Environment.ProcessId}.json"));
using var hooks=DiagnosticListener.AllListeners.Subscribe(new Observer<DiagnosticListener>(listener=>{
    if(listener.Name!="Microsoft.Extensions.Hosting")return;
    listener.Subscribe(new Observer<KeyValuePair<string,object?>>(e=>{
        if(e.Key=="HostBuilding"&&e.Value is IHostBuilder builder)builder.ConfigureServices((context,services)=>{
            if(context.Configuration["ConnectionStrings:Connection"]!=hostConnection
                ||context.Configuration["DataProtection:KeyRingPath"]!=Path.Combine(root,"keys")
                ||context.Configuration["Kestrel:Endpoints:Http:Url"]!="http://127.0.0.1:0")
                throw new InvalidOperationException("API configuration escaped the private load fixture.");
            services.RemoveAll<IMailService>();services.AddSingleton<IMailService,LocalMail>();installed=true;
            if(Environment.GetEnvironmentVariable("DM_CLASSROOM_RECOVERY")=="1") {
                if(context.Configuration["NotificationBackplane:ConnectionString"]!="!"+Path.Combine(root,"classroom.sock")
                    ||!bool.TryParse(context.Configuration["ClassroomDelivery:SharedState"],out var shared)||!shared)
                    throw new InvalidOperationException("Classroom recovery escaped its private Redis.");
                services.AddSingleton(new ClassroomCrashBarrier(root,name));
                services.Configure<Microsoft.AspNetCore.SignalR.HubOptions>(options=>options.AddFilter<ClassroomCrashBarrier>());
            }
        });
        if(e.Key=="HostBuilt"&&e.Value is IHost host){
            if(!installed||host.Services.GetRequiredService<IMailService>() is not LocalMail)throw new InvalidOperationException("Outbound mail isolation was not installed.");
            var application=host.Services.GetRequiredService<IHostEnvironment>().ApplicationName;
            if(application!=typeof(DigitalMaktab.Api.Startup.ForwardHealService).Assembly.GetName().Name)throw new InvalidOperationException("Actual API application identity was not preserved.");
            Console.WriteLine("DM_LOAD_RUNTIME "+JsonSerializer.Serialize(new{application,isServerGC=System.Runtime.GCSettings.IsServerGC}));
            host.Services.GetRequiredService<IHostApplicationLifetime>().ApplicationStarted.Register(()=>{
                var addresses=host.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses;
                var address=addresses.Single();var uri=new Uri(address);
                if(uri.Host!="127.0.0.1"||uri.Port==5000||uri.Port==3000)throw new InvalidOperationException("Verification listener is not private.");
                Console.WriteLine("DM_LOAD_READY "+address);
            });
        }
    }));
}));
var entry=typeof(DigitalMaktab.Api.Startup.ForwardHealService).Assembly.EntryPoint!;
try { if(entry.Invoke(null,[Array.Empty<string>()]) is Task run)await run; }
catch(System.Reflection.TargetInvocationException error)when(error.InnerException!=null){System.Runtime.ExceptionServices.ExceptionDispatchInfo.Capture(error.InnerException).Throw();}

async Task Seed()
{
    var moduleServices=new ServiceCollection();moduleServices.AddCoreCalendarProviders();moduleServices.AddAfghanistanModule();
    using var moduleProvider=moduleServices.BuildServiceProvider();
    var calendars=moduleProvider.GetServices<ICalendarProvider>().ToDictionary(c=>c.System);
    await using var db=new DataContext(new DbContextOptionsBuilder<DataContext>().UseNpgsql(connection).Options);
    await db.Database.EnsureCreatedAsync();
    var fixtureDate=DateOnly.FromDateTime(DateTime.UtcNow);
    var year=new CalendarYear{Id=Guid.NewGuid(),Year=new(fixtureDate.Year,1,1),NativeYear=fixtureDate.Year.ToString(CultureInfo.InvariantCulture),Status=true};db.Add(year);
    Extensions.CreatePasswordHash("PrivateLoad@2026!",out var hash,out var salt);
    var schools=new List<object>();
    foreach(var code in new[]{"AT","AF"}){
        var country=new Country{Id=Guid.NewGuid(),CountryName=code=="AF"?"Afghanistan":"Austria",CountryCode=code,CountryPhoneCode=code=="AF"?"93":"43",Cities=[],CalendarSystem=code=="AF"?CalendarSystem.SOLAR_HIJRI:CalendarSystem.GREGORIAN,DefaultLanguageCode=code=="AF"?"fa-AF":"en-US",CurrencyCode=code=="AF"?"AFN":"EUR",GradeCount=12,CId=code=="AF"?2:1,Status=true};db.Add(country);
        for(var n=0;n<2;n++){
            var school=new School{Id=Guid.NewGuid(),SchoolName=$"Private load {code} {n}",CountryId=country.Id,Country=country,Address=new(),PhoneNumber=new(){CountryId=country.Id,Country=country,Number="1234567"},Email=$"school-{code.ToLowerInvariant()}-{n}@load.invalid",PasswordHash=hash,PasswordSalt=salt,Code=10000+schools.Count,SchoolType=SchoolType.PRIVATE,UserRole=UserRole.ADMIN,Status=true};db.Add(school);
            var cal=calendars[country.CalendarSystem];var today=fixtureDate;
            var academicStart=cal.StartOfAcademicYear(today.Year);
            if(academicStart>today)academicStart=cal.StartOfAcademicYear(today.Year-1);
            var plan=new SchoolAcademicYear{Id=Guid.NewGuid(),SchoolId=school.Id,CalendarYearId=year.Id,
                FromDate=academicStart,ToDate=cal.StartOfAcademicYear(academicStart.Year+1).AddDays(-1),Status=true,
                Plan=new(){DisplayName="Private load academic year",Lifecycle="OPEN",TimeZone=code=="AF"?"Asia/Kabul":"Europe/Vienna",AnnualRegistrationLimit=450}};db.Add(plan);
            var teacher=new Teacher{Id=Guid.NewGuid(),SchoolId=school.Id,School=school,FirstName="Private",LastName="Teacher",DateOfBirth=new(1990,1,1),Gender=Gender.MALE,
                PrimaryAddress=new(),PhoneNumber=new(){CountryId=country.Id,Country=country,Number="1234567"},Email=$"teacher-{code.ToLowerInvariant()}-{n}@load.invalid",
                PasswordHash=hash,PasswordSalt=salt,UserRole=UserRole.TEACHER,Status=true,Schedules=[],Classes=[]};db.Add(teacher);
            var branch=new Branch{Id=Guid.NewGuid(),SchoolId=school.Id,School=school,BranchName="Private main",Status=true};db.Add(branch);
            var book=new Book{Id=Guid.NewGuid(),SchoolId=school.Id,School=school,BookTitle="Private Mathematics",BookPath="/private-fixture.pdf",Status=true};
            var subject=new Subject{Id=Guid.NewGuid(),SubjectName="Private Mathematics",Book=book,BookId=book.Id,Courses=[],Status=true};db.AddRange(book,subject);
            var classes=new List<object>();
            for(var section=0;section<10;section++){
                var cls=new Class{Id=Guid.NewGuid(),SchoolId=school.Id,School=school,TeacherId=teacher.Id,Teacher=teacher,BranchId=branch.Id,Branch=branch,
                    CalendarYearId=year.Id,CalendarYear=year,ClassName=ClassName.SECOND,SectionNumber=section+1,StudentCapacity=40,
                    ClassType=default,Shift=default,Courses=[],Attendances=[],Enrollments=[],Status=true};db.Add(cls);
                var course=new Course{Id=Guid.NewGuid(),ClassId=cls.Id,Class=cls,TeacherId=teacher.Id,Teacher=teacher,SubjectId=subject.Id,Subject=subject,CourseSections=[],Status=true};db.Add(course);
                var pupils=new List<object>();
                for(var row=0;row<40;row++){
                    var ordinal=section*40+row+1;
                    var pupil=new Student{Id=Guid.NewGuid(),SchoolId=school.Id,School=school,FirstName="Pupil "+ordinal,LastName="Private "+code,
                        CalendarYearId=year.Id,JoiningYear=year,JoiningClassId=cls.Id,JoiningClass=cls,JoiningAge=10,AsasNumber=ordinal,
                        PrimaryAddress=new(),SecondaryAddress=new(),DateOfBirth=new(2015,3,21,0,0,0,DateTimeKind.Utc),Gender=Gender.MALE,
                        MonthlyFee=500,Email=$"pupil-{code.ToLowerInvariant()}-{n}-{ordinal}@load.invalid",PasswordHash=hash,PasswordSalt=salt,
                        UserRole=UserRole.STUDENT,Attendances=[],Schedules=[],Fees=[],Enrollments=[],CreationDate=DateTime.UtcNow.AddDays(-10),Status=true};
                    var enrollment=new Enrollment{Id=Guid.NewGuid(),StudentId=pupil.Id,Student=pupil,ClassId=cls.Id,Class=cls,CalendarYearId=year.Id,CalendarYear=year,Status=true};
                    var fee=new Fee{Id=Guid.NewGuid(),SchoolId=school.Id,StudentId=pupil.Id,Student=pupil,CalendarYearId=year.Id,CalendarYear=year,Month=(Month)cal.ToCalendarParts(today).Month,Amount=500,Status=true};
                    db.AddRange(pupil,enrollment,fee);
                    for(var day=1;day<=5;day++)db.Add(new Attendance{Id=Guid.NewGuid(),EnrollmentId=enrollment.Id,Enrollment=enrollment,DateTime=fixtureDate.ToDateTime(new TimeOnly(12,0),DateTimeKind.Utc).AddDays(-day),Status=day%3!=0});
                    if(row<2)pupils.Add(new{studentId=pupil.Id,enrollmentId=enrollment.Id,feeId=fee.Id});
                }
                classes.Add(new{classId=cls.Id,courseId=course.Id,pupils});
            }
            school.CreationUserId=school.Id;school.UpdateUserId=school.Id;
            foreach(var entry in db.ChangeTracker.Entries<Base>().Where(e=>e.State==EntityState.Added&&e.Metadata.FindProperty("SchoolId")!=null
                &&e.Property("SchoolId").CurrentValue is Guid owner&&owner==school.Id)){
                entry.Entity.CreationUserId=school.Id;entry.Entity.UpdateUserId=teacher.Id;
                entry.Entity.CreationDate??=DateTime.UtcNow.AddDays(-10);entry.Entity.UpdateDate??=DateTime.UtcNow.AddDays(-1);
            }
            schools.Add(new{school.Id,school.Email,country=code,password="PrivateLoad@2026!",calendarYearId=year.Id,teacherId=teacher.Id,teacherEmail=teacher.Email,classes});
        }
    }
    await db.SaveChangesAsync();
    // Start from the current real model, not destructive legacy table rewrites.
    // Startup still runs the real coordinator, additive repair and module startup.
    var generator=db.GetService<IMigrationsSqlGenerator>();
    foreach(var migration in new Migration[]{new DigitalMaktab.Core.Migrations.StudentSearchIndexes(),new DigitalMaktab.Core.Migrations.RetentionReadIndexes(),new DigitalMaktab.Core.Migrations.MessageReadIndexes()})
        foreach(var command in generator.Generate(migration.UpOperations))await db.Database.ExecuteSqlRawAsync(command.CommandText);
    var history=db.GetService<IHistoryRepository>();await db.Database.ExecuteSqlRawAsync(history.GetCreateIfNotExistsScript());
    foreach(var id in db.Database.GetMigrations())await db.Database.ExecuteSqlRawAsync(history.GetInsertScript(new HistoryRow(id,ProductInfo.GetVersion())));
    File.WriteAllText(Path.Combine(root,"fixture.json"),JsonSerializer.Serialize(new{civilDate=fixtureDate.ToString("yyyy-MM-dd",CultureInfo.InvariantCulture),schools}));
}

file sealed class LocalMail:IMailService
{
    public Task<bool> SendMail(MailData data)=>Task.FromResult(true);
    public Task<bool> SendGrid(MailData data,CancellationToken ct=default){ct.ThrowIfCancellationRequested();return Task.FromResult(true);}
}
file sealed class Observer<T>(Action<T> next):IObserver<T>
{
    public void OnNext(T value)=>next(value);
    public void OnCompleted(){}
    public void OnError(Exception error)=>throw new InvalidOperationException("Private host diagnostic hook failed.",error);
}
