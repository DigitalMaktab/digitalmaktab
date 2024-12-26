import React, { useMemo } from "react";
import { Course } from "../../models/Course";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import {
  Column,
  RoleSpecificTableProps,
} from "../../components/table/properties/TableProps";
import { Class } from "../../models/Class";
import { Subject } from "../../models/Subject";
import { Teacher } from "../../models/Teacher";
import AppCard from "../../components/card/AppCard";
import AppTable from "../../components/table/AppTable";

const CourseList: React.FC<RoleSpecificTableProps<Course>> = ({
  titleKey,
  fetchData,
  data,
  totalPages,
  addRoute,
  rowLinkTemplate,
  columns: additionalColumns = [],
}) => {
  const { t } = useAppLocalizer();

  const mergedColumns: Column<Course>[] = useMemo(() => {
    const defaultColumns: Column<Course>[] = [
      {
        header: "class.className.label",
        accessor: "class",
        render: (classValue: Class) =>
          classValue.classNameValue + " " + classValue.branch.branchName,
      },
      {
        header: "subject.subjectName.label",
        accessor: "subject",
        render: (subject: Subject) => subject.subjectName,
      },
      {
        header: "teacher.firstName.label",
        accessor: "teacher",
        render: (teacher: Teacher) =>
          teacher.firstName + " " + teacher.lastName,
      },
    ];

    const columnMap = new Map<string, Column<Course>>();

    // Add default columns first
    defaultColumns.forEach((col) => columnMap.set(col.accessor, col));

    // Override or add additional columns
    additionalColumns.forEach((col) => columnMap.set(col.accessor, col));

    return Array.from(columnMap.values());
  }, [additionalColumns]);

  return (
    <AppCard title={t(titleKey)}>
      <AppTable
        rowLink={rowLinkTemplate}
        data={data}
        columns={mergedColumns}
        totalPages={totalPages}
        fetchPageData={fetchData}
        reportTitle={t(titleKey)}
        actions={[
          {
            label: t("course.add.label"),
            route: addRoute,
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default CourseList;
