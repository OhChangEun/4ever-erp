'use client';

import { LOCALE_COOKIE, type Locale } from './locale';
import { LOCALE_EVENT } from './IntlProvider';

/** 언어를 바꾼다. 쿠키에 1년 두고 provider 에 알린다(새로고침, 서버 왕복 없음) */
export const useSetLocale = () => (locale: Locale) => {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(LOCALE_EVENT));
};
