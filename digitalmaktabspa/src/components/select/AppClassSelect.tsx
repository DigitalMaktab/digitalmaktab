import { useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { CountrySelectProps } from "./properties/CountrySelectProps";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";
import { useTranslation } from "react-i18next";

const AppClassSelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  name,
}) => {
  const { t } = useTranslation();
  const { fetchClasses, data } = useMainOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    fetchClasses(1, {});
  }, [fetchClasses]);

  useEffect(() => {
    setOptions(
      data.map((classType) => ({ id: classType.id, text: classType.className }))
    );
  }, [data]);

  return (
    <AppSelect2
      name={name}
      data={options}
      value={value}
      onChange={onChange}
      label={t("controls.select2.class.label")}
    />
  );
};
export default AppClassSelect;