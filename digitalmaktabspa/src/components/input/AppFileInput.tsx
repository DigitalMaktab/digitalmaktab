import React, { useState } from "react";
import { FileInputProps } from "../properties/InputProps";
import { useTranslation } from "react-i18next";

const AppFileInput: React.FC<FileInputProps> = ({
  name,
  label,
  required = false,
  setFieldValue = () => {},
  setFieldTouched = () => {},
  touched,
  rest,
}) => {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setFieldTouched(name, true);
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      setFieldValue(name, file);
    } else {
      setFileName("");
      setFieldValue(name, null);
    }
  };

  const handleButtonClick = () => {
    const fileInput = document.getElementById(name) as HTMLInputElement;
    fileInput?.click();
  };
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={name}>
        {label} {required && "*"}
      </label>
      <input
        className="form-control"
        id={name}
        type="file"
        name={name}
        style={{ display: "none" }}
        {...rest}
        onChange={handleFileChange}
      />
      <button
        type="button"
        style={{ textAlign: "start" }}
        className="form-control"
        onClick={handleButtonClick}
      >
        {fileName ? fileName : t("controls.fileInput.button")}
      </button>
    </div>
  );
};

export default AppFileInput;
