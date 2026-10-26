'use client';

interface TableStatusBoxProps {
  type: 'loading' | 'error' | 'empty';
  message: string;
}

/** 테이블 자리에 들어가는 로딩·오류·빈 상태. 테이블과 같은 테두리 안에 보여준다. */
const TableStatusBox = ({ type, message }: TableStatusBoxProps) => {
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
