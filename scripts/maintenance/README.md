# Student column-slot repair

PostgreSQL counts dropped columns toward its 1,600-column limit:
[PostgreSQL limits](https://www.postgresql.org/docs/16/limits.html).
An old API startup repair added three Ministry fields to Core `Student` and then
dropped them on every start. Those fields already belong to
`AfghanStudentDetails`. The API helper now avoids that cycle.

`compact-student.sql` is explicit maintenance for an affected local installation,
not an automatic startup migration. It keeps one authoritative `Student` table;
its temporary replacement exists only inside the transaction. Do not bypass the
column limit, put revisions into a duplicate entity, edit PostgreSQL catalogs or
discard student data.

Before applying it, stop the API and other writers, take a full custom-format
`pg_dump` backup, verify the archive is readable with `pg_restore --list`, and
retain it outside the repository with private permissions. Run against the
intended database using `psql -X -v ON_ERROR_STOP=1 -f
scripts/maintenance/compact-student.sql` with connection credentials supplied
through the normal PostgreSQL environment or password file. Do not put passwords
in command arguments or commits.

The script takes Core's existing startup advisory lock and exclusive locks on
Student and referencing tables. It compares every copied row value before
replacing the table and reconstructs the existing keys, indexes and foreign keys.
Locks time out after five seconds; statements after 60 seconds. Errors roll back
the transaction. It deliberately refuses unsupported ownership, grants, views,
triggers, replication, partitioning and other metadata instead of silently losing
it. `DROP TABLE` uses `RESTRICT`, never `CASCADE`. No existing app record or field
is removed by the repair. Historical dropped slots are reclaimed; the table's
physical OID changes. Test integrations that retain physical table OIDs separately.

Validation:

```sh
python3 scripts/tests/test-student-column-repair.py
```

The socket-only private PostgreSQL test reproduces 1,600 slots, preserves Unicode,
JSON, bytes, nulls, timestamps, comments, indexes and referencing records; checks
foreign-key enforcement; rejects a dependent view and an unnecessary rerun; and
calls the actual API `ForwardHealService` six times to verify no further slot
growth. It needs local PostgreSQL tools and the .NET SDK. It creates and removes
only its own verified-stopped test cluster.

Local repair evidence, 2026-10-24: full backup archived outside the repository;
516 students preserved byte-for-byte at the JSON row representation, with the
same incoming/outgoing constraint definitions, validation flags and index
definitions. Physical slots reduced from 1,600 (43 live, 1,557 dropped) to 43.
Pending migrations can now add their intended columns normally.
