'use client';

type SimplePaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
}: SimplePaginationProps) {
  const handlePrev = () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-center gap-4 py-4 border-t border-gray-200">
      {/* 이전 버튼 */}
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className={`flex items-center gap-1 px-4 py-2 rounded-md border text-sm transition-colors ${
          currentPage === 1
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        <i className="ri-arrow-left-s-line"></i>
        이전
      </button>

      {/* 현재 페이지 표시 */}
      <span className="text-sm text-gray-700">
        <span className="font-medium">{currentPage}</span> / {totalPages}
      </span>

      {/* 다음 버튼 */}
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={`flex items-center gap-1 px-4 py-2 rounded-md border text-sm transition-colors ${
          currentPage === totalPages
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
        }`}
      >
        다음
        <i className="ri-arrow-right-s-line"></i>
      </button>
    </div>
  );
}
