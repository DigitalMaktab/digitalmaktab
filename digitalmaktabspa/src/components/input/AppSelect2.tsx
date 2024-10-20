import React, { useEffect, useMemo, useRef } from "react";
import $ from "jquery";
import "select2/dist/js/select2";
import { Select2Props } from "../properties/InputProps";
import { useSelect2 } from "../../hooks/useSelect2";

const AppSelect2: React.FC<Select2Props> = ({
  data,
  value,
  onChange,
  label,
  name,
  loading = false,
  loadingError = false,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  // Memoize the options to prevent unnecessary recalculations
  const options = useMemo(
    () => data.map((item) => ({ id: item.id, text: item.text })),
    [data]
  );
  // Use the custom hook for Select2 initialization and event handling
  useSelect2(selectRef, options, loading, loadingError, label, onChange);

  // Ensure that the value is updated when it changes
  useEffect(() => {
    if (selectRef.current && value) {
      $(selectRef.current).val(value).trigger("change");
    }
  }, [value]);

  return (
    <select ref={selectRef} className="form-control" name={name}>
      {!loading && (
        <option value="" disabled>
          {label}
        </option>
      )}
    </select>
  );
};

export default AppSelect2;
