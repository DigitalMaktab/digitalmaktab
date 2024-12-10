import React from "react";
import { SelectProps } from "./properties/SelectProps";
import { AsyncSelectOption } from "../properties/InputProps";
import { Subject } from "../../models/Subject";
import AppAsyncSelect from "../input/AppAsyncSelect";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import useMainOperations from "../../hooks/useMainOperations";

const AppSubjectSelect: React.FC<SelectProps> = ({ value, onChange, name }) => {
  const { t } = useAppLocalizer();
  const { subjectList } = useMainOperations();

  // Define fetchSubjects to fetch options based on a search term
  const getSubjects = async (
    searchTerm: string
  ): Promise<AsyncSelectOption[]> => {
    const response = await subjectList(1, 10, { searchTerm }); // Pass correct arguments
    // Safely check if response.data is an array before mapping
    const subjects = Array.isArray(response.data)
      ? (response.data as Subject[])
      : [];

    return subjects.map((subject: Subject) => ({
      id: subject.id,
      label: `${subject.subjectName}`,
    }));
  };

  // Handle selection change
  const handleChange = (option: AsyncSelectOption | null) => {
    onChange && onChange(option!.id); // Handle null option safely
  };

  return (
    <div className="form-group">
      <AppAsyncSelect
        loadOptions={getSubjects} // Use fetchSubjects as the loadOptions function
        onChange={handleChange}
        placeholder={t("subject.subjectName.label")}
        name={name}
        label={t("subject.subjectName.label")}
        value={value}
      />
    </div>
  );
};

export default AppSubjectSelect;
