'use client';

import { getStatusColor, getStatusText } from '@/lib/status.constants';

/** STATUS_COLOR_MAP 의 text-{hue}-700 에서 색상 계열만 뽑아 점 색으로 쓴다. */
const DOT_CLASS_BY_HUE: Record<string, string> = {
  green: 'bg-green-500',
  emerald: 'bg-green-500',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-400',
};

/**
 * 상태 표시. 색 채운 배지 대신 "● 텍스트" 로, 색만으로 상태를 전달하지 않는다.
 */
const StatusLabel = ({ statusCode = '' }: { statusCode?: string }) => {
  const hue = getStatusColor(statusCode).match(/text-([a-z]+)-/)?.[1] ?? 'gray';
  const dotClass = DOT_CLASS_BY_HUE[hue] ?? DOT_CLASS_BY_HUE.gray;

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-gray-800">
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      {getStatusText(statusCode)}
    </span>
  );
};

export default StatusLabel;
