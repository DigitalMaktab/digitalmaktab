import { useCallback, useMemo, useState } from "react";
import { Book } from "../models/Book";
import useApiRequests from "./useApiRequests";
import { ResponseResult } from "../dtos/ResultEnum";
import root from "../api/root";
import { CalendarYear } from "../models/CalendarYear";
import { Subject } from "../models/Subject";

const useRootOperations = () => {
  const {
    data,
    status,
    execute: executeRootApi,
  } = useApiRequests<Book[] | CalendarYear[] | Subject[]>();

  const [totalPages, setTotalPages] = useState(1);

  const fetchPaginatedData = useCallback(
    async <T>(
      apiMethod: (
        pagination: { pageNumber: number; pageSize: number },
        filters: any
      ) => Promise<{ data: T; headers: Record<string, any> }>,
      page: number,
      pageSize: number,
      filters: any
    ) => {
      const result = await executeRootApi(() =>
        apiMethod({ pageNumber: page, pageSize }, filters)
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

  const addCalendarYear = useCallback(
    (calendarYear: CalendarYear) =>
      executeRootApi(() => root.addCalendarYear(calendarYear)),
    [executeRootApi]
  );

  const calendarYearList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(root.calendarYearList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const addSubject = useCallback(
    (subject: Subject) => executeRootApi(() => root.addSubject(subject)),
    [executeRootApi]
  );

  const deleteSubject = useCallback(
    (id: string) => executeRootApi(() => root.deleteSubject(id)),
    [executeRootApi]
  );

  return useMemo(
    () => ({
      data,
      status,
      totalPages,
      addBook,
      addCalendarYear,
      calendarYearList,
      addSubject,
      deleteSubject,
    }),
    [
      data,
      status,
      totalPages,
      addBook,
      addCalendarYear,
      calendarYearList,
      addSubject,
      deleteSubject,
    ]
  );
};

export default useRootOperations;
