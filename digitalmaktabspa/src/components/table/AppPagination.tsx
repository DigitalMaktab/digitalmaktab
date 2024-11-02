import React from "react";
import { PaginationProps } from "./properties/PaginationProps";
import { useTranslation } from "react-i18next";

const AppPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const formatPageNumber = (page: number) => {
    return new Intl.NumberFormat(i18n.language).format(page);
  };

  return (
    <div
      style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}
    >
      <nav aria-label="Page navigation example">
        <ul className="pagination pagination-primary pagination-border-primary">
          <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
            <button
              className="page-link"
              onClick={handlePrevious}
              disabled={currentPage === 1}
            >
              {t("pagination.previous")}
            </button>
          </li>
          {[...Array(totalPages)].map((_, index) => (
            <li
              key={index}
              className={`page-item ${
                currentPage === index + 1 ? "active" : ""
              }`}
            >
              <button
                className="page-link"
                onClick={() => handlePageChange(index + 1)}
                disabled={currentPage === index + 1}
              >
                {formatPageNumber(index + 1)}
              </button>
            </li>
          ))}
          <li
            className={`page-item ${
              currentPage === totalPages ? "disabled" : ""
            }`}
          >
            <button
              className="page-link"
              onClick={handleNext}
              disabled={currentPage === totalPages}
            >
              {t("pagination.next")}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default AppPagination;
