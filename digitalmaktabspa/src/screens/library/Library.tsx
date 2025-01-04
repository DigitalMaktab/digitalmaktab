import React, { useCallback, useMemo, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import { Book } from "../../models/Book";
import { Column } from "../../components/table/properties/TableProps";
import AppCard from "../../components/card/AppCard";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import AppTable from "../../components/table/AppTable";
import AppLibraryPdfPreview from "../../components/pdf/AppLibraryPdfPreview";
import settings from "../../config/settings";

const Library = () => {
  const { t } = useAppLocalizer();
  const { fetchBooks, data, totalPages } = useMainOperations();

  const [selectedRows, setSelectedRows] = useState<Book[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);

  const columns: Column<Book>[] = useMemo(
    () => [
      {
        header: "book.bookTitle.label",
        accessor: "bookTitle",
      },
    ],
    []
  );

  const handleRowSelect = useCallback((selectedRows: Book[]) => {
    setSelectedRows(selectedRows);
  }, []);

  const readBook = () => {
    if (selectedRows.length === 0) {
      return;
    }
    setShowModal(true);
  };

  return (
    <AppCard title={t("book.list.label")}>
      <AppTable
        rowLink="/library-editor/{id}"
        data={data as Book[]}
        columns={columns}
        totalPages={totalPages}
        fetchPageData={fetchBooks}
        reportTitle={t("book.list.label")}
        actions={[
          {
            label: t("book.addBook.label"),
            route: "/library-editor/new",
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
          title={selectedRows[0].bookTitle}
          pdfUrl={`${settings.url}${selectedRows[0].bookPath}`}
        />
      )}
    </AppCard>
  );
};

export default Library;
