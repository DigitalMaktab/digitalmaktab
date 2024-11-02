import React, { useEffect, useState } from "react";
import { CountrySelectProps } from "./properties/CountrySelectProps";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../hooks/useSchoolOperations";
import { Select2Option } from "../properties/InputProps";
import AppSelect2 from "../input/AppSelect2";

const AppBranchSelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  name,
}) => {
  const { t } = useTranslation();
  const { branchList, data } = useSchoolOperations();
  const [options, setOptions] = useState<Select2Option[]>([]);

  useEffect(() => {
    const getList = async () => {
      await branchList(1, {});
    };
    getList();
  }, []);

  useEffect(() => {
    if (data) {
      const branchOptions = (data as any[]).map((branch) => ({
        id: branch.id,
        text: branch.branchName,
      }));
      setOptions(branchOptions);
    }
  }, [data, setOptions]);

  return (
    <div className="form-group">
      <AppSelect2
        name={name}
        data={options}
        value={value}
        onChange={onChange}
        loading={false}
        label={t("controls.select2.branch.label")}
      />
    </div>
  );
};

export default AppBranchSelect;
