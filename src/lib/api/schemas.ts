import * as z from 'zod/mini';
import type { Page } from '@/app/types/Page';
import type { Stat, StatResponse } from '@/app/types/StatType';
import type { OptionResponse } from '@/app/types/api';

/**
 * 여러 도메인이 같이 쓰는 응답 조각. 스키마는 기존 타입에 맞춰 `z.ZodMiniType<기존 타입>` 으로 묶어
 * 타입과 스키마가 어긋나면 컴파일에서 걸린다. 객체는 looseObject 라 타입에 없는 필드도 지우지 않는다
 * (Table 열이 타입 밖 필드를 읽는 곳이 있다).
 */
export const pageSchema: z.ZodMiniType<Page> = z.looseObject({
  number: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
  hasNext: z.boolean(),
});

export const statSchema: z.ZodMiniType<Stat> = z.looseObject({
  value: z.number(),
  delta_rate: z.number(),
});

/** 기간별 통계 `{ week, month, quarter, year }`. 네 기간이 다 있어야 한다 */
export const periodStatsSchema = <T>(item: z.ZodMiniType<T>): z.ZodMiniType<StatResponse<T>> =>
  z.looseObject({ week: item, month: item, quarter: item, year: item });

/** 드롭다운 옵션 응답. key 는 실제 값, value 는 표시 글자. 화면 옵션으로는 toKeyValueItems 가 바꾼다 */
export const optionResponseSchema: z.ZodMiniType<OptionResponse> = z.looseObject({
  key: z.string(),
  value: z.string(),
});

export const optionListSchema = z.array(optionResponseSchema);
