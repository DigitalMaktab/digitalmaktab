import { useState, useCallback, useMemo } from "react";
import useApiRequests from "./useApiRequests";
import { Course } from "../models/Course";
import { ResponseResult } from "../dtos/ResultEnum";
import teacher from "../api/teacher";

const useTeacherOperations = () => {
  const {
    data,
    status,
    execute: executeTeacherApi,
  } = useApiRequests<Course[]>();

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
      const result = await executeTeacherApi(() =>
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
    [executeTeacherApi]
  );

  const courseList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(teacher.courseList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  return useMemo(
    () => ({
      data,
      status,
      totalPages,
      courseList,
    }),
    [data, status, totalPages, courseList]
  );
};

export default useTeacherOperations;
