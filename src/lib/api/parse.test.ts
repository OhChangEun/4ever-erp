import { describe, expect, it } from 'vitest';
import * as z from 'zod/mini';
import { isAppError } from '@/lib/AppError';
import { parseData } from './parse';
import { pageSchema, periodStatsSchema, statSchema } from './schemas';

describe('응답 파싱', () => {
  const schema = z.looseObject({ id: z.string(), qty: z.number() });

  it('맞으면 값을 돌려주고 모르는 필드는 남긴다', () => {
    expect(parseData(schema, { id: 'a', qty: 1, extra: true }, '/x')).toEqual({
      id: 'a',
      qty: 1,
      extra: true,
    });
  });

  it('틀리면 invalidShape AppError 로 올리고 어느 필드인지 적는다', () => {
    try {
      parseData(schema, { id: 'a', qty: '1' }, '/x');
      expect.unreachable();
    } catch (error) {
      expect(isAppError(error) && error.kind).toBe('invalidShape');
      expect(error instanceof Error && error.message).toContain('qty');
    }
  });

  it('공통 스키마: 페이지와 기간별 통계', () => {
    expect(
      pageSchema.safeParse({ number: 0, size: 10, totalElements: 0, totalPages: 0, hasNext: false })
        .success,
    ).toBe(true);
    const stats = periodStatsSchema(z.object({ amount: statSchema }));
    const one = { amount: { value: 1, delta_rate: 0.1 } };
    expect(stats.safeParse({ week: one, month: one, quarter: one, year: one }).success).toBe(true);
    expect(stats.safeParse({ week: one }).success).toBe(false);
  });
});
