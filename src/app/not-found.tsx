'use client';

import { useTranslations } from 'next-intl';

/**
 * 없는 주소의 화면. 루트 레이아웃의 IntlProvider 안이라 next-intl 로 글자를 꺼낸다(서버는 한국어로 그리고 브라우저가 쿠키 언어로 바꾼다).
 * 대시보드 링크는 로그인 전이면 프록시가 로그인으로 보낸다. next/link 를 쓰면 모든 화면 첫 로드가 3.9KB 는다(루트 청크에
 * 링크 코드가 한 벌 더 실린다). 없는 주소에서 나가는 길이라 전체 페이지 이동으로 둔다.
 */
export default function NotFound() {
  const t = useTranslations('notFound');
  return (
    <main className="flex flex-col items-center justify-center h-screen px-4 text-center bg-white">
      <p className="text-sm font-medium text-gray-500 tabular-nums">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-gray-900">{t('title')}</h1>
      <p className="mt-3 text-sm text-gray-600">{t('description')}</p>
      <a href="/dashboard" className="mt-6 text-sm font-medium text-blue-600 hover:underline">
        {t('home')}
      </a>
    </main>
  );
}
