import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { toDateKey } from '@/app/utils/date';
import { shouldError, type Metric } from './utils';

/**
 * 재무 현황 목(시각화 4). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 이번 달에서 끝나는 12개월. 값은 달 순번으로 정해져 결정적이고, 다섯 번째 달은 적자다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const MONTHS = 12;
const round = (n: number) => Math.round(n / 10_000) * 10_000;

export const financeMonthlyPoints = (today = new Date()) =>
  Array.from({ length: MONTHS }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (MONTHS - 1 - i), 1);
    const sales = round(800_000_000 + ((i * 37) % 11) * 25_000_000);
    const purchases =
      i === 4 ? round(sales * 1.06) : round(sales * 0.78 + (((i * 53) % 7) - 3) * 12_000_000);
    return {
      month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      sales,
      purchases,
      netProfit: sales - purchases,
    };
  });

/**
 * 통계 띠의 금액 지표(카드 "목 데이터 현실성" 결정 2). 재무, 대시보드, 영업, 구매가 같은 월별 손익을 쓴다.
 * 월은 이번 달, 분기는 최근 3달 합, 연은 12달 합, 주는 월의 7/30
 */
export const monthlyMetric = (
  key: 'sales' | 'purchases' | 'netProfit',
  today = new Date(),
): Metric => {
  const values = financeMonthlyPoints(today).map((point) => point[key]);
  const month = values[values.length - 1];
  const sum = (list: number[]) => list.reduce((acc, value) => acc + value, 0);
  return {
    week: round((month * 7) / 30),
    month,
    quarter: sum(values.slice(-3)),
    year: sum(values),
  };
};

const AGING = [
  { bucket: 'CURRENT', amount: 182_000_000, count: 12 },
  { bucket: 'D1_30', amount: 64_500_000, count: 5 },
  { bucket: 'D31_60', amount: 28_000_000, count: 3 },
  { bucket: 'D61_90', amount: 0, count: 0 },
  { bucket: 'D90_PLUS', amount: 8_200_000, count: 1 },
] as const;

const fail = (message: string) => ({ status: 500, success: false, message }) as const;

export const financeAnalyticsHandlers = [
  http.get('/business/fcm/analytics/monthly', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(fail('Failed to load monthly finance'), { status: 500 });
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: { months: financeMonthlyPoints() },
    });
  }),
  http.get('/business/fcm/analytics/ar-aging', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(fail('Failed to load AR aging'), { status: 500 });
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: { asOf: toDateKey(new Date()), buckets: AGING.map((b) => ({ ...b })) },
    });
  }),
];
