import { useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { SelectProps } from "./properties/SelectProps";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";
import { useTranslation } from "react-i18next";
import { Country } from "../../models/Country";
const AppCountrySelect: React.FC<SelectProps> = ({
  value,
  onChange,
  name,
  showSelect2Lable = true,
}) => {
  const { t } = useTranslation();
  const { fetchCountries, data } = useMainOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchCountries(1, {});
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      const typeOptions = (data as Country[]).map((option) => ({
        id: option.id,
        text: option.countryPhoneCode + " " + option.countryName,
      }));
      setOptions(typeOptions);
    }
  }, [data, setOptions]);

  return (
    <div className="form-group">
      <AppSelect2
        name={name}
        data={options}
        value={value}
        onChange={onChange}
        loading={false}
        showLable={showSelect2Lable}
        label={t("controls.select2.country.label")}
      />
    </div>
  );
};
export default AppCountrySelect;
