import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Student } from "../../../models/Student";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import useUser from "../../../hooks/useUser";
import { SchoolType } from "../../../models/SchoolType";
import { Class } from "../../../models/Class";

const StudentList = () => {
  const { t } = useTranslation();
  const { studentList, data, totalPages } = useSchoolOperations();
  const user = useUser();

  const columns: Column<Student>[] = useMemo(
    () => [
      {
        header: "student.firstNameNative.label",
        accessor: "firstNameNative",
        sortable: true,
      },
      {
        header: "student.lastNameNative.label",
        accessor: "lastNameNative",
        sortable: true,
      },
      {
        header: "student.fatherNameNative.label",
        accessor: "fatherNameNative",
        sortable: true,
      },
      {
        header: "student.grandFatherNameNative.label",
        accessor: "grandFatherNameNative",
        sortable: true,
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
        sortable: true,
      },
      {
        header: "student.monthlyFee.label",
        accessor: "monthlyFee",
        hidden: user?.school?.schoolType !== SchoolType.PRIVATE,
        sortable: true,
      },
      {
        header: "class.className.label",
        accessor: "joiningClass",
        filter: { type: "dropdown" },
        render: (joiningClass: Class) =>
          joiningClass?.classNameValue +
            " " +
            joiningClass?.branch?.branchName || "",
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
