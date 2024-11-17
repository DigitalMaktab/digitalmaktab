import { Branch } from "../models/Branch";
import { Teacher } from "../models/Teacher";
import apiClient from "./client";

// Define types for pagination and filters for reusability
interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

interface FilterParams {
  [key: string]: any;
}

// Helper function to merge pagination and filter parameters
const buildParams = (
  paginationParams: PaginationParams = {},
  filters: FilterParams = {}
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams;
  return { pageNumber, pageSize, ...filters };
};

// API request functions
const registerSchool = (school: FormData) =>
  apiClient.post("/school", school, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const addBranch = (branch: Branch) =>
  apiClient.post("/school/addBranch", branch);

const classList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/school/classes", { params });
};

const branchList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/school/branches", { params });
};

const teacherList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/school/teachers", { params });
};

const studentList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/school/students", { params });
};

const dashboardData = () => {
  return apiClient.get("/school/dashboard");
};

const scheduleList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/school/schedules", { params });
};

const registerTeacher = (teacher: Teacher) =>
  apiClient.post("/school/registerTeacher", teacher);

// Export all school-related API functions in a single object
const school = {
  registerSchool,
  classList,
  branchList,
  teacherList,
  studentList,
  dashboardData,
  addBranch,
  scheduleList,
  registerTeacher,
};

export default school;
