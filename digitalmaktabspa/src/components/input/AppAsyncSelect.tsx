import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import { AsyncSelectOption, AsyncSelectProps } from "../properties/InputProps";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { GroupBase, OptionsOrGroups, StylesConfig } from "react-select";
import { useDebouncedCallback } from "../../hooks/useDebounceCallback";

const AppAsyncSelect: React.FC<AsyncSelectProps> = ({
  loadOptions,
  placeholder,
  onChange,
  label,
  showLable = true,
  name,
}) => {
  const { t } = useAppLocalizer();
  const [options, setOptions] = useState<AsyncSelectOption[]>([]); // Store options locally

  const customStyles: StylesConfig<AsyncSelectOption, false> = {
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "#2684FF !important" // Blue for selected option
        : state.isFocused
        ? "#E0E0E0 !important" // Light gray for focused option
        : "white !important", // White for unselected and unfocused options
      color: state.isSelected ? "white" : "black",
      ":active": {
        backgroundColor: state.isSelected
          ? "#2684FF !important"
          : "#F5F5F5 !important",
      },
    }),
    control: (provided) => ({
      ...provided,
      borderColor: "#2684FF !important",
      boxShadow: "none",
      "&:hover": { borderColor: "#2684FF !important" },
    }),
  };

  const debouncedLoadOptions = useDebouncedCallback(
    (
      inputValue: string,
      callback: (
        options: OptionsOrGroups<
          AsyncSelectOption,
          GroupBase<AsyncSelectOption>
        >
      ) => void
    ) => {
      loadOptions(inputValue).then((fetchedOptions) => {
        // Filter only AsyncSelectOption items for local state
        const plainOptions = fetchedOptions.filter(
          (option): option is AsyncSelectOption => !("options" in option)
        );
        setOptions(plainOptions); // Update state with filtered options
        callback(fetchedOptions); // Pass original result to AsyncSelect
      });
    },
    500
  );

  return (
    <div className="form-group">
      {label && showLable && (
        <label className="form-label" htmlFor={name}>
          {label}
        </label>
      )}
      <AsyncSelect
        isMulti={false}
        cacheOptions
        loadOptions={debouncedLoadOptions}
        defaultOptions={options}
        placeholder={placeholder}
        noOptionsMessage={() => t("asyncSelect.noOptionsMessage.label")}
        loadingMessage={() => t("asyncSelect.loading.label")}
        onChange={onChange}
        styles={customStyles}
      />
    </div>
  );
};

export default AppAsyncSelect;
