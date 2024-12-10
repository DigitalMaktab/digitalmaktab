import React, { useMemo } from "react";
import { useAppLocalizer } from "../../../../hooks/useAppLocalizer";
import useSchoolOperations from "../../../../hooks/useSchoolOperations";
import { ClassSubject } from "../../../../models/ClassSubject";
import { Column } from "../../../../components/table/properties/TableProps";
import { Class } from "../../../../models/Class";
import AppCard from "../../../../components/card/AppCard";
import AppTable from "../../../../components/table/AppTable";
import { Subject } from "../../../../models/Subject";

const ClassSubjectList = () => {
  const { t } = useAppLocalizer();
  const { classSubjectList, data, totalPages } = useSchoolOperations();

  const columns: Column<ClassSubject>[] = useMemo(
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
    <AppCard title={t("classSubject.list.label")}>
      <AppTable
        rowLink="/class-subject-editor/{id}"
        data={data as ClassSubject[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={classSubjectList}
        reportTitle={t("classSubject.list.label")}
        actions={[
          {
            label: t("classSubject.add.label"),
            route: "/class-subject-editor/new",
            icon: "plus",
          },
        ]}
      />
    </AppCard>
  );
};

export default ClassSubjectList;
