'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, readCookieLocale, type Locale } from '@/i18n/locale';

/**
 * 이 화면의 글자(오류 경계 영어 카드). 루트 레이아웃을 대신해 언어 provider(next-intl)가 없다.
 * 메시지 파일(en.json 전체)을 싣지 않고 여기 둔다. 모든 화면이 받는 파일이라 첫 로드 JS 를 늘리지 않고,
 * 네트워크가 끊겨도 영어 글자를 받으러 가지 않는다.
 */
const TEXT: Record<Locale, { title: string; hint: string; errorId: string; retry: string }> = {
  ko: {
    title: '예기치 않은 오류가 발생했습니다',
    hint: '잠시 후 다시 시도해 주세요.',
    errorId: '오류 ID',
    retry: '다시 시도',
  },
  en: {
    title: 'An unexpected error occurred',
    hint: 'Please try again in a moment.',
    errorId: 'Error ID',
    retry: 'Try again',
  },
};

// 이 화면이 떠 있는 동안 언어를 바꿀 곳이 없어 구독할 것이 없다
const subscribeNothing = () => () => {};

/**
 * 루트 층 오류 경계(옵저버빌리티 1). 루트 레이아웃까지 깨졌을 때만 쓰인다.
 * 레이아웃을 대신하므로 html, body 를 직접 그리고 전역 CSS 없이도 읽히게 인라인 스타일로 둔다.
 * 서버에서 그려질 때는 한국어, 브라우저는 쿠키를 읽는다(IntlProvider 와 같은 방식이라 하이드레이션이 어긋나지 않는다).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useSyncExternalStore(subscribeNothing, readCookieLocale, () => DEFAULT_LOCALE);
  const text = TEXT[locale];

  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang={locale}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <main
          role="alert"
          style={{
            maxWidth: 480,
            margin: '15vh auto',
            padding: 32,
            background: '#fff',
            borderRadius: 12,
          }}
        >
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>{text.title}</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 16px' }}>
            {text.hint}
            {error.digest && ` ${text.errorId} ${error.digest}`}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ padding: '8px 14px', cursor: 'pointer' }}
          >
            {text.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
