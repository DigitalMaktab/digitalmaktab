import { useEffect } from "react";
import useApiRequest from "./useApiRequest";
import main from "../api/main";
import { Country } from "../models/Country";

const useCountries = () => {
  // Use the reusable hook for the API request
  const {
    data: countries,
    loading,
    error,
    execute,
  } = useApiRequest<Country[]>(main.getCountries);

  useEffect(() => {
    execute(); // Fetch countries when the component mounts
  }, [execute]);

  // Map the countries to the format required by the Select2 component
  const select2Countries = countries
    ? countries.map((country) => ({
        id: country.id,
        text: country.countryName,
      }))
    : [];

  return { countries, select2Countries, loading, error };
};

export default useCountries;
