import { useCallback, useState } from "react";
import mainApi from "../api/main";
import { ResponseResult } from "../dtos/ResultEnum";
import useApiRequests from "./useApiRequests";

const useMainOperations = () => {
  const { data, status, execute: executeMainApi } = useApiRequests<any[]>();
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = useCallback(
    async (fetchFunc: Function, page: number, filters: any = {}) => {
      const result = await executeMainApi(() =>
        fetchFunc({ pageNumber: page, pageSize: 100, ...filters })
      );

      if (result.status === ResponseResult.SUCCESS) {
        setTotalPages(
          result.headers?.pagination
            ? JSON.parse(result.headers.pagination).totalPages
            : 1
        );
      }
    },
    [executeMainApi]
  );

  // Fetch functions for each endpoint using `fetchData`
  const fetchCountries = (page: number, filters: any) =>
    fetchData(mainApi.countryList, page, filters);
  const fetchClasses = (page: number, filters: any) =>
    fetchData(mainApi.classList, page, filters);
  const fetchBloodGroups = (page: number) =>
    fetchData(mainApi.bloodGroupList, page);
  const fetchGenders = (page: number) => fetchData(mainApi.genderList, page);
  const fetchDisabilities = (page: number) =>
    fetchData(mainApi.disabilityList, page);
  const fetchExamTypes = (page: number) =>
    fetchData(mainApi.examTypeList, page);
  const fetchLanguages = (page: number) =>
    fetchData(mainApi.languageList, page);
  const fetchClassTypes = (page: number) =>
    fetchData(mainApi.classTypeList, page);
  const fetchIsOrphans = (page: number) =>
    fetchData(mainApi.isOrphanList, page);
  const fetchMonths = (page: number) => fetchData(mainApi.monthList, page);
  const fetchDays = (page: number) => fetchData(mainApi.dayList, page);
  const fetchScheduleTimes = (page: number) =>
    fetchData(mainApi.scheduleTimeList, page);
  const fetchShifts = (page: number) => fetchData(mainApi.shiftList, page);
  const fetchAddressTypes = (page: number) =>
    fetchData(mainApi.addressTypeList, page);

  const fetchBooks = (page: number, filters: any) =>
    fetchData(mainApi.bookList, page, filters);

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
  };
};

export default useMainOperations;
