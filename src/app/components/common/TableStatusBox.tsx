'use client';

interface TableStatusBoxProps {
  type: 'loading' | 'error' | 'empty';
  message: string;
}

const TableStatusBox = ({ type, message }: TableStatusBoxProps) => {
  if (type === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600 text-sm font-medium">{message}</p>
      </div>
    );
  } else if (type === 'error')
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3 text-red-600">
        <i className="ri-error-warning-line text-4xl" />
        <p className="font-medium">{message}</p>
      </div>
    );
  else if (type === 'empty')
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <i className="ri-folder-line text-4xl mb-2" />
        <p className="font-medium">{message}</p>
      </div>
    );
};

export default TableStatusBox;
