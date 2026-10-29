"""Guarded actual-API process driver; credentials and payloads never enter results."""
import argparse
import hashlib
import io
import zipfile
import http.client
import urllib.parse
import datetime
import statistics
import concurrent.futures
import json
import logging
import logging.handlers
import os
from pathlib import Path
import queue
import signal
import shutil
import tempfile
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import uuid

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument("api")
parser.add_argument("--seconds",type=float,default=10,help="mixed pressure duration (1..60, default 10)")
classroom_modes=parser.add_mutually_exclusive_group()
classroom_modes.add_argument("--classroom-recovery",action="store_true",help="verify shared classroom recovery after killing an owned API process")
classroom_modes.add_argument("--classroom-load",action="store_true",help="run bounded multi-school shared classroom traffic and resource checks")
parser.add_argument("--classroom-seconds",type=int,default=30,help="classroom load duration (5..600, default 30)")
options=parser.parse_args()
if not 1<=options.seconds<=60:parser.error("--seconds must be between 1 and 60")
if not 5<=options.classroom_seconds<=600:parser.error("--classroom-seconds must be between 5 and 600")
root=Path(os.environ["DM_LOAD_ROOT"])
api=Path(options.api).resolve()
if not root.is_absolute() or root.is_symlink() or not root.name.startswith("digitalmaktab-core-support."):
    raise RuntimeError("Refusing a non-private load directory")
(root/".dm-full-app-load").write_text(str(uuid.uuid4()))
keys=root/"keys";keys.mkdir()
key_id=str(uuid.uuid4());(keys/".digitalmaktab-key-ring").write_text(key_id)
settings=json.loads((api/"appsettings.json").read_text())
settings["Kestrel"]={"Endpoints":{"Http":{"Url":"http://127.0.0.1:0"}}}
settings["DataProtection"]={"KeyRingPath":str(keys),"KeyRingId":key_id,"AllowUnencryptedKeyStorage":True}
settings["Logging"]={"LogLevel":{"Default":"Warning","Microsoft.EntityFrameworkCore":"Warning"}}
classroom_prefix="dm-classroom-"+uuid.uuid4().hex
if options.classroom_recovery or options.classroom_load:
    settings["NotificationBackplane"]={"Enabled":True,"ConnectionString":"!"+str(root/"classroom.sock"),"ChannelPrefix":classroom_prefix,"TimeoutMs":1000}
    settings["ClassroomDelivery"]={"SharedState":True,"MaxConnections":32,"MaxConnectionsPerSchool":16,"MaxHosts":2,"HostLeaseMs":6000,"PendingAdmissionMs":1000,"OperationTimeoutMs":2000,"IdleRetentionMinutes":1}
    if options.classroom_load:
        settings["ClassroomDelivery"].update({"MaxConcurrentInvocations":8,"MaxInvocationsPerSchool":2,"MaxConcurrentPublications":4})
        # Only the synthetic login phase needs more than the production IP login
        # window; steady-state classroom operations keep their real Core budgets.
        for rule in settings["IpRateLimiting"]["GeneralRules"]:
            if rule["Endpoint"].lower()=="post:/api/auth":rule["Limit"]=1000
(root/"appsettings.json").write_text(json.dumps(settings))
# Never inherit application configuration/credentials from the user's shell.
env={k:v for k,v in os.environ.items() if k in {"PATH","HOME","TMPDIR","DOTNET_ROOT","DOTNET_CLI_HOME","NUGET_PACKAGES","DM_LOAD_ROOT","DM_LOAD_DATABASE"}}
env["DOTNET_CLI_TELEMETRY_OPTOUT"]="1"
if options.classroom_recovery:env["DM_CLASSROOM_RECOVERY"]="1"
if options.classroom_load:env["DM_CLASSROOM_LOAD"]="1"
runner=Path(__file__).resolve().parents[2]/"tests/DigitalMaktab.Api.LoadHarness/bin/Debug/net8.0/DigitalMaktab.Api.LoadHarness.dll"
subprocess.run(["dotnet",str(runner),"seed"],cwd=root,env=env,check=True,stdout=subprocess.DEVNULL)
children=[]
running={}
process_runtime=[]
owned_redis=None
api_runtime_config=api/"bin/Debug/net8.0/digitalmaktabapi.runtimeconfig.json"
def interrupt(_signum,_frame):raise KeyboardInterrupt()
signal.signal(signal.SIGTERM,interrupt)
opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))

