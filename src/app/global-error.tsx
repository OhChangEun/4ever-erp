'use client';

import { useEffect } from 'react';

/**
 * 루트 층 오류 경계(옵저버빌리티 1). 루트 레이아웃까지 깨졌을 때만 쓰인다.
 * 레이아웃을 대신하므로 html, body 를 직접 그리고 전역 CSS 없이도 읽히게 인라인 스타일로 둔다.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="ko">
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
          <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>예기치 않은 오류가 발생했습니다</h1>
          <p style={{ fontSize: 14, color: '#4b5563', margin: '0 0 16px' }}>
            잠시 후 다시 시도해 주세요.
            {error.digest && ` 오류 ID ${error.digest}`}
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ padding: '8px 14px', cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </main>
      </body>
    </html>
  );
}
