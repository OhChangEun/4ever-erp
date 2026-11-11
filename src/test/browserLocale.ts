import { vi } from 'vitest';

/**
 * 브라우저 언어를 흉내 낸다. 언어 인자 없이(또는 빈 배열로) 부른 숫자와 시각 형식만 `browser` 언어를 쓴다.
 * jsdom 과 Node 는 navigator 가 아니라 프로세스 ICU 기본값을 따라 직접 바꾼다. 끝나면 vi.restoreAllMocks()
 */
export const mockBrowserLocale = (browser: string) => {
  const toNumber = Number.prototype.toLocaleString;
  const toTime = Date.prototype.toLocaleTimeString;
  const pick = (locales?: Intl.LocalesArgument): Intl.LocalesArgument =>
    locales === undefined || (Array.isArray(locales) && locales.length === 0) ? browser : locales;
  vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
    this: number,
    locales?: Intl.LocalesArgument,
    options?: Intl.NumberFormatOptions,
  ) {
    return toNumber.call(this, pick(locales), options);
  });
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function (
    this: Date,
    locales?: Intl.LocalesArgument,
    options?: Intl.DateTimeFormatOptions,
  ) {
    return toTime.call(this, pick(locales), options);
  });
};
