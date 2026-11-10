'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconButton } from '@everp/ui';
import { Flex } from '@everp/ui';

/** 앱 층 오류 경계. (private) 밖(로그인 등)에서 깨지면 여기로 온다. 운영에서는 stack 대신 digest(옵저버빌리티 1) */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
}) {
  const router = useRouter();
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // 외부 수집(Sentry)을 붙이면 여기서 captureException
    console.error('[AppError]', error);
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') return retry();
    return router.push('/');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        `${error.message}\n\n${isDev ? (error.stack ?? '') : `오류 ID ${error.digest ?? '-'}`}`,
      );
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-md p-12">
        <Flex direction="col" align="center" gap={4}>
          <div className="text-red-500 text-5xl">
            <i className="ri-error-warning-line" />
          </div>

          <h1 className="text-2xl font-semibold">예기치 않은 오류가 발생했습니다</h1>

          <p className="text-sm text-gray-600 text-center">
            {error.message || '알 수 없는 오류가 발생했습니다.'}
          </p>

          <div className="w-full flex items-center justify-center gap-3 mt-4">
            <IconButton
              icon="ri-refresh-line"
              label="다시 시도"
              variant="secondary"
              onClick={handleRetry}
            />
            <IconButton
              icon="ri-home-4-line"
              label="홈으로"
              variant="primary"
              onClick={() => router.push('/')}
            />
          </div>

          <div className="w-full mt-3">
            <Flex direction="row" align="center" justify="end" gap={2} className="mb-2">
              {copyStatus === 'success' && (
                <span className="text-xs text-green-600">복사 완료</span>
              )}
              {copyStatus === 'error' && <span className="text-xs text-red-600">복사 실패</span>}
              <IconButton
                icon="ri-file-copy-line"
                label="복사"
                variant="ghost"
                size="sm"
                onClick={() => void handleCopy()}
                aria-label="오류 내용 복사"
              />
            </Flex>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48 text-left">
              {isDev ? error.stack : `오류 ID ${error.digest ?? '-'}`}
            </pre>
          </div>
        </Flex>
      </div>
    </div>
  );
}
