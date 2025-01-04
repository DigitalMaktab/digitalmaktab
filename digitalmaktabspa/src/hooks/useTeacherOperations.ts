import { useState, useCallback, useMemo } from "react";
import useApiRequests from "./useApiRequests";
import { Course } from "../models/Course";
import { ResponseResult } from "../dtos/ResultEnum";
import teacher from "../api/teacher";
import { ScheduleData } from "../models/ScheduleData";
import { CourseSection } from "../models/CourseSection";
import { LearningMaterial } from "../models/LearningMaterial";

const useTeacherOperations = () => {
  const {
    data,
    status,
    execute: executeTeacherApi,
  } = useApiRequests<
    Course[] | ScheduleData[] | CourseSection[] | LearningMaterial[]
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

  const timeTableList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(teacher.timeTableList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const addCourseSection = useCallback(
    (courseSection: FormData) =>
      executeTeacherApi(() => teacher.addCourseSection(courseSection)),
    [executeTeacherApi]
  );

  const courseSectionList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(teacher.courseSectionList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  return useMemo(
    () => ({
      data,
      status,
      totalPages,
      courseList,
      timeTableList,
      addCourseSection,
      courseSectionList,
    }),
    [
      data,
      status,
      totalPages,
      courseList,
      timeTableList,
      addCourseSection,
      courseSectionList,
    ]
  );
};

export default useTeacherOperations;
