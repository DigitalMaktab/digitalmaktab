using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text.Json;
using DigitalMaktab.Core.Services.Runtime;
using DigitalMaktab.Core.Tests;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Localization;
using static ClassroomRecovery;

// Closed synthetic profile using existing fixture accounts and protocol helpers.
// Histograms are fixed-size; no per-request sample or payload log is retained.
internal static class ClassroomLoad
{
    private sealed class Histogram
    {
        private readonly long[] buckets=new long[512];
        private long count;private double sum,max;
        internal void Add(double ms) { lock(buckets) { var index=Math.Clamp((int)Math.Ceiling(Math.Log(Math.Max(ms,0.1)/0.1)/Math.Log(1.025)),0,511);buckets[index]++;count++;sum+=ms;max=Math.Max(max,ms); } }
        private double Quantile(double fraction) { var target=(long)Math.Ceiling(count*fraction);long seen=0;for(var i=0;i<buckets.Length;i++){seen+=buckets[i];if(seen>=target)return Math.Round(Math.Min(max,0.1*Math.Pow(1.025,i)),2);}return max; }
        internal object Value() { lock(buckets)return new{count,meanMs=Math.Round(sum/Math.Max(1,count),2),p50UpperMs=Quantile(.5),p95UpperMs=Quantile(.95),maxMs=Math.Round(max,2)}; }
        internal long Count {get{lock(buckets)return count;}}
    }
    private sealed record School(JsonElement Data,string Marker,string Admin,string Teacher,string Room,ScopeSocket Host,string Epoch,int Index);
    private sealed record Pupil(School School,ScopeSocket Socket);
    internal static async Task Run(string root,string first,string second,int seconds)
    {
        var addresses=new[]{Address(first),Address(second)};
        using var http=new HttpClient(new HttpClientHandler{UseProxy=false}){BaseAddress=addresses[1],Timeout=TimeSpan.FromSeconds(5)};
        using var localizers=new ServiceCollection().AddLogging().AddLocalization(o=>o.ResourcesPath="Resources/Localization").BuildServiceProvider();
        var busy=localizers.GetRequiredService<IStringLocalizer<RequestCapacity>>()["Busy"].Value;Require(busy!="Busy","Load verifier could not resolve the actual localized overload contract.");
        using var fixture=JsonDocument.Parse(File.ReadAllText(Path.Combine(root,"fixture.json")));
        var schools=new List<School>();var pupils=new List<Pupil>();var owned=new List<ScopeSocket>();
        var samples=new ConcurrentDictionary<string,Histogram>(StringComparer.Ordinal);long delivered=0,structuredBusy=0,exceptionBusy=0;var drain=1;
        void Record(string key,double ms)=>samples.GetOrAdd(key,_=>new()).Add(ms);
        void CheckEvents(School school,IEnumerable<JsonElement> events)
        {
            foreach(var value in events.Where(row=>row.TryGetProperty("target",out _))) {
                Require(value.GetProperty("target").GetString()=="ClassroomEvent","Shared load received a raw event.");var args=value.GetProperty("arguments");var scope=args[0];
                Require(scope.GetProperty("roomId").GetString()==school.Room&&scope.GetProperty("sessionId").GetString()==school.Epoch,"Load event crossed room/school/generation.");
                if(args[1].GetString()=="ChatMessage")Require(args[2][0].GetProperty("body").GetString()!.StartsWith("load-"+school.Marker+"-",StringComparison.Ordinal),"Chat crossed tenant payload scope.");
                Interlocked.Increment(ref delivered);
            }
        }
        try {
            foreach(var data in fixture.RootElement.GetProperty("schools").EnumerateArray()) {
                var index=schools.Count;var marker=data.GetProperty("country").GetString()+index.ToString(System.Globalization.CultureInfo.InvariantCulture);
                var password=data.GetProperty("password").GetString()!;var admin=await Login(http,data.GetProperty("Email").GetString()!,password);
                var teacher=await Login(http,data.GetProperty("teacherEmail").GetString()!,password);var host=await Connect(addresses[index%2],teacher,4*1024*1024);owned.Add(host);
                var room=data.GetProperty("classes")[0].GetProperty("courseId").GetString()!;var joined=await Join(host,room);await Call(host,"SetWaitingRoom",room,false);
                var school=new School(data,marker,admin,teacher,room,host,joined.Scope.GetProperty("sessionId").GetString()!,index);schools.Add(school);
                var emailCode=data.GetProperty("Email").GetString()!["school-".Length..].Split('@')[0];
                for(var row=1;row<=(index==0?8:4);row++) {
                    var token=await Login(http,$"pupil-{emailCode}-{row}@load.invalid",password);var socket=await Connect(addresses[row%2],token,4*1024*1024);owned.Add(socket);await Join(socket,room,"ATTENDEE");pupils.Add(new(school,socket));
                }
            }
            var drains=schools.Select(async school=>{
                while(Volatile.Read(ref drain)==1)try{var value=await school.Host.Event("ClassroomEvent",timeoutMs:100);CheckEvents(school,[value]);}catch(OperationCanceledException){}
            }).ToArray();
            var elapsed=Stopwatch.StartNew();var end=TimeSpan.FromSeconds(seconds);
            var workers=pupils.Select(async pupil=>{
                var seq=0;
                while(elapsed.Elapsed<end) {
                    var operation=seq%3;var method=operation==0?"SendChatTyping":operation==1?"SetMic":"SendChatMessage";
                    object?[] args=operation==0?[pupil.School.Room]:operation==1?[pupil.School.Room,seq%2==0]:[pupil.School.Room,$"load-{pupil.School.Marker}-{seq}",null,null,null];
                    var watch=Stopwatch.StartNew();var result=await pupil.Socket.InvokeWithEvents(method,args);var status="accepted";
                    if(result.Completion.TryGetProperty("error",out var error)) {Require(error.GetString()!.Contains(busy,StringComparison.Ordinal),"Unexpected classroom load error: "+error.GetString());status="busy";Interlocked.Increment(ref exceptionBusy);}
                    else if(result.Completion.TryGetProperty("result",out var payload)&&payload.ValueKind==JsonValueKind.Object) {
                        Require(payload.GetProperty("code").GetString()=="server_busy"&&payload.GetProperty("status").GetInt32()==503&&payload.GetProperty("detail").GetString()==busy
                            &&payload.GetProperty("retryAfterSeconds").GetInt32() is >=1 and <=60,"Unexpected classroom result contract.");status="busy";Interlocked.Increment(ref structuredBusy);
                    }
                    Record(pupil.School.Marker+"/"+method+"/"+status,watch.Elapsed.TotalMilliseconds);
                    Require(result.Events.Count<=4096,"Load receiver failed to drain a bounded event batch.");CheckEvents(pupil.School,result.Events);seq++;
                    if(pupil.School.Index!=0)await Task.Delay(5);
                }
            });
            var ordinary=schools.Select(async school=>{
                while(elapsed.Elapsed<end) {
                    using var request=new HttpRequestMessage(HttpMethod.Get,new Uri(addresses[school.Index%2],"/api/school/students?pageNumber=1&pageSize=10"));request.Headers.Authorization=new AuthenticationHeaderValue("Bearer",school.Admin);
                    var watch=Stopwatch.StartNew();using var response=await http.SendAsync(request);Require(response.IsSuccessStatusCode,"Ordinary list lost capacity during classroom load: "+(int)response.StatusCode);
                    using var rows=JsonDocument.Parse(await response.Content.ReadAsStringAsync());Require(rows.RootElement.ValueKind==JsonValueKind.Array&&rows.RootElement.GetArrayLength()==10,"Ordinary list paging changed under load.");
                    foreach(var row in rows.RootElement.EnumerateArray())Require(row.GetProperty("schoolId").GetGuid()==school.Data.GetProperty("Id").GetGuid(),"Ordinary list crossed tenant scope.");
                    Record(school.Marker+"/student-list/accepted",watch.Elapsed.TotalMilliseconds);await Task.Delay(50);
                }
            });
            await Task.WhenAll(workers.Concat(ordinary));Volatile.Write(ref drain,0);await Task.WhenAll(drains);
            var duration=elapsed.Elapsed.TotalSeconds;var history=new List<object>();
            foreach(var school in schools) {
                Require(samples.Any(row=>row.Key.StartsWith(school.Marker+"/Send",StringComparison.Ordinal)&&row.Key.EndsWith("/accepted",StringComparison.Ordinal)&&row.Value.Count>0),"A school made no progress under hot-tenant pressure.");
                var snapshot=await Join(school.Host,school.Room);var chat=snapshot.Events.SingleOrDefault(row=>row.GetProperty("arguments")[1].GetString()=="ChatHistory");
                Require(chat.ValueKind!=JsonValueKind.Undefined,"Load did not exercise retained chat.");var messages=Payload(chat).EnumerateArray().ToArray();
                Require(messages.Length is >0 and <=500,"Retained chat count exceeded its existing bound.");Require(messages.Select(row=>row.GetProperty("id").GetString()).Distinct().Count()==messages.Length,"Chat history duplicated messages.");
                Require(messages.All(row=>row.GetProperty("body").GetString()!.StartsWith("load-"+school.Marker+"-",StringComparison.Ordinal)),"Retained history crossed tenant scope.");history.Add(new{school=school.Marker,messages=messages.Length});
            }
            foreach(var socket in owned)await socket.DisposeAsync();owned.Clear();
            Console.WriteLine("DM_CLASSROOM_LOAD_RESULT "+JsonSerializer.Serialize(new{schools=4,countries=new[]{"AT","AF"},connections=24,hotSchoolClients=8,otherSchoolClients=4,requestedSeconds=seconds,observedSeconds=Math.Round(duration,3),deliveredEvents=delivered,structuredBusy,exceptionBusy,
                noMutationRetries=true,ordinaryHttpSucceeded=true,allSchoolsProgressed=true,retainedHistory=history,latencyHistogram="512 fixed logarithmic buckets; percentile upper bounds at 2.5% resolution",operations=samples.OrderBy(row=>row.Key).Select(row=>new{operation=row.Key,latency=row.Value.Value()})}));
        }
        finally {Volatile.Write(ref drain,0);foreach(var socket in owned)await socket.DisposeAsync();}
    }
}
