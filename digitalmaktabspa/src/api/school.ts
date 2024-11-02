import apiClient from "./client";

const registerSchool = (school: FormData) =>
  apiClient.post("/school", school, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const classList = (
  paginationParams?: { pageNumber: number; pageSize: number },
  filters?: { [key: string]: any }
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams || {};

  // Merge paginationParams with filters
  const params = { pageNumber, pageSize, ...filters };

  return apiClient.get(`/school/classes`, { params });
};

const branchList = (
  paginationParams?: { pageNumber: number; pageSize: number },
  filters?: { [key: string]: any }
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams || {};

  // Merge paginationParams with filters
  const params = { pageNumber, pageSize, ...filters };

  return apiClient.get(`/school/branches`, { params });
};

const teacherList = (
  paginationParams?: { pageNumber: number; pageSize: number },
  filters?: { [key: string]: any }
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams || {};

  // Merge paginationParams with filters
  const params = { pageNumber, pageSize, ...filters };

  return apiClient.get(`/school/teachers`, { params });
};

const studentList = (
  paginationParams?: { pageNumber: number; pageSize: number },
  filters?: { [key: string]: any }
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams || {};

  // Merge paginationParams with filters
  const params = { pageNumber, pageSize, ...filters };

  return apiClient.get(`/school/students`, { params });
};

const school = {
  registerSchool,
  classList,
  branchList,
  teacherList,
  studentList,
};

export default school;
