import React, { useCallback, useEffect, useState } from "react";
import useMainOperations from "../../hooks/useMainOperations";
import AppPDFGenerator from "../../components/pdf/AppPdfGenerator";
import AppPDFPreview from "../../components/pdf/AppPdfPreview";
import AppPdfPreviewFromLink from "../../components/pdf/AppPdfPreviewFromLink";
import AppExportTableToPdf from "../../components/pdf/AppExportTableToPdf";
import AppExportStyledTableToPdf from "../../components/pdf/AppExportStyledTableToPdf";

const Library = () => {
  const { fetchBooks, data } = useMainOperations();
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPageData = useCallback(async (page: number, filters = {}) => {
    setCurrentPage(page);
    await fetchBooks(page, filters);
  }, []);

  useEffect(() => {
    fetchPageData(currentPage, {});
  }, [currentPage, fetchPageData]);

  return (
    <>
      {data && (
        <>
          <div className="row">
            <div className="col-md-12">
              <AppPDFGenerator />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <AppPDFPreview />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <AppPdfPreviewFromLink
                pdfUrl={`http://0.0.0.0:5000/${data[2].bookPath}`}
              />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <AppExportTableToPdf />
            </div>
          </div>

          <div className="row">
            <div className="col-md-12">
              <AppExportStyledTableToPdf />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Library;
