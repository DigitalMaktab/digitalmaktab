import React, { useMemo, useState } from "react";
import useSchoolOperations from "../../../hooks/useSchoolOperations";
import { Column } from "../../../components/table/properties/TableProps";
import { Teacher } from "../../../models/Teacher";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { PhoneNumber } from "../../../models/PhoneNumber";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import { UserRole } from "../../../models/UserRole";
import BulkImportModal from "../../../components/import/BulkImportModal";
import schoolApi from "../../../api/school";

const TeacherList = () => {
  const { t, formatCountryCode } = useAppLocalizer();
  const { teacherList, deleteTeacher, data, totalPages } =
    useSchoolOperations();
  const [showImportModal, setShowImportModal] = useState(false);

  // Define columns using useMemo for optimization
  const columns: Column<Teacher>[] = useMemo(
    () => [
      {
        header: "teacher.firstName.label",
        accessor: "firstName",
        entity: "teacher",
        filter: { type: "dropdown" },
      },
      {
        header: "teacher.lastName.label",
        accessor: "lastName",
      },
      {
        header: "auth.email.label",
        accessor: "email",
        filter: { type: "text" },
      },
      {
        header: "phoneNumber.label",
        accessor: "phoneNumber",
        render: (phoneNumber: PhoneNumber) =>
          formatCountryCode(phoneNumber?.country?.countryPhoneCode) +
          " " +
          phoneNumber?.number,
      },
      {
        header: "gender.label",
        accessor: "genderValue",
      },
    ],
    [formatCountryCode]
  );

  return (
    <AppCard title={t("teacher.teacherList.label")}>
      <AppTable
        rowLink="/teacher-editor/{id}"
        data={data as Teacher[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={teacherList}
        deleteRow={deleteTeacher}
        reportTitle={t("teacher.teacherList.label")}
        actions={[
          {
            label: t("teacher.registerTeacher.label"),
            route: "/teacher-editor/new",
            icon: "plus",
          },
          {
            label: t("teacher.import.button"),
            onClick: () => setShowImportModal(true),
            icon: "upload",
          },
        ]}
        deleteRoles={[UserRole.ADMIN]}
      />
      <BulkImportModal
        isVisible={showImportModal}
        onClose={() => setShowImportModal(false)}
        translationPrefix="teacher.import"
        downloadTemplate={schoolApi.downloadTeacherImportTemplate}
        importFile={schoolApi.importTeachers}
        templateFileName="teacher-import-template.xlsx"
        passwordsFileName="teacher-passwords.csv"
      />
    </AppCard>
  );
};

export default TeacherList;
