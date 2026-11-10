'use client';

import { useUiText } from './UiText';

interface ErrorMessageProps {
  message?: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  const text = useUiText().error;
  return (
    <div role="alert" className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
      <p className="text-sm font-medium">{text.title}</p>
      <p className="mt-1 text-sm text-red-600">{message ?? text.unknown}</p>
    </div>
  );
}
