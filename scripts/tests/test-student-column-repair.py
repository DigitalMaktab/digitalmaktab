import pathlib,tempfile,subprocess,shutil,os
root=pathlib.Path(__file__).resolve().parents[2];tmp=pathlib.Path(tempfile.mkdtemp(prefix='dm-student-repair-',dir='/tmp'));pg=tmp/'pg';sock=tmp/'s';sock.mkdir();started=False
try:
 subprocess.run(['initdb','-D',str(pg),'--auth=trust','--username=repair_test'],stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,check=True)
 subprocess.run(['pg_ctl','-D',str(pg),'-o',f"-h '' -k '{sock}' -p 55439",'-l',str(tmp/'pg.log'),'-w','start'],stdout=subprocess.DEVNULL,check=True);started=True
 subprocess.run(['createdb','-h',str(sock),'-p','55439','-U','repair_test','repair_test'],check=True)
 cmd=['psql','-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-h',str(sock),'-p','55439','-U','repair_test','-d','repair_test']
 def sql(s,ok=True):
  p=subprocess.run(cmd,input=s,text=True,capture_output=True)
  if ok and p.returncode:raise RuntimeError(p.stderr)
  return p
 fixture='''CREATE TABLE "Student" ("Id" uuid CONSTRAINT "PK_Student" PRIMARY KEY,"FirstName" text,"Details" jsonb,"SecretBytes" bytea,"CreationDate" timestamptz DEFAULT now());
 CREATE TABLE "Enrollment" ("Id" int PRIMARY KEY,"StudentId" uuid CONSTRAINT "FK_Test_Student" REFERENCES "Student"("Id") ON DELETE RESTRICT);
 CREATE INDEX "IX_Student_FirstName" ON "Student"("FirstName");
 COMMENT ON TABLE "Student" IS 'preserve table'; COMMENT ON COLUMN "Student"."Details" IS 'preserve column';
 INSERT INTO "Student" VALUES ('11111111-1111-1111-1111-111111111111','احمد','{"x":[1,2]}','\\x1234',now()),('22222222-2222-2222-2222-222222222222',NULL,NULL,NULL,NULL);
 INSERT INTO "Enrollment" VALUES(1,'11111111-1111-1111-1111-111111111111');
 DO $b$ BEGIN FOR i IN 1..1595 LOOP ALTER TABLE "Student" ADD COLUMN "_dead" integer; ALTER TABLE "Student" DROP COLUMN "_dead"; END LOOP; END $b$;'''
 sql(fixture)
 before=sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY "Id") FROM "Student" t;').stdout
 repair=(root/'scripts/maintenance/compact-student.sql').read_text()
 # Unsupported dependent must fail and leave the original table and data intact.
 sql('CREATE VIEW protected_student_view AS SELECT "Id" FROM "Student";')
 rejected=sql(repair,False);assert rejected.returncode and 'manual review required' in rejected.stderr
 assert sql('SELECT relnatts FROM pg_class WHERE oid=\'"Student"\'::regclass;').stdout.strip()=='1600'
 assert sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY "Id") FROM "Student" t;').stdout==before
 sql('DROP VIEW protected_student_view;')
 result=sql(repair);print(result.stderr.strip())
 assert sql('SELECT jsonb_agg(to_jsonb(t) ORDER BY "Id") FROM "Student" t;').stdout==before
 assert sql('SELECT relnatts FROM pg_class WHERE oid=\'"Student"\'::regclass;').stdout.strip()=='5'
 assert sql("SELECT obj_description('\"Student\"'::regclass,'pg_class');").stdout.strip()=='preserve table'
 assert sql("SELECT col_description('\"Student\"'::regclass,3);").stdout.strip()=='preserve column'
 assert sql('DELETE FROM "Student" WHERE "Id"=\'11111111-1111-1111-1111-111111111111\';',False).returncode
 assert sql('INSERT INTO "Enrollment" VALUES(2,\'33333333-3333-3333-3333-333333333333\');',False).returncode
 assert 'IX_Student_FirstName' in sql('SELECT indexname FROM pg_indexes WHERE tablename=\'Student\';').stdout
 assert sql(repair,False).returncode
 print('PASS: 1600-slot repair preserves all values, indexes, comments and incoming references; unsupported views and unnecessary reruns roll back.')
 # Exercise the actual API helper repeatedly without starting the web host.
 sql('DROP TABLE "Enrollment"; DROP TABLE "Student"; CREATE TABLE "Student" ("Id" uuid PRIMARY KEY,"AsasNumber" integer); CREATE TABLE "District" ("Id" uuid PRIMARY KEY); CREATE TABLE "Teacher" ("Id" uuid PRIMARY KEY); CREATE TABLE "Parent" ("Id" uuid PRIMARY KEY); CREATE TABLE "School" ("Id" uuid PRIMARY KEY); CREATE TABLE "Fee" ("Id" uuid PRIMARY KEY);')
 probe=tmp/'probe';probe.mkdir()
 (probe/'Probe.csproj').write_text(f'''<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup><ItemGroup><ProjectReference Include="{root.parent}/digitalmaktab-api/DigitalMaktab.Api.csproj" /></ItemGroup></Project>''')
 (probe/'Program.cs').write_text('''using DigitalMaktab.Core.Data; using Microsoft.EntityFrameworkCore; using DigitalMaktab.Api.Startup;
 using var db=new DataContext(new DbContextOptionsBuilder<DataContext>().UseNpgsql(Environment.GetEnvironmentVariable("COLUMN_TEST_DATABASE")).Options);
 ForwardHealService.Apply(db);
 var before=await db.Database.SqlQueryRaw<int>("SELECT relnatts::integer AS \\\"Value\\\" FROM pg_class WHERE oid='\\\"Student\\\"'::regclass").SingleAsync();
 for(int i=0;i<5;i++) ForwardHealService.Apply(db);
 var after=await db.Database.SqlQueryRaw<int>("SELECT relnatts::integer AS \\\"Value\\\" FROM pg_class WHERE oid='\\\"Student\\\"'::regclass").SingleAsync();
 if(before!=after)throw new Exception($"Column-slot growth: {before} -> {after}");
 Console.WriteLine($"PASS: repeated actual ForwardHealService runs retain {after} column slots.");''')
 env=os.environ.copy();env['COLUMN_TEST_DATABASE']=f'Host={sock};Port=55439;Username=repair_test;Database=repair_test;Pooling=false'
 result=subprocess.run(['dotnet','run','--project',str(probe/'Probe.csproj')],env=env,capture_output=True,text=True)
 print(result.stdout[-1800:]);
 if result.returncode:raise RuntimeError(result.stderr+result.stdout[-5000:])
finally:
 if started:subprocess.run(['pg_ctl','-D',str(pg),'-m','fast','-w','stop'],stdout=subprocess.DEVNULL,check=True)
 if not (pg/'postmaster.pid').exists():shutil.rmtree(tmp)
