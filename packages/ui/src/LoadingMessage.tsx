'use client';

import { useUiText } from './UiText';

interface LoadingMessageProps {
  message?: string; // 표시할 메시지
  subMessage?: string; // 작은 부가 메시지
  size?: 'sm' | 'md' | 'lg'; // 아이콘 크기
  color?: string; // 아이콘 색상
}

export default function LoadingMessage({
  message,
  subMessage,
  size = 'md',
  color = 'text-blue-500',
}: LoadingMessageProps) {
  const text = useUiText().loading;
  // 넘기지 않았을 때만 기본 글자. subMessage 에 '' 를 넘기면 둘째 줄을 그리지 않는다(예전과 같다)
  const shownMessage = message ?? text.message;
  const shownSubMessage = subMessage ?? text.subMessage;

  // 아이콘 크기 매핑
  const sizeClass = {
    sm: 'text-3xl',
    md: 'text-5xl',
    lg: 'text-7xl',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <i className={`ri-loader-4-line ${sizeClass} ${color} animate-spin mb-4`}></i>
      <p className="text-lg font-medium text-gray-700">{shownMessage}</p>
      {shownSubMessage && <p className="text-sm text-gray-500 mt-2">{shownSubMessage}</p>}
    </div>
  );
}
