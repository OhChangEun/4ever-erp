import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { addMonths, formatDate, parseDateKey, toDateKey } from './date';

beforeAll(() => vi.stubEnv('TZ', 'Asia/Seoul'));
afterAll(() => vi.unstubAllEnvs());

describe('현지 날짜 도구', () => {
  it('한국 시간 자정 날짜가 전날이 되지 않는다(예전 toISOString 결함)', () => {
    expect(formatDate(new Date(2026, 10, 10))).toBe('2026-11-10');
    expect(toDateKey(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });

  it('YYYY-MM-DD 를 현지 자정으로 읽고, 형식이 틀리면 null', () => {
    const date = parseDateKey('2026-11-10');
    expect(date?.getDate()).toBe(10);
    expect(date?.getHours()).toBe(0);
    expect(parseDateKey('2026/11/10')).toBeNull();
    expect(parseDateKey('')).toBeNull();
  });

  it('달을 옮길 때 말일을 넘지 않는다', () => {
    expect(toDateKey(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(toDateKey(addMonths(new Date(2026, 2, 15), -1))).toBe('2026-02-15');
  });
});
