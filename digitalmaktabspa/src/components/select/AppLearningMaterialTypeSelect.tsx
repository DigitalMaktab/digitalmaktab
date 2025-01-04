import { useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { SelectProps } from "./properties/SelectProps";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";
import { useTranslation } from "react-i18next";
const AppLearningMaterialTypeSelect: React.FC<SelectProps> = ({
  value,
  onChange,
  name,
  required = false,
}) => {
  const { t } = useTranslation();
  const { learningMaterialTypeList, data } = useMainOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      await learningMaterialTypeList(1, 50, {});
    };
    fetchData();
  }, [t]);

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
        required={required}
        onChange={onChange}
        loading={false}
        label={t("learningMaterialType.label")}
      />
    </div>
  );
};
export default AppLearningMaterialTypeSelect;
