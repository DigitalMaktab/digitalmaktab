import { useState, useCallback } from "react";
import { useLoader } from "../contexts/LoaderContext";
import { ResponseResult } from "../dtos/ResultEnum";
import { useTranslation } from "react-i18next";

const useApiRequests = <T>() => {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResponseResult>(ResponseResult.IDLE);
  const { showLoader, hideLoader, setError } = useLoader();
  const { t } = useTranslation();

  const execute = useCallback(
    async <R>(
      apiCall: () => Promise<{ data: R; headers: Record<string, any> }>
    ): Promise<{
      status: ResponseResult;
      data?: R;
      headers?: Record<string, any>;
      errors?: string[];
    }> => {
      if (status === ResponseResult.LOADING) {
        return {
          status: ResponseResult.LOADING,
          errors: [t("apiResponse.requestSent")],
        };
      }
      setStatus(ResponseResult.LOADING);
      showLoader();
      setError(null);

      try {
        const response = await apiCall();
        setData(response.data as unknown as T);
        setStatus(ResponseResult.SUCCESS);
        hideLoader();
        return {
          status: ResponseResult.SUCCESS,
          data: response.data,
          headers: response.headers,
        };
      } catch (err: unknown) {
        setStatus(ResponseResult.ERROR);
        hideLoader();
        let errorMessages: string[] = [];

        if (typeof err === "object" && err !== null && "response" in err) {
          const axiosError = err as {
            response: {
              status: number;
              data: { errors?: Record<string, string[]> } | string;
            };
          };
          const { status: errorStatus, data: responseData } =
            axiosError.response;

          if (errorStatus === 401) {
            errorMessages = [t("auth.login.unauthorized")];
          } else if (typeof responseData === "string") {
            if (responseData.includes("foreign key constraint fails")) {
              errorMessages = [t("apiResponse.foreignKeyError")];
            } else {
              errorMessages = [responseData];
            }
          } else if (responseData.errors) {
            errorMessages = Object.entries(responseData.errors).flatMap(
              ([field, messages]) => messages.map((msg) => `${field}: ${msg}`)
            );
          } else {
            errorMessages = [t("apiResponse.unknownError")];
          }
        } else {
          errorMessages = [t("apiResponse.error")];
        }

        setError(errorMessages);
        return { status: ResponseResult.ERROR, errors: errorMessages };
      }
    },
    [status, showLoader, setError, hideLoader, t]
  );

  return { data, status, execute };
};

export default useApiRequests;
