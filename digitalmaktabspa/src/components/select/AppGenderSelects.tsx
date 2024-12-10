import { useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { SelectProps } from "./properties/SelectProps";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";
import { useTranslation } from "react-i18next";
const AppGenderSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useTranslation();
  const { fetchGenders, data } = useMainOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      await fetchGenders(1, 10, {});
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
        label={t("gender.label")}
      />
    </div>
  );
};
export default AppGenderSelect;
