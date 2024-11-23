import apiClient from "./client";

const addBook = (book: FormData) =>
  apiClient.post("/root/addBook", book, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

const root = {
  addBook,
};

export default root;
