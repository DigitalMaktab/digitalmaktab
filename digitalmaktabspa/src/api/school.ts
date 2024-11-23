import { Branch } from "../models/Branch";
import { Class } from "../models/Class";
import { Student } from "../models/Student";
import { Teacher } from "../models/Teacher";
import apiClient from "./client";
import {
  buildParams,
  FilterParams,
  PaginationParams,
} from "./properties/pagintation";

// Define types for pagination and filters for reusability

// API request functions
const registerSchool = (school: FormData) =>
  apiClient.post("/school", school, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const addBranch = (branch: Branch) =>
  apiClient.post("/school/addBranch", branch);

const addClass = (newClass: Class) =>
  apiClient.post("/school/addClass", newClass);

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

const registerStudent = (teacher: Student) =>
  apiClient.post("/school/registerStudent", teacher);

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
  registerStudent,
  addClass,
};

export default school;
