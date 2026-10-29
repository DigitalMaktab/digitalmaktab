using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using DigitalMaktab.Core.Tests;

internal static class ClassroomRecovery
{
    private sealed record Session(JsonElement School, string Admin, string Teacher);
    private sealed record Bootstrap(JsonElement Scope, List<JsonElement> Events);
    private static void Require(bool condition,string message) { if(!condition)throw new InvalidOperationException(message); }
    private static Uri Address(string text) {
        var uri=new Uri(text);Require(uri.Scheme=="http"&&uri.Host=="127.0.0.1"&&uri.Port is not(5000 or 3000)&&uri.Port>0,"Recovery listener is not private.");return uri;
    }
    private static async Task<string> Login(HttpClient client,string email,string password) {
        using var response=await client.PostAsJsonAsync("/api/auth",new{email,password});response.EnsureSuccessStatusCode();
        using var json=JsonDocument.Parse(await response.Content.ReadAsStringAsync());return json.RootElement.GetProperty("token").GetString()!;
    }
    private static Task<ScopeSocket> Connect(Uri address,string token) => ScopeSocket.Connect(address,default,bearer:token,path:"/classhub",query:"classroomProtocol=1");
    private static async Task<JsonElement> Event(ScopeSocket socket,string method) {
        using var stop=new CancellationTokenSource(TimeSpan.FromSeconds(20));
        for(var index=0;index<128;index++) { var value=await socket.Event("ClassroomEvent",timeoutMs:20000).WaitAsync(stop.Token);if(value.GetProperty("arguments")[1].GetString()==method)return value; }
        throw new InvalidOperationException("Expected scoped recovery event was not delivered.");
    }
    private static async Task<Bootstrap> Join(ScopeSocket socket,string room,string role="HOST") {
        var result=await socket.InvokeWithEvents("JoinClass",room,"Private recovery",role);
        Require(!result.Completion.TryGetProperty("error",out _),"Recovery join rejected.");
        var ack=result.Completion.GetProperty("result");Require(ack.GetProperty("joined").GetBoolean(),"Recovery join did not bind.");
        var scope=ack.GetProperty("scope");var expected=ack.GetProperty("events").GetInt32();
        bool Match(JsonElement row)=>row.TryGetProperty("target",out var name)&&name.GetString()=="ClassroomEvent"&&row.GetProperty("arguments")[0].ToString()==scope.ToString();
        using var stop=new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while(result.Events.Count(Match)<expected)result.Events.Add(await socket.Event("ClassroomEvent").WaitAsync(stop.Token));
        Require(result.Events.Count(Match)==expected,"Recovery bootstrap was incomplete/duplicated.");return new(scope,result.Events.Where(Match).ToList());
    }
    private static JsonElement Payload(JsonElement row)=>row.GetProperty("arguments")[2][0];
    private static string Peer(Bootstrap value)=>Payload(value.Events.Single(row=>row.GetProperty("arguments")[1].GetString()=="ExistingUsers"))[0].GetProperty("connectionId").GetString()!;
    private static void Retained(Bootstrap value,string notes,string? missing=null) {
        Require(value.Events.Any(row=>row.GetProperty("arguments")[1].GetString()=="NotesUpdated"&&Payload(row).GetProperty("text").GetString()==notes),"Retained recovery notes changed.");
        if(missing!=null)Require(!Payload(value.Events.Single(row=>row.GetProperty("arguments")[1].GetString()=="ExistingUsers")).EnumerateArray().Any(row=>row.GetProperty("connectionId").GetString()==missing),"Dead peer survived authoritative cleanup.");
    }
    private static async Task Call(ScopeSocket socket,string method,params object?[] arguments) {
        var result=await socket.Invoke(method,arguments);Require(!result.TryGetProperty("error",out _),"Recovery call rejected: "+method);
    }
    internal static async Task Run(string root,string first,string second) {
        var a=Address(first);var b=Address(second);
        using var http=new HttpClient(new HttpClientHandler{UseProxy=false}){BaseAddress=b,Timeout=TimeSpan.FromSeconds(20)};
        using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(root,"fixture.json")));
        var schools=fixture.RootElement.GetProperty("schools").EnumerateArray().Where(row=>row.GetProperty("Email").GetString()!.EndsWith("-0@load.invalid",StringComparison.Ordinal)).ToArray();
        var sessions=new List<Session>();
        foreach(var school in schools) sessions.Add(new(school,await Login(http,school.GetProperty("Email").GetString()!,school.GetProperty("password").GetString()!),await Login(http,school.GetProperty("teacherEmail").GetString()!,school.GetProperty("password").GetString()!)));
        var at=sessions.Single(row=>row.School.GetProperty("country").GetString()=="AT");var af=sessions.Single(row=>row.School.GetProperty("country").GetString()=="AF");
        var atRoot=at.School.GetProperty("classes")[0].GetProperty("courseId").GetString()!;var afRoot=af.School.GetProperty("classes")[0].GetProperty("courseId").GetString()!;
        await using var atTeacher=await Connect(a,at.Teacher);await Join(atTeacher,atRoot);
        await using var atAdmin=await Connect(b,at.Admin);var atInitial=await Join(atAdmin,atRoot);var atDead=Peer(atInitial);
        await Call(atTeacher,"SetNotes",atRoot,"Retained AT");await Event(atAdmin,"NotesUpdated");
        await Call(atTeacher,"SetWaitingRoom",atRoot,false);
        var pupilToken=await Login(http,"pupil-at-0-1@load.invalid",at.School.GetProperty("password").GetString()!);
        await using var pupil=await Connect(b,pupilToken);await Join(pupil,atRoot,"ATTENDEE");
        var pupilId=Payload(await Event(atAdmin,"UserJoined")).GetProperty("connectionId").GetString();
        await Call(atTeacher,"StartBreakouts",atRoot,2,5);var assigned=await Event(pupil,"BreakoutAssigned");var child=Payload(assigned).GetProperty("subId").GetString()!;
        var childInitial=await Join(pupil,child,"ATTENDEE");Require(Payload(await Event(atAdmin,"UserLeft")).GetString()==pupilId,"Breakout move did not retire its main-room roster.");
        await using var childTeacher=await Connect(a,at.Teacher);await Join(childTeacher,child);
        var childDead=Payload(await Event(pupil,"UserJoined")).GetProperty("connectionId").GetString()!;
        await Call(childTeacher,"SetNotes",child,"Retained child");await Event(pupil,"NotesUpdated");
        await using var afTeacher=await Connect(a,af.Teacher);await Join(afTeacher,afRoot);
        await using var afAdmin=await Connect(b,af.Admin);var afInitial=await Join(afAdmin,afRoot);var afDead=Peer(afInitial);
        await Call(afTeacher,"SetNotes",afRoot,"Retained AF");await Event(afAdmin,"NotesUpdated");
        Require((await afAdmin.Invoke("JoinClass",atRoot,"Foreign","HOST")).TryGetProperty("error",out _),"Cross-school recovery access was accepted.");
        File.WriteAllText(Path.Combine(root,"classroom-pause-a"),"arm");await atTeacher.InvokeWithoutWaiting("SetNotes",atRoot,"Must never commit");
        using(var stop=new CancellationTokenSource(TimeSpan.FromSeconds(4)))while(!File.Exists(Path.Combine(root,"classroom-held-a")))await Task.Delay(10,stop.Token);
        Console.WriteLine("DM_CLASSROOM_KILL_READY");
        Require(await Console.In.ReadLineAsync()=="killed","Recovery driver did not confirm process death.");var elapsed=Stopwatch.StartNew();
        Require(Payload(await Event(atAdmin,"UserLeft")).GetString()==atDead,"Wrong main peer was reclaimed.");
        Require(Payload(await Event(pupil,"UserLeft")).GetString()==childDead,"Wrong child peer was reclaimed.");
        Require(Payload(await Event(afAdmin,"UserLeft")).GetString()==afDead,"Wrong Afghan peer was reclaimed.");
        var cleanupMs=elapsed.Elapsed.TotalMilliseconds;
        var atAfter=await Join(atAdmin,atRoot);Retained(atAfter,"Retained AT",atDead);
        var childAfter=await Join(pupil,child,"ATTENDEE");Retained(childAfter,"Retained child",childDead);
        Require(childInitial.Scope.GetProperty("sessionId").GetString()==childAfter.Scope.GetProperty("sessionId").GetString(),"Process death replaced the retained child generation.");
        var afAfter=await Join(afAdmin,afRoot);Retained(afAfter,"Retained AF",afDead);
        Require(atInitial.Scope.GetProperty("sessionId").GetString()==atAfter.Scope.GetProperty("sessionId").GetString()&&afInitial.Scope.GetProperty("sessionId").GetString()==afAfter.Scope.GetProperty("sessionId").GetString(),"Process death replaced retained generations.");
        Console.WriteLine("DM_CLASSROOM_RESTART_READY");var restarted=Address(await Console.In.ReadLineAsync()??throw new InvalidOperationException("Missing restarted address."));
        await using var fresh=await Connect(restarted,at.Teacher);var restored=await Join(fresh,atRoot);Retained(restored,"Retained AT",atDead);
        Require(restored.Scope.GetProperty("sessionId").GetString()==atInitial.Scope.GetProperty("sessionId").GetString(),"Restart replaced retained classroom epoch.");
        await Call(fresh,"SetNotes",atRoot,"Recovered routing");Require(Payload(await Event(atAdmin,"NotesUpdated")).GetProperty("text").GetString()=="Recovered routing","Routing did not recover.");
        Console.WriteLine("DM_CLASSROOM_RESULT "+JsonSerializer.Serialize(new{schools=2,countries=new[]{"AT","AF"},reclaimedConnections=3,mainAndChild=true,cleanupMs=Math.Round(cleanupMs,2),retainedEpochs=true,retainedNotes=true,uncommittedWriteAbsent=true,crossSchoolDenied=true,restartedRouting=true}));
    }
}
