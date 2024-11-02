import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [initialized, setInitialized] = useState(false);

  // Memoize the options to prevent unnecessary recalculations
  const options = useMemo(
    () => data.map((item: Select2Option) => ({ id: item.id, text: item.text })),
    [data]
  );
  // Use the custom hook for Select2 initialization and event handling
  useSelect2(selectRef, options, loading, loadingError, label, onChange);

  // Ensure that the value is updated when it changes
  useEffect(() => {
    if (!initialized && selectRef.current && value && data.length > 0) {
      $(selectRef.current).val(value).trigger("change");
      setInitialized(true); // Prevent further updates
    }
  }, [value, data, initialized]);

  return (
    <div className="form-group">
      {label && showLable && (
        <label className="form-label" htmlFor={name}>
          {label}
        </label>
      )}
      <select ref={selectRef} className="form-control" name={name}>
        {!loading && (
          <option value="" disabled>
            {label}
          </option>
        )}
      </select>
    </div>
  );
};

export default AppSelect2;
