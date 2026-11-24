import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { monthStart, mondayOf, orderTotals, seedOrders, todayKey } from './seed';
import { shouldError, type Metric } from './utils';

/**
 * 재무 현황 목(시각화 4). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 이번 달(UTC)에서 끝나는 12개월. 매출은 영업 기본 주문(`seed.ts` 의 `seedOrders`)의 그 달 합이라 영업 통계,
 * 매출 분석과 같은 값이다(카드 "데모 데이터 채우기" 결정 6). 이번 달은 오늘까지의 합. 매입은 매출의 비율이고 비율은 몇 월인지로
 * 정해(`monthIndex`) 마감한 달의 값이 안 바뀐다. 4월은 적자다
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const MONTHS = 12;
const round = (n: number) => Math.round(n / 10_000) * 10_000;

/** 12월 0, 1월 1, ..., 11월 11. 매입 비율과 매입 전표 품목을 정하는 순번 */
export const monthIndex = (month: string) => Number(month.slice(5, 7)) % 12;

export const financeMonthlyPoints = (today = todayKey()) => {
  const orders = seedOrders(today).map(({ order }) => order);
  return Array.from({ length: MONTHS }, (_, k) => {
    const month = monthStart(today, MONTHS - 1 - k).slice(0, 7);
    const i = monthIndex(month);
    const sales = orderTotals(orders, `${month}-01`, `${month}-31`).amount;
    // 매입은 매출의 75~84%(달마다 다르게), 4월만 106%
    const purchases = round(sales * (i === 4 ? 1.06 : 0.78 + (((i * 53) % 7) - 3) * 0.015));
    return { month, sales, purchases, netProfit: sales - purchases };
  });
};

/**
 * 통계 띠의 금액 지표(카드 "목 데이터 현실성" 결정 2). 재무, 대시보드, 영업, 구매가 같은 월별 손익을 쓴다.
 * 월은 이번 달, 분기는 최근 3달 합, 연은 12달 합. 주는 매출이면 이번 주(월요일~오늘) 주문 합(영업 통계와 같다),
 * 매입과 순이익은 월의 7/30
 */
export const monthlyMetric = (
  key: 'sales' | 'purchases' | 'netProfit',
  today = todayKey(),
): Metric => {
  const values = financeMonthlyPoints(today).map((point) => point[key]);
  const month = values[values.length - 1];
  const sum = (list: number[]) => list.reduce((acc, value) => acc + value, 0);
  const week =
    key === 'sales'
      ? orderTotals(
          seedOrders(today).map(({ order }) => order),
          mondayOf(today),
          today,
        ).amount
      : round((month * 7) / 30);
  return {
    week,
    month,
    quarter: sum(values.slice(-3)),
    year: sum(values),
  };
};

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
];
