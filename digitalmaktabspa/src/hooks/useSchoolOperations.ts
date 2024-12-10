import { useCallback, useMemo, useState } from "react";
import school from "../api/school";
import useApiRequests from "./useApiRequests";
import { School } from "../models/School";
import { Class } from "../models/Class";
import { ResponseResult } from "../dtos/ResultEnum";
import { Branch } from "../models/Branch";
import { Teacher } from "../models/Teacher";
import { Student } from "../models/Student";
import { SchoolDashboardData } from "../models/schoolDashboard/SchoolDashboardData";
import { ScheduleData } from "../models/ScheduleData";
import { ClassSubject } from "../models/ClassSubject";
import { Schedule } from "../models/Schedule";

const useSchoolOperations = () => {
  const {
    data,
    status,
    execute: executeSchoolApi,
  } = useApiRequests<
    | School
    | Class[]
    | Branch[]
    | Teacher[]
    | Student[]
    | SchoolDashboardData
    | ScheduleData[]
    | ClassSubject[]
  >();

  const [totalPages, setTotalPages] = useState(1);

  // Helper function for paginated requests
  const fetchPaginatedData = useCallback(
    async <T>(
      apiMethod: (
        pagination: { pageNumber: number; pageSize: number },
        filters: any
      ) => Promise<{ data: T; headers: Record<string, any> }>,
      page: number,
      pageSize: number,
      filters: any
    ) => {
      const result = await executeSchoolApi(() =>
        apiMethod({ pageNumber: page, pageSize }, filters)
      );

      if (
        result.status === ResponseResult.SUCCESS &&
        result.headers?.pagination
      ) {
        const pagination = JSON.parse(result.headers.pagination);
        setTotalPages(pagination.totalPages);
      }
      return result;
    },
    [executeSchoolApi]
  );

  const registerSchool = useCallback(
    (schoolDetails: FormData) =>
      executeSchoolApi(() => school.registerSchool(schoolDetails)),
    [executeSchoolApi]
  );

  const classList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.classList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const branchList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.branchList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const teacherList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.teacherList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const studentList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.studentList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const dashboardData = useCallback(
    () => executeSchoolApi<SchoolDashboardData>(() => school.dashboardData()),
    [executeSchoolApi]
  );

  const addBranch = useCallback(
    (branch: Branch) => executeSchoolApi(() => school.addBranch(branch)),
    [executeSchoolApi]
  );

  const scheduleList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.scheduleList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const registerTeacher = useCallback(
    (teacher: Teacher) =>
      executeSchoolApi(() => school.registerTeacher(teacher)),
    [executeSchoolApi]
  );

  const registerStudent = useCallback(
    (student: Student) =>
      executeSchoolApi(() => school.registerStudent(student)),
    [executeSchoolApi]
  );

  const addClass = useCallback(
    (classData: Class) => executeSchoolApi(() => school.addClass(classData)),
    [executeSchoolApi]
  );

  const deleteTeacher = useCallback(
    (id: string) => executeSchoolApi(() => school.deleteTeacher(id)),
    [executeSchoolApi]
  );

  const addClassSubject = useCallback(
    (branch: ClassSubject) =>
      executeSchoolApi(() => school.addClassSubject(branch)),
    [executeSchoolApi]
  );

  const classSubjectList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(school.classSubjectList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const addSchedule = useCallback(
    (schedule: Schedule) =>
      executeSchoolApi(() => school.addSchedule(schedule)),
    [executeSchoolApi]
  );

  return useMemo(
    () => ({
      data,
      status,
      totalPages,
      registerSchool,
      classList,
      branchList,
      teacherList,
      studentList,
      dashboardData,
      addBranch,
      scheduleList,
      registerTeacher,
      registerStudent,
      addClass,
      deleteTeacher,
      addClassSubject,
      classSubjectList,
      addSchedule,
    }),
    [
      data,
      status,
      totalPages,
      registerSchool,
      classList,
      branchList,
      teacherList,
      studentList,
      dashboardData,
      addBranch,
      scheduleList,
      registerTeacher,
      registerStudent,
      addClass,
      deleteTeacher,
      addClassSubject,
      classSubjectList,
      addSchedule,
    ]
  );
};

export default useSchoolOperations;
