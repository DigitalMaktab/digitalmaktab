import { useCallback, useState } from "react";
import mainApi from "../api/main";
import { ResponseResult } from "../dtos/ResultEnum";
import useApiRequests from "./useApiRequests";

const useMainOperations = () => {
  const {
    data,
    status,
    execute: executeMainApi,
  } = useApiRequests<any[] | any>();
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
      const result = await executeMainApi(() =>
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
    [executeMainApi]
  );

  // Fetch functions for each endpoint using `fetchData`
  const fetchCountries = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.countryList, page, pageSize, filters);
  const fetchClasses = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.classList, page, pageSize, filters);
  const fetchBloodGroups = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.bloodGroupList, page, pageSize, filters);
  const fetchGenders = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.genderList, page, pageSize, filters);
  const fetchDisabilities = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.disabilityList, page, pageSize, filters);
  const fetchExamTypes = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.examTypeList, page, pageSize, filters);
  const fetchLanguages = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.languageList, page, pageSize, filters);
  const fetchClassTypes = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.classTypeList, page, pageSize, filters);
  const fetchIsOrphans = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.isOrphanList, page, pageSize, filters);
  const fetchMonths = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.monthList, page, pageSize, filters);
  const fetchDays = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.dayList, page, pageSize, filters);
  const fetchScheduleTimes = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.scheduleTimeList, page, pageSize, filters);
  const fetchShifts = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.shiftList, page, pageSize, filters);
  const fetchAddressTypes = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.addressTypeList, page, pageSize, filters);

  const fetchBooks = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.bookList, page, pageSize, filters);

  const subjectList = useCallback(
    (page: number, pageSize: number, filters: any) =>
      fetchPaginatedData(mainApi.subjectList, page, pageSize, filters),
    [fetchPaginatedData]
  );

  const fetchActiveCalendarYear = () =>
    fetchPaginatedData(mainApi.activeCalendarYear, 1, 10, {});

  const fetchSchoolTypes = (page: number, pageSize: number, filters: any) =>
    fetchPaginatedData(mainApi.schoolTypeList, page, pageSize, filters);

  return {
    data,
    status,
    totalPages,
    fetchCountries,
    fetchClasses,
    fetchBloodGroups,
    fetchGenders,
    fetchDisabilities,
    fetchExamTypes,
    fetchLanguages,
    fetchClassTypes,
    fetchIsOrphans,
    fetchMonths,
    fetchDays,
    fetchScheduleTimes,
    fetchShifts,
    fetchAddressTypes,
    fetchBooks,
    subjectList,
    fetchActiveCalendarYear,
    fetchSchoolTypes,
  };
};

export default useMainOperations;
