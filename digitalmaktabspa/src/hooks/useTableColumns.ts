import { useMemo } from "react";
import { Column } from "../components/table/properties/TableProps";

export function useTableColumns<T>(
  defaultColumns: Column<T>[],
  additionalColumns: Column<T>[]
): Column<T>[] {
  return useMemo(() => {
    const columnMap = new Map<string | number | symbol, Column<T>>();

    // Add default columns first
    defaultColumns.forEach((col) => columnMap.set(col.accessor, col));

    // Override or add additional columns
    additionalColumns.forEach((col) => columnMap.set(col.accessor, col));

    return Array.from(columnMap.values());
  }, [defaultColumns, additionalColumns]);
}
