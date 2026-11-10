import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { shouldError } from './utils';

/**
 * 이번 달 자재 흐름 목(시각화 6). 새 핸들러라 openapi-msw 로 쓴다(결정 기록 OpenAPI 계약 2).
 * 재고 노드는 들어온 것(입고 + 기초 재고)과 나간 것(생산 투입 + 출하 + 남은 재고)이 같다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const M = 1_000_000;

export const supplyFlowData = (today = new Date()) => ({
  period: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  nodes: [
    { id: 'pr', name: '구매요청', kind: 'flow' as const },
    { id: 'rejected', name: '반려', kind: 'drop' as const },
    { id: 'po', name: '발주', kind: 'flow' as const },
    { id: 'waiting', name: '입고 대기', kind: 'drop' as const },
    { id: 'gr', name: '입고', kind: 'flow' as const },
    { id: 'opening', name: '기초 재고', kind: 'flow' as const },
    { id: 'stock', name: '재고', kind: 'flow' as const },
    { id: 'production', name: '생산 투입', kind: 'flow' as const },
    { id: 'shipment', name: '출하', kind: 'flow' as const },
    { id: 'closing', name: '남은 재고', kind: 'flow' as const },
  ],
  links: [
    { source: 'pr', target: 'po', value: 820 * M },
    { source: 'pr', target: 'rejected', value: 60 * M },
    { source: 'po', target: 'gr', value: 700 * M },
    { source: 'po', target: 'waiting', value: 120 * M },
    { source: 'gr', target: 'stock', value: 700 * M },
    { source: 'opening', target: 'stock', value: 300 * M },
    { source: 'stock', target: 'production', value: 520 * M },
    { source: 'stock', target: 'shipment', value: 380 * M },
    { source: 'stock', target: 'closing', value: 100 * M },
  ],
});

export const supplyFlowHandlers = [
  http.get('/dashboard/supply-flow', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(
        { status: 500, success: false, message: 'Failed to load supply flow' },
        { status: 500 },
      );
    return response(200).json({
      status: 200,
      success: true,
      message: 'OK',
      data: supplyFlowData(),
    });
  }),
];
