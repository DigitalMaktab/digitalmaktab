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
