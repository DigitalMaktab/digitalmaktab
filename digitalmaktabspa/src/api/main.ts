import apiClient from "./client";

const countryList = (
  paginationParams: { pageNumber: number; pageSize: number },
  filters: any
) =>
  apiClient.get(`/main/countries`, {
    params: { ...paginationParams, ...filters },
  });

const classList = (
  paginationParams: { pageNumber: number; pageSize: number },
  filters: any
) =>
  apiClient.get(`/main/classNames`, {
    params: { ...paginationParams, ...filters },
  });

const bloodGroupList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/bloodGroups`, { params: paginationParams });

const genderList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/genders`, { params: paginationParams });

const disabilityList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/disabilities`, { params: paginationParams });

const examTypeList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/examTypes`, { params: paginationParams });

const languageList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/languages`, { params: paginationParams });

const classTypeList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/classTypes`, { params: paginationParams });

const isOrphanList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/isOrphans`, { params: paginationParams });

const monthList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/months`, { params: paginationParams });

const dayList = (paginationParams: { pageNumber: number; pageSize: number }) =>
  apiClient.get(`/main/days`, { params: paginationParams });

const scheduleTimeList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/scheduleTimes`, { params: paginationParams });

const shiftList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/shifts`, { params: paginationParams });

const addressTypeList = (paginationParams: {
  pageNumber: number;
  pageSize: number;
}) => apiClient.get(`/main/addressTypes`, { params: paginationParams });

const mainApi = {
  countryList,
  classList,
  bloodGroupList,
  genderList,
  disabilityList,
  examTypeList,
  languageList,
  classTypeList,
  isOrphanList,
  monthList,
  dayList,
  scheduleTimeList,
  shiftList,
  addressTypeList,
};

export default mainApi;
