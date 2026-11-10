// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, readCookieLocale } from './locale';

/** 오류 경계 영어 카드 리뷰: 서버(document 없음)에서 불려도 던지지 않고 기본 언어 */
describe('readCookieLocale', () => {
  it('document 가 없으면 기본 언어(ko)', () => {
    expect(typeof document).toBe('undefined');
    expect(readCookieLocale()).toBe(DEFAULT_LOCALE);
  });
});
