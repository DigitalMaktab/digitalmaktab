import { useCallback } from "react";
import school from "../api/school";
import useApiRequests from "./useApiRequests";
import { School } from "../models/School";

const useSchoolOperations = () => {
  const { data, status, execute: executeSchoolApi } = useApiRequests<School>();

  // Register a school
  const registerSchool = useCallback(
    (schoolDetails: FormData) => {
      return executeSchoolApi(() => school.registerSchool(schoolDetails));
    },
    [executeSchoolApi]
  );

  // Get school details
  //   const getSchool = useCallback(
  //     (schoolId: number) => {
  //       executeSchoolApi(() => school.getSchool(schoolId));
  //     },
  //     [executeSchoolApi]
  //   );

  return {
    data,
    status,
    registerSchool,

    // getSchool,
  };
};

export default useSchoolOperations;
