'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { IconButton } from '@everp/ui';
import { Flex } from '@everp/ui';
import { devErrorDetail } from '@/lib/devErrorDetail';

/**
 * 앱 층 오류 경계. (private) 밖(로그인 등)에서 깨지면 여기로 온다. 운영에서는 stack 대신 digest(옵저버빌리티 1).
 * 화면과 복사 내용에는 번역 문구와 오류 ID 만 둔다. `error.message` 는 렌더 중 내부 문구(속성 이름, 서버 내부 메시지)라
 * 사용자에게 보이지 않고 언어도 따르지 않는다(AppError 카드 결과 3 과 같은 기준). 원문은 아래 console.error 로만 남긴다.
 */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations('errorBoundary');
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

  // 개발 모드만 원인 문구와 stack 을 보이고 복사한다. 개발자 자기 화면이라 원인을 바로 봐야 해서다
  const errorId = t('errorId', { digest: error.digest ?? '-' });
  const detail = isDev ? devErrorDetail(error) : errorId;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(detail);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 3000);
    } catch {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-xl w-full bg-white rounded-lg border border-gray-200 p-12">
        <Flex direction="col" align="center" gap={4}>
          <div className="text-red-500 text-5xl">
            <i className="ri-error-warning-line" />
          </div>

          <h1 className="text-2xl font-semibold">{t('title')}</h1>

          <p className="text-sm text-gray-600 text-center">{t('unknown')}</p>

          <div className="w-full flex items-center justify-center gap-3 mt-4">
            <IconButton
              icon="ri-refresh-line"
              label={t('retry')}
              variant="secondary"
              onClick={handleRetry}
            />
            <IconButton
              icon="ri-home-4-line"
              label={t('home')}
              variant="primary"
              onClick={() => router.push('/')}
            />
          </div>

          <div className="w-full mt-3">
            <Flex direction="row" align="center" justify="end" gap={2} className="mb-2">
              {copyStatus === 'success' && (
                <span className="text-xs text-green-600">{t('copied')}</span>
              )}
              {copyStatus === 'error' && (
                <span className="text-xs text-red-600">{t('copyFailed')}</span>
              )}
              <IconButton
                icon="ri-file-copy-line"
                label={t('copy')}
                variant="ghost"
                size="sm"
                onClick={() => void handleCopy()}
                aria-label={t('copyLabel')}
              />
            </Flex>
            <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-48 text-left">
              {detail}
            </pre>
          </div>
        </Flex>
      </div>
    </div>
  );
}
