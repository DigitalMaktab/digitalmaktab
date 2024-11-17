// searchBooks.ts
import axios from "axios";
import { OpenLibrary } from "../../models/Book";
import libClient from "./libClient";

// Function to search books
export const searchBooks = async (
  query: string,
  page: number = 1,
  limit: number = 12
): Promise<OpenLibrary | null> => {
  try {
    const response = await libClient.get("/search.json", {
      params: { q: query, page: page, limit: limit },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching books:", error);
    return null;
  }
};

export const getBookDetails = async (workId: string) => {
  const response = await libClient.get(`/works/${workId}.json`);
  return response.data;
};

export const getBook = async (key: string) => {
  const response = await libClient.get(`${key}.json`);
  return response.data;
};

export const borrow = async (key: string) => {
  const response = await axios.post(
    "https://archive.org/services/loans/loan",
    {
      action: "browse_book",
      identifier: key,
    },
    {
      headers: {
        accesskey: "pxTXXYQBJlKq8vaH",
        secret_key: "VTVVrw4xVVg7TRBU",
      },
    }
  );
  return response.data;
};

export const download = async (key: string) => {
  const response = await axios.post(
    `https://archive.org/download/${key}`,
    {
      action: "browse_book",
      identifier: key,
    },
    {
      headers: {
        accesskey: "pxTXXYQBJlKq8vaH",
        secret_key: "VTVVrw4xVVg7TRBU",
      },
    }
  );
  return response.data;
};
