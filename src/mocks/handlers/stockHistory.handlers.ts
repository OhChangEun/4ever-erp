import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { MOTOR, catalogItem } from './catalog';
import { addDays, todayKey } from './seed';
import { changeAfter, inventoryState, stockOf } from './stock';
import { shouldError } from './utils';

/**
 * 품목 재고 추이 목(시각화 2). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 재고 상세 목과 같은 품목의 지금 현재고에서 끝난다(모르는 id 는 모터 A). 하루 5 개씩 쓰고 그날의 재고 이동 기록을 더해
 * 오늘에 닿는다(카드 "품목 선택과 이동 내역"). 날짜는 이동 기록과 같은 한국 날짜다. 값은 결정적이다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const DAYS = 30;
const DAILY_DROP = 5;

const stockHistoryPoints = (
  current: number,
  from: string,
  changeAfter: (date: string) => number,
) => {
  const today = todayKey();
  return Array.from({ length: DAYS }, (_, i) => {
    const date = addDays(today, i - (DAYS - 1));
    // 사용량은 그 로그인의 첫날에서 거슬러 센다. 오늘에서 세면 자정마다 지난 날의 재고가 바뀐다
    const daysAgo = Math.max(0, (Date.parse(from) - Date.parse(date)) / 86_400_000);
    // 날마다 사용량을 조금 흔든다(평균 기울기는 그대로)
    const wobble = daysAgo === 0 ? 0 : (((((DAYS - 1 - daysAgo) % 3) + 3) % 3) - 1) * 2;
    // 그날 끝의 재고. 그 뒤의 이동은 아직 없던 일이라 되돌린다
    return { date, stock: current + daysAgo * DAILY_DROP + wobble - changeAfter(date) };
  });
};

export const stockHistoryHandlers = [
  http.get('/scm-pp/iv/items/{itemId}/stock-history', ({ request, params, response }) => {
    if (shouldError(request))
      return response('default').json(
        { status: 500, success: false, message: 'Failed to load stock history' },
        { status: 500 },
      );
    const stock = stockOf(
      request,
      catalogItem(params.itemId) ?? { ...MOTOR, itemId: params.itemId },
    );
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: {
        itemId: params.itemId,
        uomName: 'EA',
        safetyStock: stock.safetyStock,
        points: stockHistoryPoints(stock.currentStock, inventoryState(request).movesFrom, (date) =>
          changeAfter(request, params.itemId, date),
        ),
      },
    });
  }),
];
