import apiClient from "./client";
import {
  buildParams,
  FilterParams,
  PaginationParams,
} from "./properties/pagintation";

const courseList = (
  paginationParams?: PaginationParams,
  filters?: FilterParams
) => {
  const params = buildParams(paginationParams, filters);
  return apiClient.get("/teacher/courses", { params });
};
const teacher = {
  courseList,
};

export default teacher;
