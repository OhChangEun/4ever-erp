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

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded text-sm transition-colors';
  const btnActive = 'bg-blue-600 text-white font-medium';
  const btnDefault = 'border border-gray-300 text-gray-600 hover:bg-gray-50 cursor-pointer';
  const btnDisabled = 'text-gray-300';

  return (
    <div className="px-6 border-gray-200 flex items-center justify-between shrink-0">
      <span className="text-sm text-gray-500">
        총 <span className="font-medium text-gray-700">{totalElements ?? 0}</span>개
      </span>

      <div className="flex items-center gap-1">
        {/* 이전 버튼 */}
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className={`${btnBase} ${currentPage === 1 ? btnDisabled : btnDefault}`}
        >
          <i className="ri-arrow-left-s-line text-base" />
        </button>

        {/* 페이지 번호 */}
        {pageRange.map((p, index) =>
          p === '...' ? (
            <span
              key={`dots-${index}`}
              className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
            >
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${currentPage === p ? btnActive : btnDefault}`}
            >
              {p}
            </button>
          ),
        )}

        {/* 다음 버튼 */}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className={`${btnBase} ${currentPage === totalPages ? btnDisabled : btnDefault}`}
        >
          <i className="ri-arrow-right-s-line text-base" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
