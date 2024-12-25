import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import { Course } from "../../models/Course";
import AppAsyncSelect from "../input/AppAsyncSelect";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import useSchoolOperations from "../../hooks/useSchoolOperations";

const AppCourseSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useAppLocalizer();
  const { courseList } = useSchoolOperations();

  // Define fetchCourses to fetch options based on a search term
  const getCourses = async (
    searchTerm: string
  ): Promise<AsyncSelectOption[]> => {
    const response = await courseList(1, 10, { searchTerm }); // Pass correct arguments
    // Safely check if response.data is an array before mapping
    const courses = Array.isArray(response.data)
      ? (response.data as Course[])
      : [];

    return courses.map((course: Course) => ({
      id: course.id,
      label: `${course.class.classNameValue} ${course.class.branch.branchName} ${course.subject.subjectName}`,
    }));
  };

  // Handle selection change
  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Handle null option safely
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={getCourses} // Use fetchCourses as the loadOptions function
        onChange={handleChange}
        placeholder={t("course.label")}
        name={name}
        label={t("course.label")}
        value={value}
      />
    </div>
  );
};

export default AppCourseSelect;
