import React, { useMemo } from "react";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Class } from "../../../models/Class";
import { Branch } from "../../../models/Branch";
import { Teacher } from "../../../models/Teacher";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { Enrollment } from "../../../models/Enrollment";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { ClassSubject } from "../../../models/ClassSubject";

const ClassList = () => {
  const { t, formatNumber } = useAppLocalizer();
  const { classList, data, totalPages } = useSchoolOperations();

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
        render: (enrollments: Enrollment[]) => formatNumber(enrollments.length),
      },
      {
        header: "classSubject.total.label",
        accessor: "classSubjects",
        render: (classSubjects: ClassSubject[]) =>
          formatNumber(classSubjects.length),
      },
    ],
    [formatNumber]
  );

  return (
    <AppCard title={t("class.classList.label")}>
      <AppTable
        rowLink="/class-editor/{id}"
        data={data as Class[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={classList}
        reportTitle={t("class.classList.label")}
        actions={[
          {
            label: t("class.addClass.label"),
            route: "/class-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default ClassList;
