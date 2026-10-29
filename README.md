# Digital Maktab

## Description
A Digital System for all Schools in Afghanistan.

## Table of Contents
- [Digital Maktab](#digital-maktab)
  - [Description](#description)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)

## Features
- School Registry
- Students Registry
- Teachers Registry
- Classes Registry
- Subjects
- Enrollment
- Grades
- Attendance
- Library (Afghanistan MOE Books)
- Online Library


Mobile shared packages can be rebuilt and installed with
`./scripts/sync-mobile.sh` (SDK, mobile Core and country/school modules into both
Expo apps). Restart Metro afterward. Session/cache regression coverage is
`node scripts/tests/mobile-runtime.cjs`; native device testing remains separate.

The guarded actual-API process verifier reuses private PostgreSQL fixtures and
test-owned process handles:

```sh
bash scripts/tests/run-full-api-load.sh --seconds 10
bash scripts/tests/run-full-api-load.sh --classroom-recovery
```

The classroom mode also needs `redis-server` and `redis-cli`. It creates a private
Unix-socket Redis without persistence, runs the real API entry point in separate
processes, observes an actual held classroom lease, then SIGKILLs only its owned API
handle. Surviving-host cleanup, retained AT/AF main/breakout notes and generations,
uncommitted-write absence, tenant denial and restarted routing are verified. Redis
remains alive during this test; it does not establish Redis failover or durable restore.
The existing mixed workload remains a separate mode, not a classroom capacity claim.
No development server, live database or running Redis is accessed or stopped.
