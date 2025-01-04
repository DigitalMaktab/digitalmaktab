import { CourseSection } from "../models/CourseSection";
import apiClient from "./client";
import {
  buildParams,
  FilterParams,
  PaginationParams,
} from "./properties/pagintation";

const teacherEndpoint = "/teacher";

const courseList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get(`${teacherEndpoint}/courses`, { params });
};

const timeTableList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get(`${teacherEndpoint}/schedules`, { params });
};

const addCourseSection = (courseSection: FormData) =>
  apiClient.post(`${teacherEndpoint}/addCourseSection`, courseSection, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const courseSectionList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get(`${teacherEndpoint}/courseSections`, { params });
};

const teacher = {
  courseList,
  timeTableList,
  addCourseSection,
  courseSectionList,
};

export default teacher;
