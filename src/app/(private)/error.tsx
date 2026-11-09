'use client';

import { useEffect } from 'react';
import IconButton from '@/app/components/common/IconButton';

/**
 * 화면 층 오류 경계(옵저버빌리티 1, Error Boundary 3층 중 가운데).
 * (private) 레이아웃(헤더, 메뉴)은 남고 본문만 바뀐다. 다른 메뉴로 바로 옮겨 갈 수 있다.
 * 운영에서는 stack 대신 digest 를 보인다. 서버 로그와 맞춰 볼 값이다.
 */
export default function PrivateError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[PrivateError]', error);
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div
      role="alert"
      className="m-6 flex flex-col items-center gap-3 rounded-lg border border-gray-200 bg-white px-6 py-16 text-center"
    >
      <i aria-hidden="true" className="ri-error-warning-line text-3xl text-red-500" />
      <p className="text-sm text-gray-800">화면을 그리는 중 오류가 발생했습니다.</p>
      <p className="text-xs text-gray-500">
        다시 시도하거나 다른 메뉴로 이동하세요.
        {error.digest && <span className="ml-1 tabular-nums">오류 ID {error.digest}</span>}
      </p>
      <IconButton
        icon="ri-refresh-line"
        label="다시 시도"
        variant="secondary"
        onClick={() => retry()}
      />
      {isDev && error.stack && (
        <pre className="mt-2 max-h-48 w-full max-w-2xl overflow-auto rounded bg-gray-100 p-3 text-left text-xs">
          {error.stack}
        </pre>
      )}
    </div>
  );
}
