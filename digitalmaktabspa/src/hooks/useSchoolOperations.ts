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

const useSchoolOperations = () => {
  const {
    data,
    status,
    execute: executeSchoolApi,
  } = useApiRequests<
    School | Class[] | Branch[] | Teacher[] | Student[] | SchoolDashboardData
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
      filters: any
    ) => {
      const result = await executeSchoolApi(() =>
        apiMethod({ pageNumber: page, pageSize: 10 }, filters)
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
    (page: number, filters: any) =>
      fetchPaginatedData(school.classList, page, filters),
    [fetchPaginatedData]
  );

  const branchList = useCallback(
    (page: number, filters: any) =>
      fetchPaginatedData(school.branchList, page, filters),
    [fetchPaginatedData]
  );

  const teacherList = useCallback(
    (page: number, filters: any) =>
      fetchPaginatedData(school.teacherList, page, filters),
    [fetchPaginatedData]
  );

  const studentList = useCallback(
    (page: number, filters: any) =>
      fetchPaginatedData(school.studentList, page, filters),
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
    ]
  );
};

export default useSchoolOperations;
