import { useCallback, useMemo, useState } from "react";
import { Book } from "../models/Book";
import useApiRequests from "./useApiRequests";
import { ResponseResult } from "../dtos/ResultEnum";
import root from "../api/root";

const useRootOperations = () => {
  const { data, status, execute: executeRootApi } = useApiRequests<Book[]>();

  const [totalPages, setTotalPages] = useState(1);

  const fetchPaginatedData = useCallback(
    async <T>(
      apiMethod: (
        pagination: { pageNumber: number; pageSize: number },
        filters: any
      ) => Promise<{ data: T; headers: Record<string, any> }>,
      page: number,
      filters: any
    ) => {
      const result = await executeRootApi(() =>
        apiMethod({ pageNumber: page, pageSize: 10 }, filters)
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
    [executeRootApi]
  );

  const addBook = useCallback(
    (book: FormData) => executeRootApi(() => root.addBook(book)),
    [executeRootApi]
  );

  return useMemo(
    () => ({
      data,
      status,
      totalPages,
      addBook,
    }),
    [data, status, totalPages, addBook]
  );
};

export default useRootOperations;
