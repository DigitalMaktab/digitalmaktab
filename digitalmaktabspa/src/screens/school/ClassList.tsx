import React, { useEffect } from "react";
import useSchoolOperations from "../../hooks/useSchoolOperations";
import AppCard from "../../components/card/AppCard";
import { useTranslation } from "react-i18next";
import { Teacher } from "../../models/Teacher";
import AppTable from "../../components/table/AppTable";
import { Class } from "../../models/Class";
import { Column } from "../../components/table/properties/TableProps";

const ClassList = () => {
  const { t } = useTranslation();
  const { classList, data } = useSchoolOperations();

  const columns: Column<Class>[] = [
    { header: "classList.className", accessor: "className" },
    { header: "classList.classType", accessor: "classType" },
    { header: "shift.label", accessor: "shift" },
    {
      header: "teacher.teacherName",
      accessor: "teacher",
      render: (teacher: Teacher) => teacher?.teacherName || "",
    },
  ];

  useEffect(() => {
    classList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppCard title={t("classList.title")}>
      {data && <AppTable data={data as Class[]} columns={columns} />}
    </AppCard>
  );
};

export default ClassList;
