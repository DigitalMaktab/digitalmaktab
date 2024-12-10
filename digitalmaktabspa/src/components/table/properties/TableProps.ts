import { ResponseResult } from "../../../dtos/ResultEnum";

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
  fetchPageData?: (
    page: number,
    pageSize: number,
    filters: any
  ) => Promise<{
    status: ResponseResult;
    data?: T[];
    headers?: Record<string, any>;
    errors?: string[];
  }>;

  deleteRow?: (id: string) => Promise<{
    status: ResponseResult;
  }>;
  showPagination?: boolean;
  showExport?: boolean;
  reportTitle?: string;
  showPageSizer?: boolean;

  onRowsSelect?: (selectedRows: T[]) => void;
  selectMultiple?: boolean;
}
