import React, { useEffect, useRef } from "react";
import $ from "jquery";
import "select2/dist/js/select2";
import { Select2Props } from "../properties/InputProps";

const AppSelect2: React.FC<Select2Props> = ({
  data,
  value,
  onChange,
  label,
  name,
}) => {
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (selectRef.current) {
      const $select = $(selectRef.current);

      // Initialize Select2 for country selection
      $select.select2({
        data: data.map((item) => ({ id: item.id, text: item.text })),
      });

      // Handle change event for the Select2 component
      $select.on("change", (e: JQuery.TriggeredEvent) => {
        const selectedValue = (e.currentTarget as HTMLSelectElement).value;
        onChange(selectedValue);
      });

      // Clean up on component unmount
      return () => {
        $select.select2("destroy");
      };
    }
  }, [data, onChange]);

  useEffect(() => {
    if (selectRef.current && value) {
      $(selectRef.current).val(value).trigger("change");
    }
  }, [value]);

  return (
    <select ref={selectRef} className="form-control" name={name}>
      <option value="" disabled>
        {label}
      </option>
    </select>
  );
};

export default AppSelect2;
