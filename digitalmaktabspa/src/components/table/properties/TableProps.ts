export interface Column<T> {
  header: string;
  accessor: keyof T;
  entity?: string;
  render?: (value: any, row: T) => React.ReactNode;
  filter?: {
    type: "text" | "dropdown";
  };
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  fetchPageData: (page: number) => void;
}
