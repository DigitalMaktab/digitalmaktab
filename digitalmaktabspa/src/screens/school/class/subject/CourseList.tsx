import React, { useMemo } from "react";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { Course } from "../../../../models/Course";
import { Column } from "../../../../components/table/properties/TableProps";
import { Class } from "../../../../models/Class";
import AppCard from "../../../../components/card/AppCard";
import AppTable from "../../../../components/table/AppTable";
import { Subject } from "../../../../models/Subject";

const CourseList = () => {
  const { t } = useAppLocalizer();
  const { courseList, data, totalPages } = useSchoolOperations();

  const columns: Column<Course>[] = useMemo(
    () => [
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
    ],
    []
  );

  return (
    <AppCard title={t("course.list.label")}>
      <AppTable
        rowLink="/class-subject-editor/{id}"
        data={data as Course[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={courseList}
        reportTitle={t("course.list.label")}
        actions={[
          {
            label: t("course.add.label"),
            route: "/class-subject-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default CourseList;
