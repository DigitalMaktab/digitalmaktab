import { useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { CountrySelectProps } from "./properties/CountrySelectProps";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";
import { useTranslation } from "react-i18next";
const AppShiftSelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  name,
}) => {
  const { t } = useTranslation();
  const { fetchShifts, data } = useMainOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchShifts(1);
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (data) {
      const typeOptions = (data as any[]).map((option) => ({
        id: option.id,
        text: option.name,
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
        label={t("controls.select2.shift.label")}
      />
    </div>
  );
};
export default AppShiftSelect;