import { Column } from "./TableProps";

export interface TableFiltersProps<T> {
  columns: Column<T>[];
  filters: { [key: string]: any };
  onFilterChange: (key: string, value: any) => void;
  onApplyFilters: () => void;
}
