export const LIST_PAGE_SIZE = 10;

export function paginateList<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    totalPages,
    page: safePage,
    showPagination: items.length > pageSize,
  };
}

interface ListPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ListPagination({ page, totalPages, onPageChange }: ListPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-3 flex flex-wrap justify-center gap-1" aria-label="페이지 목록">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`min-w-8 rounded-pill px-2.5 py-1 text-sm transition ${
            n === page
              ? "bg-koala-primary text-white"
              : "text-koala-muted hover:bg-koala-secondary/30 hover:text-koala-primary"
          }`}
          aria-current={n === page ? "page" : undefined}
        >
          {n}
        </button>
      ))}
    </nav>
  );
}
