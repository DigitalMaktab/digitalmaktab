import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Student } from "../../../models/Student";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";

const StudentList = () => {
  const { t } = useTranslation();
  const { studentList, data, totalPages } = useSchoolOperations();

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        header: "student.firstNameNative.label",
        accessor: "firstNameNative",
      },
      {
        header: "student.lastNameNative.label",
        accessor: "lastNameNative",
      },
      {
        header: "student.fatherNameNative.label",
        accessor: "fatherNameNative",
      },
      {
        header: "student.grandFatherNameNative.label",
        accessor: "grandFatherNameNative",
      },
      {
        header: "student.firstNameEnglish.label",
        accessor: "firstNameEnglish",
      },
      {
        header: "student.lastNameEnglish.label",
        accessor: "lastNameEnglish",
      },
      {
        header: "student.fatherNameEnglish.label",
        accessor: "fatherNameEnglish",
      },
      {
        header: "student.grandFatherNameEnglish.label",
        accessor: "grandFatherNameEnglish",
      },
      {
        header: "student.asasNumber.label",
        accessor: "asasNumber",
      },
    ],
    []
  );

  return (
    <AppCard title={t("student.studentList.label")}>
      <AppTable
        rowLink="/student-editor/{id}"
        data={data as Student[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={studentList}
        reportTitle={t("student.studentList.label")}
        actions={[
          {
            label: t("student.registerStudent.label"),
            route: "/student-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default StudentList;
