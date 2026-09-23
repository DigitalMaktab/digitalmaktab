using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace digitalmaktabapi.Helpers
{
    public class PaginationHeader(int currentPage, int itemsPerPage, int totalItems, int totalPages)
    {
        public int CurrentPage { get; set; } = currentPage;
        public int ItemsPerPage { get; set; } = itemsPerPage;
        public int TotalItems { get; set; } = totalItems;
        public int TotalPages { get; set; } = totalPages;
    }
}