import React, { useEffect, useMemo, useRef } from "react";
import $ from "jquery";
import "select2/dist/js/select2";
import { Select2Option, Select2Props } from "../properties/InputProps";
import { useSelect2 } from "../../hooks/useSelect2";

const AppSelect2: React.FC<Select2Props> = ({
  data,
  value,
  onChange,
  label,
  name,
  showLable = true,
  loading = false,
  loadingError = false,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  // Memoize the options to prevent unnecessary recalculations
  const options = useMemo(
    () => [
      { id: "", text: label || "Select an option", disabled: true },
      ...data.map((item: Select2Option) => ({ id: item.id, text: item.text })),
    ],
    [data, label]
  );

  // Use the custom hook for Select2 initialization and event handling
  useSelect2(selectRef, options, loading, loadingError, label, onChange);

  // Update the Select2 value whenever it changes
  useEffect(() => {
    if (selectRef.current) {
      $(selectRef.current).val(value).trigger("change");
    }
  }, [value, data]);

  return (
    <div className="form-group">
      {label && showLable && (
        <label className="form-label" htmlFor={name}>
          {label}
        </label>
      )}
      <select
        ref={selectRef}
        id={name}
        className="form-control"
        name={name}
        value={value} // Set value here instead of selected on option
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          {label || "Select an option"}
        </option>
        {data.map((option) => (
          <option key={option.id} value={option.id}>
            {option.text}
          </option>
        ))}
      </select>
    </div>
  );
};

export default AppSelect2;
