import React, { ReactNode, useEffect, useState } from "react";
import { TableProps } from "./properties/TableProps";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import AppPagination from "./AppPagination";
import AppButton from "../AppButton";
import AppTableFilters from "./AppTableFilter";
import { Base } from "../../models/Base";
import { Action } from "./properties/TableActionPrps";
import AppTableActions from "./AppTableActions";
import AppHorizontalSpacer from "../spacer/AppHorizontalSpacer";

const AppTable = <T extends Base>({
  data,
  columns,
  fetchPageData,
  rowLink,
  actions = [],
  totalPages,
}: TableProps<T> & {
  fetchPageData: (page: number, filters: any) => void;
  rowLink?: string;
  actions?: Action[];
  totalPages: number;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{ [key: string]: any }>({});
  const [showFilters, setShowFilters] = useState(false);

  const hasFilters = columns.some((col) => col.filter);

  useEffect(() => {
    fetchPageData(currentPage, filters);
  }, [currentPage, filters, fetchPageData]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prevFilters) => ({ ...prevFilters, [key]: value }));
    // Only reset currentPage without affecting filters
    setCurrentPage((prevPage) => (prevPage !== 1 ? 1 : prevPage));
  };

  const applyFilters = () => {
    fetchPageData(1, filters);
  };

  const toggleFilters = () => {
    setShowFilters((prevShow) => !prevShow);
  };

  const navigateToRow = (row: T) => {
    if (rowLink) {
      const path = rowLink.replace("{id}", row.id);
      navigate(path.startsWith("/") ? path : `/${path}`, {
        state: { initialData: row },
      });
    }
  };

  return (
    <>
      <div className="mb-1 d-flex justify-content-end">
        {hasFilters && (
          <AppButton
            label={
              showFilters ? t("filters.hide.label") : t("filters.show.label")
            }
            type="button"
            onButtonClick={toggleFilters}
            className="btn-secondary btn-xs "
          />
        )}

        <AppHorizontalSpacer />
        <AppTableActions actions={actions} />
      </div>
      {showFilters && (
        <AppTableFilters
          columns={columns}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={applyFilters}
        />
      )}

      <div className="table-responsive">
        <table className="table">
          <thead className="table-dark">
            <tr>
              {columns.map((col, index) => (
                <th key={index} scope="col">
                  {t(col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onDoubleClick={() => navigateToRow(row)}
                style={{ cursor: rowLink ? "pointer" : "default" }}
              >
                {columns.map((col, colIndex) => {
                  const cellContent = col.render
                    ? col.render(row[col.accessor], row)
                    : (row[col.accessor] as ReactNode); // Cast to ReactNode

                  return <td key={colIndex}>{cellContent ?? ""}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <AppPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </>
  );
};

export default AppTable;
