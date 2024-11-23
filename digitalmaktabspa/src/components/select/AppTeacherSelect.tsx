import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import useSchoolOperations from "../../hooks/useSchoolOperations";
import { Teacher } from "../../models/Teacher";
import AppAsyncSelect from "../input/AppAsyncSelect";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
const AppTeacherSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useAppLocalizer();
  const { teacherList } = useSchoolOperations();

  // Define fetchTeachers to fetch options based on a search term
  const fetchTeachers = async (
    searchTerm: string
  ): Promise<AsyncSelectOption[]> => {
    const response = await teacherList(1, {
      searchTerm: searchTerm,
      pageNumber: 1,
    });

    // Safely check if response.data is an array before mapping
    const teachers = Array.isArray(response.data)
      ? (response.data as Teacher[])
      : [];

    return teachers.map((teacher: Teacher) => ({
      id: teacher.id,
      label: `${teacher.firstName} ${teacher.lastName}`,
    }));
  };

  // Handle selection change
  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Call the parent onChange if provided
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={fetchTeachers} // Use fetchTeachers as the loadOptions function
        onChange={handleChange}
        placeholder={t("teacher.firstName.label")}
        name={name}
        label={t("teacher.firstName.label")}
        value={value}
      />
    </div>
  );
};
export default AppTeacherSelect;
