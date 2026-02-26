import { useMemo } from "react";

/**
 * Custom hook to generate pagination range.
 *
 * @param currentPage The current active page.
 * @param totalPages The total number of pages.
 * @returns An array of page numbers and/or "..." strings.
 */
export const usePagination = (currentPage: number, totalPages: number) => {
  const paginationRange = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(
          1,
          "...",
          totalPages - 4,
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  return paginationRange;
};
