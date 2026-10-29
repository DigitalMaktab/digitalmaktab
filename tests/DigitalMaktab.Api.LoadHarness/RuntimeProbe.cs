using System.Diagnostics.Metrics;
using System.Text.Json;
using System.Diagnostics;

// Verification-only consumer of the existing production Meter. No new API route,
// instrument, identifier label or per-request sample buffer.
internal sealed class RuntimeProbe : IDisposable
{
    private readonly MeterListener listener=new();
    private readonly object gate=new(),writes=new();
    private readonly Dictionary<string,Summary> summaries=new();
    private readonly string path;
    private readonly Timer timer;
    private readonly Dictionary<string,Summary> resources=new();
    private sealed class Summary(string name,Dictionary<string,string> tags)
    {
        public string Name{get;}=name;
        public Dictionary<string,string> Tags{get;}=tags;
        public long Count{get;set;}
        public double Sum{get;set;}
        public double Min{get;set;}=double.MaxValue;
        public double Max{get;set;}=double.MinValue;
        public double Last{get;set;}
    }
    public RuntimeProbe(string path)
    {
        this.path=path;
        listener.InstrumentPublished=(instrument,owner)=>{if(instrument.Meter.Name is "DigitalMaktab.Runtime" or "DigitalMaktab.Classrooms")owner.EnableMeasurementEvents(instrument);};
        listener.SetMeasurementEventCallback<long>((i,value,tags,_)=>Record(i,value,tags));
        listener.SetMeasurementEventCallback<int>((i,value,tags,_)=>Record(i,value,tags));
        listener.SetMeasurementEventCallback<double>((i,value,tags,_)=>Record(i,value,tags));
        listener.Start();timer=new Timer(_=>Save(),null,TimeSpan.FromMilliseconds(500),TimeSpan.FromMilliseconds(500));
    }
    private void Record(Instrument instrument,double value,ReadOnlySpan<KeyValuePair<string,object?>> tags)
    {
        if(!double.IsFinite(value))return;
        var safe=new Dictionary<string,string>();
        foreach(var tag in tags)if(tag.Key is "route" or "method" or "status" or "reason"){
            var text=tag.Value?.ToString();if(text!=null&&text.Length<=200)safe[tag.Key]=text;
        }
        var key=instrument.Name+"|"+string.Join("|",safe.OrderBy(p=>p.Key).Select(p=>p.Key+"="+p.Value));
        lock(gate){
            if(!summaries.TryGetValue(key,out var summary)){
                if(summaries.Count>=256)return;
                summaries[key]=summary=new(instrument.Name,safe);
            }
            summary.Count++;summary.Sum+=value;summary.Min=Math.Min(summary.Min,value);summary.Max=Math.Max(summary.Max,value);summary.Last=value;
        }
    }
    private void Save()
    {
        lock(writes){
            string json;lock(gate)json=JsonSerializer.Serialize(summaries.Values,new JsonSerializerOptions(JsonSerializerDefaults.Web));
            File.WriteAllText(path+".tmp",json);File.Move(path+".tmp",path,true);
            using var process=Process.GetCurrentProcess();
            foreach(var (name,value) in new Dictionary<string,double>{["process.working_set.bytes"]=process.WorkingSet64,["gc.managed_heap.bytes"]=GC.GetTotalMemory(false),
                ["gc.heap_size.bytes"]=GC.GetGCMemoryInfo().HeapSizeBytes,["gc.total_allocated.bytes"]=GC.GetTotalAllocatedBytes(),["process.cpu.seconds"]=process.TotalProcessorTime.TotalSeconds}) {
                if(!resources.TryGetValue(name,out var summary))resources[name]=summary=new(name,new());
                summary.Count++;summary.Sum+=value;summary.Min=Math.Min(summary.Min,value);summary.Max=Math.Max(summary.Max,value);summary.Last=value;
            }
            var resourcePath=Path.Combine(Path.GetDirectoryName(path)!,Path.GetFileName(path).Replace("metrics-","resources-",StringComparison.Ordinal));
            File.WriteAllText(resourcePath+".tmp",JsonSerializer.Serialize(resources.Values,new JsonSerializerOptions(JsonSerializerDefaults.Web)));File.Move(resourcePath+".tmp",resourcePath,true);
        }
    }
    public void Dispose(){timer.Dispose();listener.Dispose();Save();}
}
