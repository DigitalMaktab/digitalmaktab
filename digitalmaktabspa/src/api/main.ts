import apiClient from "./client";

const getCountries = () => apiClient.get("/main/countries");

const main = {
  getCountries,
};

export default main;
