import { useCallback, useMemo } from "react";
import school from "../api/school";
import useApiRequests from "./useApiRequests";
import { School } from "../models/School";
import { Class } from "../models/Class";

const useSchoolOperations = () => {
  const {
    data,
    status,
    execute: executeSchoolApi,
  } = useApiRequests<School | Class[]>();

  // Register a school
  const registerSchool = useCallback(
    (schoolDetails: FormData) => {
      return executeSchoolApi(() => school.registerSchool(schoolDetails));
    },
    [executeSchoolApi]
  );

  const classList = useCallback(() => {
    return executeSchoolApi<Class[]>(() => school.classList());
  }, [executeSchoolApi]);

  // Get school details
  //   const getSchool = useCallback(
  //     (schoolId: number) => {
  //       executeSchoolApi(() => school.getSchool(schoolId));
  //     },
  //     [executeSchoolApi]
  //   );

  return useMemo(
    () => ({
      data,
      status,
      registerSchool,
      classList,
    }),
    [data, status, registerSchool, classList]
  );
};

export default useSchoolOperations;
