import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import useSchoolOperations from "../../hooks/useSchoolOperations";
import { Class } from "../../models/Class";
import AppAsyncSelect from "../input/AppAsyncSelect";

const AppClassSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useAppLocalizer();
  const { classList } = useSchoolOperations();

  const fetchClassList = async (
    searchTerm: string
  ): Promise<AsyncSelectOption[]> => {
    const response = await classList(1, 10, { searchTerm });

    // Safely check if response.data is an array before mapping
    const teachers = Array.isArray(response.data)
      ? (response.data as Class[])
      : [];

    return teachers.map((classObj: Class) => ({
      id: classObj.id,
      label: `${classObj.classNameValue} ${classObj.branch.branchName}`,
    }));
  };

  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Call the parent onChange if provided
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={fetchClassList}
        onChange={handleChange}
        placeholder={t("class.className.label")}
        name={name}
        label={t("class.className.label")}
        value={value}
      />
    </div>
  );
};
export default AppClassSelect;
