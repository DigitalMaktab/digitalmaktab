using DigitalMaktab.Core.Services.OnlineClass;
using Microsoft.AspNetCore.SignalR;

// Innermost verification-only filter: production access/lease selection already
// ran. The driver separately observes the actual Redis lease before killing its
// owned API process. No production route or authorization/state replacement.
internal sealed class ClassroomCrashBarrier(string root, string host) : IHubFilter
{
    public async ValueTask<object?> InvokeMethodAsync(HubInvocationContext context, Func<HubInvocationContext, ValueTask<object?>> next)
    {
        var arm = Path.Combine(root,"classroom-pause-"+host);
        if(context.Hub is ClassHub && context.HubMethodName==nameof(ClassHub.SetNotes) && File.Exists(arm)) {
            File.Delete(arm);File.WriteAllText(Path.Combine(root,"classroom-held-"+host),"leased-body");
            using var stop=CancellationTokenSource.CreateLinkedTokenSource(context.Context.ConnectionAborted);
            stop.CancelAfter(TimeSpan.FromSeconds(5));await Task.Delay(Timeout.Infinite,stop.Token);
        }
        return await next(context);
    }
}
