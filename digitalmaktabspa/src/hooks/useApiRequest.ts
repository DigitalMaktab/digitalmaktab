import { useState, useCallback } from "react";

const useApiRequest = <T>(apiCall: () => Promise<{ data: T }>) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall();
      setData(response.data);
      setError(null); // Clear any previous errors
    } catch (err) {
      setError("Failed to fetch data");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]); // apiCall should remain stable across renders

  return { data, loading, error, execute };
};

export default useApiRequest;
