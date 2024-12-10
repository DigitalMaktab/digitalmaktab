import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { TableProps } from "./properties/TableProps";
import { useNavigate } from "react-router-dom";
import AppPagination from "./AppPagination";
import AppButton from "../AppButton";
import AppTableFilters from "./AppTableFilter";
import { Base } from "../../models/Base";
import { Action } from "./properties/TableActionPrps";
import AppTableActions from "./AppTableActions";
import AppHorizontalSpacer from "../spacer/AppHorizontalSpacer";
import useJsPdfExportToPdf from "../../hooks/useJsPdfExportToPdf";
import { useAppLocalizer } from "../../hooks/useAppLocalizer";
import { ResponseResult } from "../../dtos/ResultEnum";

const AppTable = <T extends Base>({
  data = [], // Default data to an empty array
  columns,
  fetchPageData,
  deleteRow,
  rowLink,
  actions = [],
  totalPages,
  showPagination = true,
  showExport = true,
  reportTitle = "",
  showPageSizer = true,
  onRowsSelect,
  selectMultiple = false,
}: TableProps<T> & {
  rowLink?: string;
  actions?: Action[];
  totalPages: number;
}) => {
  const { t, formatNumber } = useAppLocalizer();
  const navigate = useNavigate();

  const [selectedRows, setSelectedRows] = useState<T[]>([]);

  const handleRowSelection = (row: T) => {
    setSelectedRows((prev) => {
      let updatedSelection: T[];
      if (prev.some((selected) => selected.id === row.id)) {
        updatedSelection = prev.filter((selected) => selected.id !== row.id);
      } else {
        updatedSelection = selectMultiple ? [...prev, row] : [row];
      }
      return updatedSelection;
    });
  };

  // Synchronize with parent component after state updates
  useEffect(() => {
    if (onRowsSelect) {
      onRowsSelect(selectedRows);
    }
  }, [selectedRows, onRowsSelect]);

  const isRowSelected = (row: T) =>
    selectedRows.some((selected) => selected.id === row.id);

  // Ensure data is an array, even if null or undefined is passed
  const safeData = data || [];

  const [tableState, setTableState] = useState({
    currentPage: 1,
    pageSize: 10,
    filters: {},
  });

  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  const exportToPDF = useJsPdfExportToPdf<T>();

  const hasFilters = columns.some((col) => col.filter);

  // Memoized fetch logic
  const fetchData = useCallback(async () => {
    setLoading(true); // Start loading
    setError(null); // Clear previous errors
    try {
      if (fetchPageData) {
        const response = await fetchPageData(
          tableState.currentPage,
          tableState.pageSize,
          tableState.filters
        );
        if (response.status === ResponseResult.ERROR) {
          setError(response.errors?.[0] || t("table.error.label"));
        }
      }
    } catch (error) {
      setError(t("table.error.label"));
    } finally {
      setLoading(false); // Stop loading
    }
  }, [tableState, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Only re-fetch when the memoized fetchData changes

  const handleFilterChange = (key: string, value: any) => {
    setTableState((prevState) => ({
      ...prevState,
      filters: { ...prevState.filters, [key]: value },
      currentPage: 1, // Reset to the first page whenever a filter is changed
    }));
  };

  const applyFilters = () => {
    setTableState((prevState) => ({
      ...prevState,
      currentPage: 1, // Reset page when filters are applied
    }));
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPageSize = Number(e.target.value);
    setTableState((prevState) => ({
      ...prevState,
      pageSize: newPageSize,
      currentPage: 1, // Reset to the first page when page size changes
    }));
  };

  const handlePageChange = (page: number) => {
    setTableState((prevState) => ({
      ...prevState,
      currentPage: page,
    }));
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

  const handleExport = () => {
    exportToPDF(columns, safeData, reportTitle);
  };

  const handleDelete = async (row: T) => {
    if (deleteRow) {
      const response = await deleteRow(row.id);
      if (response.status === ResponseResult.SUCCESS) {
        await fetchPageData!(
          tableState.currentPage,
          tableState.pageSize,
          tableState.filters
        );
      }
    }
  };

  return (
    <>
      <div className="mb-1 d-flex justify-content-end">
        {showPageSizer && (
          <>
            <AppHorizontalSpacer />
            <div className="form-group d-flex align-items-center">
              <label htmlFor="pageSizeSelect" className="me-2 mb-0">
                {t("table.pageSize.label")}
              </label>
              <select
                id="pageSizeSelect"
                className="form-select form-select-sm"
                value={tableState.pageSize}
                onChange={handlePageSizeChange}
                style={{ width: "100px" }}
              >
                {[10, 20, 30, 40, 50].map((size) => (
                  <option key={size} value={size}>
                    {formatNumber(size)}
                  </option>
                ))}
              </select>
            </div>
            <AppHorizontalSpacer />
          </>
        )}

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
        {showExport && safeData.length !== 0 && (
          <>
            <AppHorizontalSpacer />
            <AppButton
              label={t("report.print.label")}
              type="button"
              onButtonClick={handleExport}
              className="btn-primary btn-xs"
              icon="printer"
            />
          </>
        )}
        <AppHorizontalSpacer />
        <AppTableActions actions={actions} />
      </div>
      {showFilters && (
        <AppTableFilters
          columns={columns}
          filters={tableState.filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={applyFilters}
        />
      )}

      <div className="table-container">
        {loading ? (
          <p>{t("table.loading.label")}</p>
        ) : error ? (
          <div className="table-message">{t("table.error.label")}</div>
        ) : safeData.length === 0 ? (
          <div className="table-message">{t("table.noData.label")}</div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead className="table-dark">
                <tr>
                  {columns.map((col, index) => (
                    <th key={index} scope="col">
                      {t(col.header)}
                    </th>
                  ))}
                  {deleteRow && <th scope="col">{t("table.actions.label")}</th>}
                </tr>
              </thead>
              <tbody>
                {safeData.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    onDoubleClick={() => navigateToRow(row)}
                    onClick={() => handleRowSelection(row)}
                    className={isRowSelected(row) ? "table-row-selected" : ""}
                    style={{
                      cursor: "pointer",
                      backgroundColor: isRowSelected(row)
                        ? "#f0f8ff"
                        : "transparent", // Highlight selected rows
                    }}
                  >
                    {columns.map((col, colIndex) => {
                      const cellContent = col.render
                        ? col.render(row[col.accessor], row)
                        : (row[col.accessor] as ReactNode);

                      return <td key={colIndex}>{cellContent ?? ""}</td>;
                    })}

                    {deleteRow && (
                      <td>
                        <AppButton
                          label=""
                          type="button"
                          onButtonClick={() => handleDelete(row)}
                          icon="trash"
                          className="btn-danger btn-xs"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {showPagination && safeData.length !== 0 && (
              <AppPagination
                currentPage={tableState.currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AppTable;
