'use client';

import { getStatusColor, getStatusText } from '@/lib/status.constants';

const StatusLabel = ({ statusCode }: { statusCode: string }) => {
  return (
    <span
      className={`whitespace-nowrap px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(statusCode)}`}
    >
      {getStatusText(statusCode)}
    </span>
  );
};

export default StatusLabel;