def start(name):
    process=subprocess.Popen(["dotnet","exec","--runtimeconfig",str(api_runtime_config),str(runner),"host",name],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    children.append(process)
    running[name]=process
    ready=queue.Queue()
    def consume():
        log=logging.getLogger("dm-private-api-"+name+"-"+str(process.pid));log.propagate=False;log.setLevel(logging.INFO)
        handler=logging.handlers.RotatingFileHandler(root/("host-"+name+".log"),maxBytes=1048576,backupCount=1,encoding="utf-8")
        handler.setFormatter(logging.Formatter("%(message)s"));log.addHandler(handler)
        try:
            for line in process.stdout:
                log.info("%s",line.rstrip("\n"))
                if line.startswith("DM_LOAD_RUNTIME "):process_runtime.append({"host":name,**json.loads(line.split(" ",1)[1])})
                if line.startswith("DM_LOAD_READY "):ready.put(line.strip().split(" ",1)[1])
        finally:
            handler.close();log.removeHandler(handler);ready.put(None)
    threading.Thread(target=consume,daemon=True).start()
    try: address=ready.get(timeout=120)
    except queue.Empty: raise RuntimeError("Private API did not become ready within 120 seconds")
    if address is None: raise RuntimeError("Private API startup failed; inspect host-"+name+".log")
    return address

def request(address,path,token=None,body=None,method=None,extra=None):
    headers={"Accept":"application/json","Accept-Language":"en-US"}
    if token:headers["Authorization"]="Bearer "+token
    if body is not None and not isinstance(body,bytes):headers["Content-Type"]="application/json"
    headers.update(extra or {})
    encoded=body if isinstance(body,bytes) else None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(address+path,data=encoded,headers=headers,method=method)
    start_time=time.monotonic()
    try:
        with opener.open(req,timeout=30) as response:result=(response.status,dict(response.headers),response.read(16777217))
    except urllib.error.HTTPError as error:result=(error.code,dict(error.headers),error.read(16777217))
    if len(result[2])>16777216:raise RuntimeError("Private fixture response exceeded its 16 MiB verification budget")
    return (*result,(time.monotonic()-start_time)*1000)

def wait_ready(address):
    deadline=time.monotonic()+20
    while request(address,"/health/ready")[0]!=200:
        if time.monotonic()>deadline:raise RuntimeError("Shared classroom API never became ready")
        time.sleep(0.05)

def classroom_recovery(hosts,fixture):
    client=subprocess.Popen(["dotnet",str(runner),"classroom-recovery",*hosts],cwd=root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    children.append(client);messages=queue.Queue()
    def consume():
        with (root/"classroom-client.log").open("w") as log:
            for line in client.stdout:
                log.write(line);log.flush()
                if line.startswith("DM_CLASSROOM_"):messages.put(line.strip())
        messages.put(None)
    threading.Thread(target=consume,daemon=True).start()
    def expect(prefix):
        value=messages.get(timeout=90)
        if value is None or not value.startswith(prefix):raise RuntimeError("Classroom recovery client did not reach "+prefix+"; inspect classroom-client.log")
        return value
    expect("DM_CLASSROOM_KILL_READY")
    course=fixture["schools"][0]["classes"][0]["courseId"]
    key=classroom_prefix+":classroom:v3:{"+classroom_prefix+":classrooms}:"+hashlib.sha256(course.encode()).hexdigest().upper()
    # Inspect only the explicitly selected private family, without printing its owner.
    probe="local t=redis.call('TIME'); local m=redis.call('HMGET',KEYS[1],'@owner','@until'); return m[1] and tonumber(m[2] or '0')>tonumber(t[1])*1000+math.floor(tonumber(t[2])/1000) and 1 or 0"
    observed=subprocess.run([shutil.which("redis-cli") or "redis-cli","-s",str(root/"classroom.sock"),"--raw","EVAL",probe,"1",key],check=True,capture_output=True,text=True,timeout=5)
    if observed.stdout.strip()!="1":raise RuntimeError("Crash barrier did not hold the actual unexpired classroom lease")
    running["a"].kill();running["a"].wait(timeout=10)
    if running["a"].returncode!=-signal.SIGKILL:raise RuntimeError("Owned API process did not exit via abrupt kill")
    client.stdin.write("killed\n");client.stdin.flush()
    # Ordinary health remains available on the survivor while it reclaims peers.
    if request(hosts[1],"/health/live")[0]!=200:raise RuntimeError("Surviving API liveness failed")
    expect("DM_CLASSROOM_RESTART_READY");wait_ready(hosts[1]);hosts[0]=start("a");wait_ready(hosts[0])
    client.stdin.write(hosts[0]+"\n");client.stdin.flush()
    result=json.loads(expect("DM_CLASSROOM_RESULT ").split(" ",1)[1]);client.wait(timeout=15)
    if client.returncode!=0:raise RuntimeError("Classroom recovery client failed after its result")
    build=json.loads(subprocess.run(["dotnet",str(runner),"build-info"],cwd=root,env=env,check=True,capture_output=True,text=True).stdout)
    source_files=[Path(__file__).resolve(),*sorted((Path(__file__).resolve().parents[2]/"tests/DigitalMaktab.Api.LoadHarness").glob("*.cs")),api.parent/"digitalmaktab-core/tests/DigitalMaktab.Core.Tests/ScopeSocket.cs"]
    print(json.dumps({"scope":"actual separate API process SIGKILL while holding classroom lease; private synthetic AT/AF fixture; no production-capacity claim",**result,"heldLeaseObserved":True,"exitSignal":"SIGKILL","survivorReady":True,"build":build,"observedProcessRuntime":process_runtime,"sourceSha256":{str(path.relative_to(api.parent)):hashlib.sha256(path.read_bytes()).hexdigest() for path in source_files}},indent=2))

def classroom_load(hosts):
    process=subprocess.Popen(["dotnet",str(runner),"classroom-load",*hosts,str(options.classroom_seconds)],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    children.append(process);messages=queue.Queue()
    def consume():
        with (root/"classroom-load-client.log").open("w") as log:
            for line in process.stdout:
                log.write(line);log.flush()
                if line.startswith("DM_CLASSROOM_LOAD_RESULT "):messages.put(line.strip())
        messages.put(None)
    threading.Thread(target=consume,daemon=True).start()
    value=messages.get(timeout=options.classroom_seconds+120)
    if value is None:raise RuntimeError("Classroom load client failed; inspect classroom-load-client.log")
    result=json.loads(value.split(" ",1)[1]);process.wait(timeout=15)
    if process.returncode!=0:raise RuntimeError("Classroom load client failed after its result")
    deadline=time.monotonic()+10
    while True:
        metrics=[{"process":file.stem,"measurements":json.loads(file.read_text())} for file in root.glob("metrics-*.json")]
        gates={"classrooms.connections.active","classrooms.methods.active","classrooms.publications.active","classrooms.rooms.retained"}
        counts=[row["sum"] for item in metrics for row in item["measurements"] if row["name"] in gates]
        if len(counts)==8 and all(count==0 for count in counts):break
        if time.monotonic()>deadline:raise RuntimeError("Classroom sockets/frames did not release existing active-resource accounting")
        time.sleep(0.1)
    resources=[{"process":file.stem,"measurements":json.loads(file.read_text())} for file in root.glob("resources-*.json")]
    if len(resources)!=2:raise RuntimeError("Missing process resource samples")
    for item in resources:
        for row in item["measurements"]:
            ceiling=1073741824 if row["name"]=="process.working_set.bytes" else 536870912 if row["name"]=="gc.managed_heap.bytes" else None
            if ceiling is not None and row["max"]>ceiling:raise RuntimeError("Private classroom resource guard exceeded: "+row["name"])
    def redis(*args):return subprocess.run([shutil.which("redis-cli"),"-s",str(root/"classroom.sock"),"--raw",*args],check=True,capture_output=True,text=True,timeout=5).stdout.strip()
    prefix=classroom_prefix+":classroom:v3:{"+classroom_prefix+":classrooms}"
    connection_records=int(redis("HLEN",prefix+":connections:records"))-1
    pending=int(redis("ZCARD",prefix+":connections:pending"));by_host=int(redis("ZCARD",prefix+":connections:by-host"))
    if connection_records or pending or by_host:raise RuntimeError("Disconnected classroom metadata was retained in admission indexes")
    memory=dict(line.split(":",1) for line in redis("INFO","memory").splitlines() if ":" in line)
    retained=int(redis("HGET",prefix+":rooms:counts","@total"))
    if retained!=4:raise RuntimeError("Classroom retention index no longer matches four selected roots")
    for host in hosts:wait_ready(host)
    build=json.loads(subprocess.run(["dotnet",str(runner),"build-info"],cwd=root,env=env,check=True,capture_output=True,text=True).stdout)
    print(json.dumps({"scope":"bounded actual two-process classroom traffic; synthetic four-school AT/AF profile; no production SLA or supported-user claim",**result,"fixtureLimits":settings["ClassroomDelivery"],"fixtureLoginIpLimit":1000,"resourceSamplePeriodMs":500,"capturedApiLogs":{"maxBytes":1048576,"backupFiles":1,"scope":"verification stdout retention; API logger behavior unchanged"},"resourceGuards":{"workingSetBytesPerApi":1073741824,"managedHeapBytesPerApi":536870912},"runtimeMetrics":metrics,"processResources":resources,"redis":{"usedBytes":int(memory["used_memory"]),"peakBytes":int(memory["used_memory_peak"]),"retainedRooms":retained,"connectionRecordsAfterDisconnect":connection_records,"pendingAfterDisconnect":pending,"byHostAfterDisconnect":by_host},"build":build,"sourceSha256":{str(path.relative_to(api.parent)):hashlib.sha256(path.read_bytes()).hexdigest() for path in [Path(__file__).resolve(),*sorted((Path(__file__).resolve().parents[2]/"tests/DigitalMaktab.Api.LoadHarness").glob("*.cs")),api.parent/"digitalmaktab-core/tests/DigitalMaktab.Core.Tests/ScopeSocket.cs"]}},indent=2))

try:
    if options.classroom_recovery or options.classroom_load:
        executable=shutil.which("redis-server")
        if executable is None or shutil.which("redis-cli") is None:raise RuntimeError("Classroom recovery needs redis-server and redis-cli")
        with (root/"classroom-redis.log").open("w") as log:
            owned_redis=subprocess.Popen([executable,"--port","0","--unixsocket",str(root/"classroom.sock"),"--unixsocketperm","700","--save","","--appendonly","no","--daemonize","no","--dir",str(root),"--loglevel","warning"],env=env,stdout=log,stderr=subprocess.STDOUT)
        deadline=time.monotonic()+5
        while not (root/"classroom.sock").exists():
            if owned_redis.poll() is not None or time.monotonic()>deadline:raise RuntimeError("Private classroom Redis failed to start")
            time.sleep(0.01)
    # Independent processes share only PostgreSQL and the private key ring.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        hosts=list(pool.map(start,["a","b"]))
    fixture=json.loads((root/"fixture.json").read_text())
    if options.classroom_recovery:
        for host in hosts:wait_ready(host)
        classroom_recovery(hosts,fixture)
        sys.exit(0)
    if options.classroom_load:
        for host in hosts:wait_ready(host)
        classroom_load(hosts)
        sys.exit(0)
    evidence=[]
    for host in hosts:
        for path in ["/health/live","/health/ready"]:
            status,headers,body,elapsed=request(host,path)
            if status!=200:raise RuntimeError("Private API health failed: "+path+" status "+str(status))
            evidence.append({"operation":path,"status":status,"ms":round(elapsed,2)})
    sessions=[]
    for school in fixture["schools"]:
        status,headers,body,elapsed=request(hosts[0],"/api/auth",body={"email":school["Email"],"password":school["password"]})
        if status!=200:raise RuntimeError("Private school login failed with status "+str(status))
        token=json.loads(body)["token"]
        status,headers,body,elapsed=request(hosts[1],"/api/auth",body={"email":school["teacherEmail"],"password":school["password"]})
        if status!=200:raise RuntimeError("Private teacher login failed with status "+str(status))
        sessions.append({"school":school,"token":token,"teacher":json.loads(body)["token"]})
    def checked(session,operation,path,body=None,method=None,key=None,actor="token",host=0,expected=(200,)):
        result=request(hosts[host],path,session[actor],body,method,{"Idempotency-Key":key} if key else None)
        status,headers,data,ms=result
        if status not in expected:raise RuntimeError(operation+" returned unexpected status "+str(status)+" "+data[:2048].decode(errors="replace"))
        evidence.append({"operation":operation,"country":session["school"]["country"],"status":status,"ms":round(ms,2),"bytes":len(data)})
        if status==503:
            problem=json.loads(data)
            backup_busy=path=="/api/backup/export" and problem.get("code") in ("BackupBusy","BackupTimedOut","BackupUnavailable")
            if headers.get("Retry-After")!=("5" if backup_busy else "2") or (not backup_busy and problem.get("code")!="server_busy"):
                raise RuntimeError("Unstructured overload response")
            if "no-store" not in headers.get("Cache-Control",""):raise RuntimeError("Overload response was cacheable")
        if status==429 and (not headers.get("Retry-After") or not headers["Retry-After"].isdigit()):raise RuntimeError("Missing rate-limit recovery hint")
        if operation in ("backup-export","export-under-pressure") and status==200:
            if "no-store" not in headers.get("Cache-Control","") or headers.get("Content-Type")!="application/zip":
                raise RuntimeError("Backup response cache/type contract changed")
            if int(headers.get("Content-Length","-1"))!=len(data):raise RuntimeError("Backup was not exposed as a completed length-known archive")
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if archive.getinfo("students.json").file_size>33554432:raise RuntimeError("Private fixture student archive exceeded its verification budget")
                manifest=json.loads(archive.read("manifest.json"))[0]
                if manifest["formatVersion"]!=2 or manifest["schoolId"]!=session["school"]["Id"] or set(manifest["entries"])!=set(archive.namelist())-{"manifest.json"}:
                    raise RuntimeError("Backup manifest contract/scope changed")
                has_afghan=any(name.startswith("afghanistan/") for name in archive.namelist())
                if has_afghan!=(session["school"]["country"]=="AF"):raise RuntimeError("Backup country activation changed")
                pupils=json.loads(archive.read("students.json"))
                if not pupils or any(row["schoolId"]!=session["school"]["Id"] for row in pupils):raise RuntimeError("Export crossed school scope")
                if operation=="backup-export" and len(pupils)!=402:raise RuntimeError("Export omitted a committed student")
        if operation=="student-list" and status==200:
            rows=json.loads(data)
            if not rows or any(row["schoolId"]!=session["school"]["Id"] or not row.get("firstName") for row in rows):raise RuntimeError("Student scope/name regression")
        return result
    def reads(session,host=0,repeat=1):
        school=session["school"];cls=school["classes"][0]
        cases=[("student-list","/api/school/students?pageSize=50&pageNumber=2"),("dashboard","/api/school/dashboard"),
            ("fees","/api/fee/list?pageSize=50"),("attendance-summary","/api/attendance/school/summary?classId="+cls["classId"])]
        for _ in range(repeat):
            for operation,path in cases:checked(session,operation,path,host=host)
    for session in sessions:
        reads(session)
    foreign=sessions[2]["school"]["classes"][0]["pupils"][0]["studentId"]
    checked(sessions[0],"foreign-profile-denied","/api/school/student/"+foreign,expected=(404,))
    checked(sessions[0],"foreign-report-denied","/api/report-card/student/"+foreign,expected=(404,))
    start_time=time.monotonic()
    mixed_deadline=start_time+options.seconds
    mixed_start=len(evidence)
    writes=[]
    for index,session in enumerate(sessions):
        school=session["school"];cls=school["classes"][0];pupil=cls["pupils"][0]
        registration={"firstName":"Registered","lastName":"Private","joiningClassId":cls["classId"],"primaryAddress":{},"secondaryAddress":{},
            "dateOfBirth":"2015-03-21","gender":"MALE","email":"registered-"+str(index)+"@load.invalid","monthlyFee":500}
        payment={"feeId":pupil["feeId"],"amount":150,"paymentMethod":"CASH","paidAt":datetime.datetime.now(datetime.UTC).isoformat().replace("+00:00","Z")}
        attendance={"calendarYearId":school["calendarYearId"],"date":fixture["civilDate"],
            "attendances":[{"enrollmentId":row["enrollmentId"],"status":True} for row in cls["pupils"]]}
        for operation,path,body,actor in [("registration","/api/school/registerStudent",registration,"token"),("payment","/api/fee/payments",payment,"token"),
            ("attendance-write","/api/teacher/addAttendance",attendance,"teacher")]:
            writes.append((session,operation,path,body,str(uuid.uuid4()),actor))
    def pressure_reads(session,host):
        cls=session["school"]["classes"][0]
        cases=[("student-list","/api/school/students?pageSize=50&pageNumber=2"),("dashboard","/api/school/dashboard"),
            ("fees","/api/fee/list?pageSize=50"),("attendance-summary","/api/attendance/school/summary?classId="+cls["classId"])]
        while time.monotonic()<mixed_deadline:
            for operation,path in cases:
                response=checked(session,operation,path,host=host,expected=(200,429))
                if response[0]==429:
                    time.sleep(min(float(response[1]["Retry-After"]),max(0,mixed_deadline-time.monotonic())))
                    break
    def pressure_outputs(selection,host):
        for session in selection:
            pupil=session["school"]["classes"][0]["pupils"][0]
            for operation,path in [("report-under-pressure","/api/report-card/student/"+pupil["studentId"]),("export-under-pressure","/api/backup/export"),("template-under-pressure","/api/school/importTemplate/students")]:
                checked(session,operation,path,host=host,expected=(200,429,503))
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        pending=[pool.submit(pressure_reads,session,host) for session in sessions for host in range(2)]
        pending.extend([pool.submit(pressure_outputs,sessions[:2],0),pool.submit(pressure_outputs,sessions[2:],1)])
        for session,op,path,body,key,actor in writes:
            for host in range(2):pending.append(pool.submit(checked,session,op,path,body,None,key,actor,host,(200,429,503)))
        for future in pending:future.result()
    mixed_seconds=time.monotonic()-start_time
    mixed_requests=len(evidence)-mixed_start
    mixed_successes=sum(200<=row["status"]<300 for row in evidence[mixed_start:])
    time.sleep(1.1) # let the fixture's one-second IP window expire before recovery
    # Explicit recovery/replay after pressure, preserving each original body/key.
    originals=[]
    for session,op,path,body,key,actor in writes:
        recovered=checked(session,op+"-recovery",path,body,key=key,actor=actor)
        replay=checked(session,op+"-replay",path,body,key=key,actor=actor,host=1)
        if recovered[2]!=replay[2]:raise RuntimeError("Durable response changed across processes")
        originals.append(recovered[2])
    # Competing edits preserve the original version and cannot both win.
    for session in sessions:
        pupil=session["school"]["classes"][0]["pupils"][0]
        detail={k:v for k,v in json.loads(checked(session,"profile-read","/api/school/student/"+pupil["studentId"])[2]).items() if v is not None}
        detail["firstName"]="Edited private";detail["primaryAddress"]=detail.get("primaryAddress") or {};detail["secondaryAddress"]=detail.get("secondaryAddress") or {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            outcomes=list(pool.map(lambda h:checked(session,"profile-race","/api/school/student/"+pupil["studentId"],detail,"PUT",host=h,expected=(200,204,409)),range(2)))
        if sorted(o[0] for o in outcomes) not in ([200,409],[204,409]):raise RuntimeError("Both profile editors won or both lost")
    # Real workbook template -> fill existing sheet -> actual multipart import.
    for index,session in enumerate(sessions):
        template=checked(session,"import-template","/api/school/importTemplate/students")[2]
        (root/("template-"+str(index)+".xlsx")).write_bytes(template)
        subprocess.run(["dotnet",str(runner),"workbook",str(index)],cwd=root,env=env,check=True,stdout=subprocess.DEVNULL)
        boundary="dmload"+uuid.uuid4().hex
        upload=("--"+boundary+'\r\nContent-Disposition: form-data; name="file"; filename="import.xlsx"\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n').encode()+(root/("import-"+str(index)+".xlsx")).read_bytes()+("\r\n--"+boundary+"--\r\n").encode()
        key=str(uuid.uuid4());extra={"Idempotency-Key":key,"Content-Type":"multipart/form-data; boundary="+boundary}
        imported=request(hosts[0],"/api/school/import/students",session["token"],upload,extra=extra)
        if imported[0]!=200 or json.loads(imported[2]).get("createdCount")!=1:raise RuntimeError("Actual workbook import did not create one row: "+str(imported[0])+" "+str(json.loads(imported[2]).get("errors",[])))
        replay=request(hosts[1],"/api/school/import/students",session["token"],upload,extra=extra)
        if replay[0]!=200 or replay[2]!=imported[2]:raise RuntimeError("Workbook replay changed across processes")
        evidence.append({"operation":"workbook-import","country":session["school"]["country"],"status":imported[0],"ms":round(imported[3],2)})
        pupil=session["school"]["classes"][0]["pupils"][0]
        checked(session,"academic-report","/api/report-card/student/"+pupil["studentId"])
        exported=checked(session,"backup-export","/api/backup/export")
        if not exported[2]:raise RuntimeError("Empty school export")
    # Observe an actual PostgreSQL row-lock wait in the financial request,
    # kill only that API process, then recover the same intent on the survivor.
    holder=subprocess.Popen(["dotnet",str(runner),"hold-fee"],cwd=root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    children.append(holder)
    if holder.stdout.readline().strip()!="DM_LOAD_ROW_HELD":raise RuntimeError("Private fee barrier did not acquire its row")
    interrupted_key=str(uuid.uuid4());interrupted_body=dict(writes[1][3]);interrupted_body["amount"]=10
    address=urllib.parse.urlsplit(hosts[0]);pending=http.client.HTTPConnection(address.hostname,address.port,timeout=30)
    try:
        pending.request("POST","/api/fee/payments",json.dumps(interrupted_body),{"Content-Type":"application/json","Authorization":"Bearer "+sessions[0]["token"],"Idempotency-Key":interrupted_key})
        deadline=time.monotonic()+10
        while True:
            waiting=subprocess.run(["dotnet",str(runner),"waits"],cwd=root,env=env,check=True,capture_output=True,text=True)
            if int(waiting.stdout)>0:break
            if time.monotonic()>deadline:raise RuntimeError("Financial request never reached the held fee row")
            time.sleep(0.02)
        running["a"].kill();running["a"].wait(timeout=10)
    finally:
        pending.close();holder.stdin.write("\n");holder.stdin.flush();holder.wait(timeout=10)
    interrupted=checked(sessions[0],"interrupted-payment-recovery","/api/fee/payments",interrupted_body,key=interrupted_key,host=1)
    hosts[0]=start("a")
    restarted=checked(sessions[0],"interrupted-payment-replay","/api/fee/payments",interrupted_body,key=interrupted_key)
    if interrupted[2]!=restarted[2]:raise RuntimeError("Interrupted financial intent did not replay after process recovery")
    for (session,op,path,body,key,actor),original in zip(writes,originals):
        if checked(session,op+"-restart-replay",path,body,key=key,actor=actor)[2]!=original:raise RuntimeError("Replay did not survive host loss")
    inspection=subprocess.run(["dotnet",str(runner),"inspect"],cwd=root,env=env,check=True,capture_output=True,text=True)
    invariants=json.loads(inspection.stdout)
    for index,school in enumerate(invariants):
        if school["students"]!=402 or school["enrollments"]!=402 or school["classes"]!=11 or school["capacityViolations"] or school["duplicatePlacements"] or school["payments"]!=(2 if index==0 else 1) or school["paid"]!=(160 if index==0 else 150) or school["todayMarks"]!=2 or school["editedProfiles"]!=1 or (school["CountryCode"]=="AT" and school["afghanProfiles"]!=0) or (school["CountryCode"]=="AF" and school["afghanProfiles"]<2):
            raise RuntimeError("Persisted mixed-workload invariant failed: "+str(school))
    build_info=json.loads(subprocess.run(["dotnet",str(runner),"build-info"],cwd=root,env=env,check=True,capture_output=True,text=True).stdout)
    sources={str(path.relative_to(Path(__file__).resolve().parents[2])):hashlib.sha256(path.read_bytes()).hexdigest()
        for path in [Path(__file__).resolve(),*sorted((Path(__file__).resolve().parents[2]/"tests/DigitalMaktab.Api.LoadHarness").glob("*.cs"))]}
    time.sleep(0.6)
    runtime=[]
    for file in root.glob("metrics-*.json"):
        runtime.append({"process":file.stem,"measurements":json.loads(file.read_text())})
    if not any(m["name"]=="digitalmaktab.requests.duration" and m["count"]>0 for process in runtime for m in process["measurements"]):raise RuntimeError("Production runtime metrics were not observed")
    summaries=[]
    for operation in sorted({e["operation"] for e in evidence}):
        rows=[e for e in evidence if e["operation"]==operation];values=sorted(e["ms"] for e in rows)
        summaries.append({"operation":operation,"requests":len(rows),"statuses":{str(status):sum(e["status"]==status for e in rows) for status in {e["status"] for e in rows}},
            "p50ms":round(statistics.median(values),2),"p95ms":values[min(len(values)-1,int(len(values)*0.95))],"maxMs":max(values)})
    print(json.dumps({"scope":"actual two-process API mixed workload; local synthetic fixture, no supported-user or production-SLA claim",
        "schools":4,"fixtureCivilDate":fixture["civilDate"],"initialStudents":1600,"initialAttendanceRows":8000,"mixedSeconds":round(mixed_seconds,3),"mixedRequests":mixed_requests,"mixedAttemptsPerSecond":round(mixed_requests/mixed_seconds,2),"mixedSuccessfulRequests":mixed_successes,"mixedSuccessesPerSecond":round(mixed_successes/mixed_seconds,2),
        "pressureClients":12,"fixtureLimits":{"requestsPerHost":64,"perSchoolPerHost":16,"expensivePerHost":2,"expensivePerSchoolPerHost":1,"databasePoolPerHost":24,"sharedIpEndpointPerSecond":500,"sharedIpEndpointPerMinute":10000},
        "build":build_info,"apiRuntimeConfig":json.loads(api_runtime_config.read_text()),"observedProcessRuntime":process_runtime,"driverSha256":sources,"operations":summaries,"persistedInvariants":invariants,"runtimeMetrics":runtime},indent=2))

except SystemExit:
    raise
except BaseException:
    failure=Path(tempfile.mkdtemp(prefix="digitalmaktab-api-load-failure."))
    for log in [*root.glob("host-*.log*"),*root.glob("classroom-*.log"),*root.glob("metrics-*.json"),*root.glob("resources-*.json")]:
        (failure/log.name).write_bytes(log.read_bytes()[-262144:])
    print("Private API failure logs: "+str(failure),file=sys.stderr)
    raise
finally:
    for process in children:
        if process.poll() is None:process.terminate()
    for process in children:
        try:process.wait(timeout=15)
        except subprocess.TimeoutExpired:process.kill();process.wait(timeout=5)
    if owned_redis is not None:
        if owned_redis.poll() is None:owned_redis.terminate()
        try:owned_redis.wait(timeout=10)
        except subprocess.TimeoutExpired:owned_redis.kill();owned_redis.wait(timeout=5)
