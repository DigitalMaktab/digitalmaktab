import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Teacher } from "../../../models/Teacher";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";

const TeacherList = () => {
  const { t } = useTranslation();
  const { teacherList, data } = useSchoolOperations();
  const [currentPage, setCurrentPage] = useState(1);

  const columns: Column<Teacher>[] = useMemo(
    () => [
      {
        header: "teacher.firstName.label",
        accessor: "firstName",
      },
      {
        header: "teacher.lastName.label",
        accessor: "lastName",
      },
      {
        header: "gender.label",
        accessor: "genderValue",
      },
    ],
    []
  );

  const fetchPageData = useCallback((page: number, filters = {}) => {
    setCurrentPage(page);
    teacherList(page, filters);
  }, []);

  useEffect(() => {
    fetchPageData(currentPage, {});
  }, [currentPage, fetchPageData]);

  return (
    <AppCard title={t("teacher.teacherList.label")}>
      {data && (
        <AppTable
          rowLink="/home/teacher-editor/{id}"
          data={data as Teacher[]}
          columns={columns}
          fetchPageData={fetchPageData}
          actions={[
            {
              label: t("teacher.registerTeacher.label"),
              route: "/home/teacher-editor/new",
              icon: "plus",
            },
          ]}
        />
      )}
    </AppCard>
  );
};

export default TeacherList;
