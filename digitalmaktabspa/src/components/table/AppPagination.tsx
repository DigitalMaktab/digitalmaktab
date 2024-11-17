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

  const getPaginationRange = () => {
    const range: (number | "dots")[] = [];
    const maxVisible = 5; // Max visible buttons (excluding first, last, and ellipses)
    const halfVisible = Math.floor(maxVisible / 2);

    if (totalPages <= maxVisible + 2) {
      // Show all pages if total pages are small
      for (let i = 1; i <= totalPages; i++) {
        range.push(i);
      }
    } else {
      // Add the first page
      range.push(1);

      if (currentPage > halfVisible + 2) {
        range.push("dots"); // Add leading dots
      }

      const start = Math.max(2, currentPage - halfVisible);
      const end = Math.min(totalPages - 1, currentPage + halfVisible);

      for (let i = start; i <= end; i++) {
        range.push(i);
      }

      if (currentPage < totalPages - halfVisible - 1) {
        range.push("dots"); // Add trailing dots
      }

      // Add the last page
      range.push(totalPages);
    }

    return range;
  };

  const paginationRange = getPaginationRange();

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
          {paginationRange.map((page, index) =>
            page === "dots" ? (
              <li key={index} className="page-item disabled">
                <span className="page-link">...</span>
              </li>
            ) : (
              <li
                key={index}
                className={`page-item ${currentPage === page ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => handlePageChange(page as number)}
                  disabled={currentPage === page}
                >
                  {formatPageNumber(page as number)}
                </button>
              </li>
            )
          )}
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
