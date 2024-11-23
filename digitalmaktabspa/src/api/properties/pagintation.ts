export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface FilterParams {
  [key: string]: any;
}

// Helper function to merge pagination and filter parameters
export const buildParams = (
  paginationParams: PaginationParams = {},
  filters: FilterParams = {}
) => {
  const { pageNumber = 1, pageSize = 10 } = paginationParams;
  return { pageNumber, pageSize, ...filters };
};
