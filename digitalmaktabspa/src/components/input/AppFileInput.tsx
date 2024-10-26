import React, { useState } from "react";
import { FileInputProps } from "../properties/InputProps";
import { useTranslation } from "react-i18next";

const AppFileInput: React.FC<FileInputProps> = ({
  name,
  label,
  setFieldValue = () => {},
  rest,
}) => {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFileName(file.name);
      setFieldValue(name, file);
    } else {
      setFileName("");
    }
  };

  const handleButtonClick = () => {
    const fileInput = document.getElementById(name) as HTMLInputElement;
    fileInput?.click();
  };
  return (
    <div className="form-group">
      <label className="col-form-label" htmlFor={name}>
        {label}
      </label>
      <div>
        <button
          type="button"
          style={{ textAlign: "start" }}
          className="form-control"
          onClick={handleButtonClick}
        >
          {fileName ? fileName : t("controls.fileInput.button")}
        </button>
        <input
          className="form-control"
          id={name}
          type="file"
          name={name}
          style={{ display: "none" }}
          {...rest}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default AppFileInput;
