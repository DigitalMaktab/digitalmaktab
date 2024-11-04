import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Class } from "../../../models/Class";
import { Branch } from "../../../models/Branch";
import { Teacher } from "../../../models/Teacher";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { Enrollment } from "../../../models/Enrollment";

const ClassList = () => {
  const { t } = useTranslation();
  const { classList, data, totalPages } = useSchoolOperations();
  const [currentPage, setCurrentPage] = useState(1);

  const columns: Column<Class>[] = useMemo(
    () => [
      {
        header: "class.className.label",
        accessor: "classNameValue",
      },
      {
        header: "branch.branchName.label",
        accessor: "branch",
        filter: { type: "dropdown" },
        render: (branch: Branch) => branch?.branchName || "",
      },
      {
        header: "class.classType.label",
        accessor: "classTypeValue",
        filter: { type: "dropdown" },
      },
      {
        header: "shift.label",
        accessor: "shiftValue",
        filter: { type: "dropdown" },
      },
      {
        header: "teacher.teacherName",
        accessor: "teacher",
        render: (teacher: Teacher) =>
          teacher?.firstName + " " + teacher?.lastName || "",
      },
      {
        header: "enrollment.enrolled.label",
        accessor: "enrollments",
        render: (enrollments: Enrollment[]) => enrollments.length,
      },
    ],
    []
  );

  const fetchPageData = useCallback((page: number, filters = {}) => {
    setCurrentPage(page);
    classList(page, filters);
  }, []);

  useEffect(() => {
    fetchPageData(currentPage, {});
  }, [currentPage, fetchPageData]);

  return (
    <AppCard title={t("class.classList.label")}>
      {data && (
        <AppTable
          rowLink="/class-editor/{id}"
          data={data as Class[]}
          columns={columns}
          totalPages={totalPages}
          fetchPageData={fetchPageData}
          actions={[
            {
              label: t("class.addClass.label"),
              route: "/class-editor/new",
              icon: "plus",
            },
          ]}
        />
      )}
    </AppCard>
  );
};

export default ClassList;
