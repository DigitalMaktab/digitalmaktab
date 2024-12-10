import React, { useCallback, useMemo, useState } from "react";
import { Column } from "../../../components/table/properties/TableProps";
import { Subject } from "../../../models/Subject";
import AppCard from "../../../components/card/AppCard";
import AppTable from "../../../components/table/AppTable";
import { useAppLocalizer } from "../../../hooks/useAppLocalizer";
import useMainOperations from "../../../hooks/useMainOperations";
import { Book } from "../../../models/Book";
import * as AIIcons from "react-icons/ai";
import useRootOperations from "../../../hooks/useRootOperations";
import AppLibraryPdfPreview from "../../../components/pdf/AppLibraryPdfPreview";

const SubjectList = () => {
  const { t } = useAppLocalizer();
  const { subjectList, data, totalPages } = useMainOperations();
  const { deleteSubject } = useRootOperations();

  const [selectedRows, setSelectedRows] = useState<Subject[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  const columns: Column<Subject>[] = useMemo(
    () => [
      {
        header: "subject.subjectName.label",
        accessor: "subjectName",
      },
      {
        header: "book.bookTitle.label",
        accessor: "book",
        render: (book: Book) => (
          <>
            <AIIcons.AiOutlineFilePdf className="stroke-icon" />{" "}
            {book.bookTitle}
          </>
        ),
      },
    ],
    []
  );

  const handleRowSelect = useCallback((selectedSubjects: Subject[]) => {
    setSelectedRows(selectedSubjects);
  }, []);

  const readBook = () => {
    if (selectedRows.length === 0) {
      return;
    }
    setShowModal(true);
  };

  return (
    <AppCard title={t("subject.list.label")}>
      <AppTable
        rowLink="/subject-editor/{id}"
        data={data as Subject[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={subjectList}
        reportTitle={t("subject.list.label")}
        deleteRow={deleteSubject}
        actions={[
          {
            label: t("subject.add.label"),
            route: "/subject-editor/new",
            icon: "plus",
          },
          {
            label: t("library.readButton.label"),
            onClick: readBook,
            icon: "book-open",
          },
        ]}
        onRowsSelect={handleRowSelect}
      />
      {selectedRows.length > 0 && (
        <AppLibraryPdfPreview
          isVisible={showModal}
          onClose={() => setShowModal(false)}
          title={selectedRows[0].book.bookTitle}
          pdfUrl={`http://192.168.8.142:5000/${selectedRows[0].book?.bookPath}`}
        />
      )}
    </AppCard>
  );
};

export default SubjectList;
