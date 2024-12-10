import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import { ClassSubject } from "../../models/ClassSubject";
import AppAsyncSelect from "../input/AppAsyncSelect";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import useSchoolOperations from "../../hooks/useSchoolOperations";

const AppClassSubjectSelect: React.FC<SelectProps> = ({
  value,
  onChange,
  name,
}) => {
  const { t } = useAppLocalizer();
  const { classSubjectList } = useSchoolOperations();

  // Define fetchClassSubjects to fetch options based on a search term
  const getClassSubjects = async (
    searchTerm: string
  ): Promise<AsyncSelectOption[]> => {
    const response = await classSubjectList(1, 10, { searchTerm }); // Pass correct arguments
    // Safely check if response.data is an array before mapping
    const classSubjects = Array.isArray(response.data)
      ? (response.data as ClassSubject[])
      : [];

    return classSubjects.map((classSubject: ClassSubject) => ({
      id: classSubject.id,
      label: `${classSubject.class.classNameValue} ${classSubject.class.branch.branchName} ${classSubject.subject.subjectName}`,
    }));
  };

  // Handle selection change
  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Handle null option safely
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={getClassSubjects} // Use fetchClassSubjects as the loadOptions function
        onChange={handleChange}
        placeholder={t("classSubject.label")}
        name={name}
        label={t("classSubject.label")}
        value={value}
      />
    </div>
  );
};

export default AppClassSubjectSelect;
