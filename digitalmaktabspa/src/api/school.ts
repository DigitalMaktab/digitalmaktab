import apiClient from "./client";

const registerSchool = (school: FormData) =>
  apiClient.post("/school", school, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const classList = () => apiClient.get("/school/classes");

const school = {
  registerSchool,
  classList,
};

export default school;
