'use client';

interface ErrorMessageProps {
  message?: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div role="alert" className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
      <p className="text-sm font-medium">오류가 발생했습니다</p>
      <p className="mt-1 text-sm text-red-600">{message ?? '알 수 없는 오류가 발생했습니다.'}</p>
    </div>
  );
}
