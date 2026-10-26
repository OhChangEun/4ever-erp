'use client';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalElements?: number;
  onPageChange: (page: number) => void;
};

const Pagination = ({ currentPage, totalPages, totalElements, onPageChange }: PaginationProps) => {
  const getPageRange = (current: number, total: number): (number | '...')[] => {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    if (current <= 3) return [1, 2, 3, 4, '...', total];
    if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
  };

  const pageRange = getPageRange(currentPage, totalPages);

  const btnBase =
    'w-8 h-8 flex items-center justify-center rounded-md text-[13px] tabular-nums transition-colors';
  const btnActive = 'bg-blue-500 text-white font-medium';
  const btnDefault = 'text-gray-600 hover:bg-gray-100 cursor-pointer';
  const btnDisabled = 'text-gray-300 cursor-not-allowed';

  return (
    <nav aria-label="페이지" className="flex items-center justify-between shrink-0">
      <span className="text-[13px] text-gray-500">
        총 <span className="font-medium text-gray-800 tabular-nums">{totalElements ?? 0}</span>건
      </span>

      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="이전 페이지"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnDefault}`}
        >
          <i aria-hidden="true" className="ri-arrow-left-s-line text-base" />
        </button>

        {pageRange.map((p, index) =>
          p === '...' ? (
            <span
              key={`dots-${index}`}
              className="w-8 h-8 flex items-center justify-center text-gray-400 text-[13px]"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              aria-current={currentPage === p ? 'page' : undefined}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${currentPage === p ? btnActive : btnDefault}`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          aria-label="다음 페이지"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnDefault}`}
        >
          <i aria-hidden="true" className="ri-arrow-right-s-line text-base" />
        </button>
      </div>
    </nav>
  );
};

export default Pagination;
