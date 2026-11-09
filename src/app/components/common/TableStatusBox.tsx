'use client';

import { errorMessageOf } from '@/lib/AppError';

interface TableStatusBoxProps {
  type: 'loading' | 'error' | 'empty';
  message: string;
  /** useQuery 의 error. 주면 화면 문구 아래에 오류 종류별 한 줄을 덧붙인다. */
  error?: unknown;
}

/** 테이블 자리에 들어가는 로딩, 오류, 빈 상태. 테이블과 같은 테두리 안에 보여준다. */
const TableStatusBox = ({ type, message, error }: TableStatusBoxProps) => {
  const frame =
    'flex flex-col items-center justify-center h-64 gap-3 bg-white rounded-lg border border-gray-200';

  if (type === 'loading') {
    return (
      <div className={frame} role="status" aria-live="polite">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
    );
  }
  if (type === 'error') {
    return (
      <div className={frame} role="alert">
        <i aria-hidden="true" className="ri-error-warning-line text-2xl text-red-500" />
        <p className="text-sm text-gray-700">{message}</p>
        {error != null && <p className="text-xs text-gray-500">{errorMessageOf(error)}</p>}
      </div>
    );
  }
  return (
    <div className={frame}>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default TableStatusBox;
