import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import { API_BASE_URL } from '@/app/types/api';
import { makePage, shouldError, stat, trendStat } from './utils';

/**
 * 창고 목. OpenAPI 계약(`openapi/everp.yaml`)에 묶인 `http` 로 쓴다(OpenAPI 계약 1 카드).
 * 계약에 없는 경로, 틀린 응답 모양, 틀린 상태 코드는 tsc 가 막는다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const OK = { status: 200, success: true, message: 'OK' } as const;

const failure = (message: string) => ({ status: 500, success: false, message }) as const;

export const warehouseHandlers = [
  http.get('/scm-pp/iv/warehouses/statistic', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse stats'), { status: 500 });
    // openapi-msw 가 지표 이름까지 확인하므로 지표를 하나씩 만든다
    const period = (p: 'week' | 'month' | 'quarter' | 'year') => ({
      total_warehouse: trendStat(p, 'total_warehouse', stat),
      in_operation_warehouse: trendStat(p, 'in_operation_warehouse', stat),
    });
    return response(200).json({
      ...OK,
      data: {
        week: period('week'),
        month: period('month'),
        quarter: period('quarter'),
        year: period('year'),
      },
    });
  }),
  http.get('/scm-pp/iv/warehouses', ({ request, query, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse list'), { status: 500 });
    const page = Number(query.get('page') ?? 0);
    const size = Number(query.get('size') ?? 10);
    return response(200).json({
      ...OK,
      data: {
        content: [
          {
            warehouseId: 'wh-001',
            warehouseNumber: 'WH-001',
            warehouseName: '1공장 창고',
            statusCode: 'ACTIVE',
            warehouseType: 'RAW',
            location: '서울 강서구',
            manager: '이자재',
            managerPhone: '010-2222-3333',
          },
        ],
        page: makePage(page, size, 1),
      },
    });
  }),
  http.get('/scm-pp/iv/warehouses/{warehouseId}', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse detail'), { status: 500 });
    return response(200).json({
      ...OK,
      data: {
        warehouseInfo: {
          warehouseName: '1공장 창고',
          warehouseNumber: 'WH-001',
          warehouseType: 'RAW',
          statusCode: 'ACTIVE',
          location: '서울 강서구',
          description: '주 원자재 보관',
        },
        manager: {
          managerId: 'mgr-001',
          managerName: '이자재',
          managerPhoneNumber: '010-2222-3333',
          managerEmail: 'manager@everp.co.kr',
        },
      },
    });
  }),
  http.post('/scm-pp/iv/warehouses', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to add warehouse'), { status: 500 });
    return response(200).json(OK);
  }),
  http.get('/scm-pp/iv/warehouses/managers/toggle', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse managers'), {
        status: 500,
      });
    return response(200).json({
      ...OK,
      data: [
        {
          managerEmail: 'manager@everp.co.kr',
          managerId: 'mgr-001',
          managerName: '이자재',
          managerPhone: '010-2222-3333',
        },
      ],
    });
  }),
  http.put('/scm-pp/iv/warehouses/{warehouseId}', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to update warehouse'), { status: 500 });
    return response(200).json(OK);
  }),
];
