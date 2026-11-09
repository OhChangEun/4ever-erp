'use client';

interface LoadingMessageProps {
  message?: string; // 표시할 메시지
  subMessage?: string; // 작은 부가 메시지
  size?: 'sm' | 'md' | 'lg'; // 아이콘 크기
  color?: string; // 아이콘 색상
}

export default function LoadingMessage({
  message = '로딩 중...',
  subMessage = '잠시만 기다려주세요',
  size = 'md',
  color = 'text-blue-500',
}: LoadingMessageProps) {
  // 아이콘 크기 매핑
  const sizeClass = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <i className={`ri-loader-4-line ${sizeClass} ${color} animate-spin mb-4`}></i>
      <p className="text-lg font-medium text-gray-700">{message}</p>
      {subMessage && <p className="text-sm text-gray-500 mt-2">{subMessage}</p>}
    </div>
  );
}
