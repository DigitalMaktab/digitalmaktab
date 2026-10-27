using System.Diagnostics.Metrics;
using System.Text.Json;

// Verification-only consumer of the existing production Meter. No new API route,
// instrument, identifier label or per-request sample buffer.
internal sealed class RuntimeProbe : IDisposable
{
    private readonly MeterListener listener=new();
    private readonly object gate=new(),writes=new();
    private readonly Dictionary<string,Summary> summaries=new();
    private readonly string path;
    private readonly Timer timer;
    private sealed class Summary(string name,Dictionary<string,string> tags)
    {
        public string Name{get;}=name;
        public Dictionary<string,string> Tags{get;}=tags;
        public long Count{get;set;}
        public double Sum{get;set;}
        public double Min{get;set;}=double.MaxValue;
        public double Max{get;set;}=double.MinValue;
    }
    public RuntimeProbe(string path)
    {
        this.path=path;
        listener.InstrumentPublished=(instrument,owner)=>{if(instrument.Meter.Name=="DigitalMaktab.Runtime")owner.EnableMeasurementEvents(instrument);};
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
            summary.Count++;summary.Sum+=value;summary.Min=Math.Min(summary.Min,value);summary.Max=Math.Max(summary.Max,value);
        }
    }
    private void Save()
    {
        lock(writes){
            string json;lock(gate)json=JsonSerializer.Serialize(summaries.Values,new JsonSerializerOptions(JsonSerializerDefaults.Web));
            File.WriteAllText(path+".tmp",json);File.Move(path+".tmp",path,true);
        }
    }
    public void Dispose(){timer.Dispose();listener.Dispose();Save();}
}
