import { type Page } from '@/app/types/Page';

interface NotificationPaginationProps {
  page: Page;
  onPageChange: (pageNumber: number) => void;
}

// 페이지네이션 컴포넌트
export default function NotificationPagination({
  page,
  onPageChange,
}: NotificationPaginationProps) {
  const { number, totalPages, hasNext } = page;

  const isFirstPage = number === 0;
  const isLastPage = !hasNext || number === totalPages - 1;

  // 이전 버튼 클릭 시
  const handlePrev = () => {
    if (!isFirstPage) onPageChange(number - 1);
  };
  // 다음 버튼 클릭 시
  const handleNext = () => {
    if (!isLastPage) onPageChange(number + 1);
  };

  return (
    <div className="p-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center justify-center space-x-3">
        {/* 이전 페이지 버튼 */}
        <button
          onClick={handlePrev}
          disabled={isFirstPage}
          className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors ${
            isFirstPage ? 'text-gray-300' : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600'
          }`}
        >
          <i className="ri-arrow-left-s-line text-lg"></i>
        </button>

        {/* 현재 / 전체 페이지 표시 */}
        <div className="pt-0.5 flex items-center space-x-1">
          <span className="text-sm font-semibold text-gray-700">{number + 1}</span>
          <span className="text-sm text-gray-400">/</span>
          <span className="text-sm text-gray-500">{totalPages}</span>
        </div>

        {/* 다음 페이지 버튼 */}
        <button
          onClick={handleNext}
          disabled={isLastPage}
          className={`flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors ${
            isLastPage
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-blue-100 hover:text-blue-600'
          }`}
        >
          <i className="ri-arrow-right-s-line text-lg"></i>
        </button>
      </div>
    </div>
  );
}
