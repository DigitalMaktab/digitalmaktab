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
import { Action } from "../../components/table/properties/TableActionPrps";
import { useTableColumns } from "../../hooks/useTableColumns";
import { useTableActions } from "../../hooks/useTableActions";

const CourseList: React.FC<RoleSpecificTableProps<Course>> = ({
  titleKey,
  fetchData,
  data,
  totalPages,
  addRoute,
  rowLinkTemplate,
  columns: additionalColumns = [],
  actions: providedActions,
}) => {
  const { t } = useAppLocalizer();

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
      render: (teacher: Teacher) => teacher.firstName + " " + teacher.lastName,
    },
  ];

  const mergedColumns = useTableColumns(defaultColumns, additionalColumns);

  const defaultActions: Action[] = [
    {
      label: t("course.add.label"),
      route: addRoute,
      icon: "plus",
    },
  ];

  const tableActions = useTableActions(defaultActions, providedActions);

  return (
    <AppCard title={t(titleKey)}>
      <AppTable
        rowLink={rowLinkTemplate}
        data={data}
        columns={mergedColumns}
        totalPages={totalPages}
        fetchPageData={fetchData}
        reportTitle={t(titleKey)}
        actions={tableActions}
      />
    </AppCard>
  );
};

export default CourseList;
