'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import ko from './messages/ko.json';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './locale';

type Messages = typeof ko;

/** 한국어는 기본이라 같이 싣고, 다른 언어는 고를 때만 받는다(첫 로드 JS 를 늘리지 않게) */
const LOADERS: Record<Exclude<Locale, 'ko'>, () => Promise<{ default: Messages }>> = {
  en: () => import('./messages/en.json'),
};

export const LOCALE_EVENT = 'everp:locale';

const readCookieLocale = (): Locale => {
  const saved = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(LOCALE_EVENT, onChange);
  return () => window.removeEventListener(LOCALE_EVENT, onChange);
};

/**
 * 언어 provider(i18n 1 카드). 서버는 늘 한국어로 그린다. 루트 레이아웃이 쿠키를 읽으면
 * 모든 페이지가 정적(○)에서 매 요청 동적(ƒ) 렌더로 바뀌어서다(결정 2).
 * 브라우저는 하이드레이션 뒤 쿠키를 보고, 영어면 메시지를 받아 바꾼다. 비공개 화면은 로그인 확인 전까지
 * 아무것도 그리지 않아(PrivateGuard) 한국어가 잠깐 보이지 않는다. 로그인 화면만 잠깐 보일 수 있다.
 */
export default function IntlProvider({ children }: { children: ReactNode }) {
  const wanted = useSyncExternalStore(subscribe, readCookieLocale, () => DEFAULT_LOCALE);
  const [loaded, setLoaded] = useState<Partial<Record<Locale, Messages>>>({ ko });

  useEffect(() => {
    if (wanted === 'ko' || loaded[wanted]) return;
    let cancelled = false;
    void LOADERS[wanted]().then((module) => {
      if (!cancelled) setLoaded((prev) => ({ ...prev, [wanted]: module.default }));
    });
    return () => {
      cancelled = true;
    };
  }, [wanted, loaded]);

  // 메시지를 받기 전에는 한국어 그대로(빈 글자를 보이지 않는다)
  const messages = loaded[wanted];
  const locale: Locale = messages ? wanted : DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages ?? ko} timeZone="Asia/Seoul">
      {children}
    </NextIntlClientProvider>
  );
}
