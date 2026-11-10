/**
 * 지원 언어와 쿠키(i18n 1 카드, 결정 30). URL 에 언어를 넣지 않는다(/en/dashboard 같은 라우팅 없음).
 * ERP 는 로그인 뒤 화면이라 검색 노출이 필요 없고, 경로 규칙(인가 표, proxy matcher)을 바꾸지 않으려고.
 */
export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && LOCALES.some((locale) => locale === value);

/** 브라우저 쿠키에서 언어를 읽는다. 없거나 지원하지 않는 값이면 기본 언어. 서버(document 없음)에서 불려도 기본 언어 */
export const readCookieLocale = (): Locale => {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const saved = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.slice(LOCALE_COOKIE.length + 1);
  return isLocale(saved) ? saved : DEFAULT_LOCALE;
};
