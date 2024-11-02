import { useCallback, useMemo, useState } from "react";
import school from "../api/school";
import useApiRequests from "./useApiRequests";
import { School } from "../models/School";
import { Class } from "../models/Class";
import { ResponseResult } from "../dtos/ResultEnum";
import { Branch } from "../models/Branch";
import { Teacher } from "../models/Teacher";
import { Student } from "../models/Student";

const useSchoolOperations = () => {
  const {
    data,
    status,
    execute: executeSchoolApi,
  } = useApiRequests<School | Class[] | Branch[] | Teacher[] | Student[]>();

  const [totalPages, setTotalPages] = useState(1);

  // Register a school
  const registerSchool = useCallback(
    (schoolDetails: FormData) => {
      return executeSchoolApi(() => school.registerSchool(schoolDetails));
    },
    [executeSchoolApi]
  );

  // const classList = useCallback(() => {
  //   return executeSchoolApi<Class[]>(() => school.classList());
  // }, [executeSchoolApi]);

  const classList = useCallback(
    async (page: number, filters: any) => {
      const result = await executeSchoolApi<Class[]>(() =>
        school.classList({ pageNumber: page, pageSize: 10 }, filters)
      );

      if (
        result.status === ResponseResult.SUCCESS &&
        result.headers?.pagination
      ) {
        const pagination = JSON.parse(result.headers.pagination);
        setTotalPages(pagination.totalPages);
      }
    },
    [executeSchoolApi]
  );

  const branchList = useCallback(
    async (page: number, filters: any) => {
      const result = await executeSchoolApi<Branch[]>(() =>
        school.branchList({ pageNumber: page, pageSize: 10 }, filters)
      );

      if (
        result.status === ResponseResult.SUCCESS &&
        result.headers?.pagination
      ) {
        const pagination = JSON.parse(result.headers.pagination);
        setTotalPages(pagination.totalPages);
      }
    },
    [executeSchoolApi]
  );

  const teacherList = useCallback(
    async (page: number, filters: any) => {
      const result = await executeSchoolApi<Teacher[]>(() =>
        school.teacherList({ pageNumber: page, pageSize: 10 }, filters)
      );

      if (
        result.status === ResponseResult.SUCCESS &&
        result.headers?.pagination
      ) {
        const pagination = JSON.parse(result.headers.pagination);
        setTotalPages(pagination.totalPages);
      }
    },
    [executeSchoolApi]
  );

  const studentList = useCallback(
    async (page: number, filters: any) => {
      const result = await executeSchoolApi<Student[]>(() =>
        school.studentList({ pageNumber: page, pageSize: 10 }, filters)
      );

      if (
        result.status === ResponseResult.SUCCESS &&
        result.headers?.pagination
      ) {
        const pagination = JSON.parse(result.headers.pagination);
        setTotalPages(pagination.totalPages);
      }
    },
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
    ]
  );
};

export default useSchoolOperations;
