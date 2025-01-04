import { ResponseResult } from "../../../dtos/ResultEnum";
import { UserRole } from "../../../models/UserRole";
import { Action } from "./TableActionPrps";

export interface Column<T> {
  header: string;
  accessor: keyof T;
  entity?: string;
  render?: (value: any, row: T) => React.ReactNode;
  filter?: {
    type: "text" | "dropdown";
  };
  sortable?: boolean;
  width?: number;
  hidden?: boolean;
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
  deleteRoles?: UserRole[]; // Specify roles for deletion
  navigateToEditorRoles?: UserRole[]; // Specify roles for double-click
  exportRoles?: UserRole[];
}

export interface RoleSpecificTableProps<T> {
  titleKey: string;
  fetchData?: (
    page: number,
    pageSize: number,
    filters: any
  ) => Promise<{
    status: ResponseResult;
    data?: T[];
    headers?: Record<string, any>;
    errors?: string[];
  }>;
  data: T[];
  totalPages: number;
  addRoute: string;
  rowLinkTemplate: string;
  columns?: Column<T>[];
  actions?: Action[];
}
