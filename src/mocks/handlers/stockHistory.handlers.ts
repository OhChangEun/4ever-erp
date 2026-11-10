import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { addDays, startOfDay, toDateKey } from '@/app/utils/date';
import { shouldError } from './utils';

/**
 * 품목 재고 추이 목(시각화 2). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 상세 목(현재고 120, 안전재고 50)과 맞게, 하루 5 개씩 줄어 오늘 120 에서 끝난다. 값은 결정적이다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const DAYS = 30;
const CURRENT = 120;
const SAFETY = 50;
const DAILY_DROP = 5;

export const stockHistoryPoints = () => {
  const today = startOfDay(new Date());
  return Array.from({ length: DAYS }, (_, i) => {
    const daysAgo = DAYS - 1 - i;
    // 입고가 있던 날처럼 보이게 3일마다 조금 흔든다(평균 기울기는 그대로)
    const wobble = daysAgo === 0 ? 0 : ((i % 3) - 1) * 2;
    return {
      date: toDateKey(addDays(today, -daysAgo)),
      stock: CURRENT + daysAgo * DAILY_DROP + wobble,
    };
  });
};

export const stockHistoryHandlers = [
  http.get('/scm-pp/iv/items/{itemId}/stock-history', ({ request, params, response }) => {
    if (shouldError(request))
      return response('default').json(
        { status: 500, success: false, message: 'Failed to load stock history' },
        { status: 500 },
      );
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: {
        itemId: params.itemId,
        uomName: 'EA',
        safetyStock: SAFETY,
        points: stockHistoryPoints(),
      },
    });
  }),
];
