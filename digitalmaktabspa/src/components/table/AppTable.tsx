import React, { useEffect, useState, useCallback, useContext } from "react";
import { Column, TableProps } from "./properties/TableProps";
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
import { AuthContext } from "../../helper/auth/AuthProvider";

import * as FAIcons from "react-icons/fa";

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
  deleteRoles = [],
  navigateToEditorRoles = [],
  exportRoles = [],
}: TableProps<T> & {
  rowLink?: string;
  actions?: Action[];
  totalPages: number;
}) => {
  const { t, formatNumber } = useAppLocalizer();
  const navigate = useNavigate();
  const { userRole } = useContext(AuthContext);

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

  const safeData = React.useMemo(() => data || [], [data]);

  const [tableState, setTableState] = useState({
    currentPage: 1,
    pageSize: 10,
    filters: {},
    sortBy: "", // To hold the column being sorted
    sortOrder: "asc", // To hold the sort order
  });

  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state
  const [error, setError] = useState<string | null>(null); // Error state

  const exportToPDF = useJsPdfExportToPdf<T>();

  const hasFilters = columns.some((col) => col.filter);

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
    if (
      rowLink &&
      (navigateToEditorRoles.length === 0 ||
        navigateToEditorRoles.includes(userRole!))
    ) {
      const path = rowLink.replace("{id}", row.id);
      navigate(path.startsWith("/") ? path : `/${path}`, {
        state: { initialData: row },
      });
    }
  };

  const handleExport = () => {
    if (exportRoles.length === 0 || exportRoles.includes(userRole!)) {
      exportToPDF(columns, safeData, reportTitle);
    }
  };

  const handleDelete = async (row: T) => {
    if (
      deleteRow &&
      (deleteRoles.length === 0 || deleteRoles.includes(userRole!))
    ) {
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

  // Sort the data when a column is clicked
  const handleSort = (column: Column<T>) => {
    const sortOrder =
      tableState.sortBy === column.accessor && tableState.sortOrder === "asc"
        ? "desc"
        : "asc";
    setTableState((prevState) => ({
      ...prevState,
      sortBy: column.accessor as string,
      sortOrder,
    }));
  };

  // Sort data based on the current sort order
  const sortedData = React.useMemo(() => {
    const sorted = [...safeData];
    if (tableState.sortBy) {
      sorted.sort((a, b) => {
        const aValue = a[tableState.sortBy as keyof T];
        const bValue = b[tableState.sortBy as keyof T];
        if (aValue < bValue) return tableState.sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return tableState.sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [safeData, tableState.sortBy, tableState.sortOrder]);

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
        {showExport &&
          safeData.length !== 0 &&
          (exportRoles.length === 0 || exportRoles.includes(userRole!)) && (
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
                  {columns.map((col, index) =>
                    !col.hidden ? (
                      <th
                        key={index}
                        scope="col"
                        style={{ width: col.width }}
                        onClick={
                          col.sortable ? () => handleSort(col) : undefined
                        }
                      >
                        {t(col.header)}
                        {col.sortable && (
                          <span>
                            {tableState.sortBy === col.accessor &&
                            tableState.sortOrder === "asc" ? (
                              <FAIcons.FaCaretUp />
                            ) : (
                              <FAIcons.FaCaretDown />
                            )}
                          </span>
                        )}
                      </th>
                    ) : null
                  )}
                  {deleteRow && <th scope="col">{t("table.actions.label")}</th>}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((row, rowIndex) => (
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
                    {columns.map((col, colIndex) =>
                      !col.hidden ? (
                        <td key={colIndex} style={{ width: col.width }}>
                          {col.render
                            ? col.render(row[col.accessor], row)
                            : (row[col.accessor] as React.ReactNode)}
                        </td>
                      ) : null
                    )}

                    {deleteRow &&
                      (deleteRoles.length === 0 ||
                        deleteRoles.includes(userRole!)) && (
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
