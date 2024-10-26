import apiClient from "./client";

const registerSchool = (school: FormData) =>
  apiClient.post("/school", school, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const school = {
  registerSchool,
};

export default school;
