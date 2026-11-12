import { createOpenApiHttp } from 'openapi-msw';
import type { paths } from '@/lib/api/openapi.gen';
import type { Schema } from '@/lib/api/contract';
import { API_BASE_URL } from '@/app/types/api';
import { mockState } from '../state';
import { makePage, shouldError, stat, trendStat } from './utils';

/**
 * 창고 목. OpenAPI 계약(`openapi/everp.yaml`)에 묶인 `http` 로 쓴다(OpenAPI 계약 1 카드).
 * 계약에 없는 경로, 틀린 응답 모양, 틀린 상태 코드는 tsc 가 막는다.
 */
const http = createOpenApiHttp<paths>({ baseUrl: API_BASE_URL });

const OK = { status: 200, success: true, message: 'OK' } as const;

const failure = (message: string) => ({ status: 500, success: false, message }) as const;

type WarehouseRow = Schema<'WarehouseListItem'>;
type WarehouseEdit = Schema<'EditWarehouseRequest'>;

/**
 * 창고 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 창고 수정은 화면이 응답 전에 목록 카드를 바꾼다(낙관적). 목이 안 따르면 다시 가져올 때 원래 값으로 돌아간다.
 */
const warehouseState = mockState<{ created: WarehouseRow[]; edits: Map<string, WarehouseEdit> }>(
  () => ({ created: [], edits: new Map() }),
);

const MANAGER = {
  managerId: 'mgr-001',
  managerName: '이자재',
  managerPhone: '010-2222-3333',
  managerEmail: 'manager@everp.co.kr',
};

const SEED_WAREHOUSE: WarehouseRow = {
  warehouseId: 'wh-001',
  warehouseNumber: 'WH-001',
  warehouseName: '1공장 창고',
  statusCode: 'ACTIVE',
  warehouseType: 'RAW',
  location: '서울 강서구',
  manager: MANAGER.managerName,
  managerPhone: MANAGER.managerPhone,
};

/** 수정 요청이 바꾸는 네 필드. 담당자는 목에 한 명뿐이라 그대로다 */
const editedFields = (edit: WarehouseEdit | undefined) =>
  edit && {
    warehouseName: edit.warehouseName,
    warehouseType: edit.warehouseType,
    location: edit.location,
    statusCode: edit.warehouseStatusCode,
  };

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
    const state = warehouseState(request);
    const content = [SEED_WAREHOUSE, ...state.created].map((row) => ({
      ...row,
      ...editedFields(state.edits.get(row.warehouseId)),
    }));
    return response(200).json({
      ...OK,
      data: { content, page: makePage(page, size, content.length) },
    });
  }),
  http.get('/scm-pp/iv/warehouses/{warehouseId}', ({ request, params, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse detail'), { status: 500 });
    const edit = warehouseState(request).edits.get(params.warehouseId);
    return response(200).json({
      ...OK,
      data: {
        warehouseInfo: {
          warehouseName: '1공장 창고',
          warehouseNumber: 'WH-001',
          warehouseType: 'RAW',
          statusCode: 'ACTIVE',
          location: '서울 강서구',
          description: edit?.note ?? '주 원자재 보관',
          ...editedFields(edit),
        },
        manager: {
          managerId: MANAGER.managerId,
          managerName: MANAGER.managerName,
          managerPhoneNumber: MANAGER.managerPhone,
          managerEmail: MANAGER.managerEmail,
        },
      },
    });
  }),
  http.post('/scm-pp/iv/warehouses', async ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to add warehouse'), { status: 500 });
    const { created } = warehouseState(request);
    const body = await request.json();
    const serial = String(created.length + 2).padStart(3, '0');
    created.push({
      ...SEED_WAREHOUSE,
      warehouseId: `wh-${serial}`,
      warehouseNumber: `WH-${serial}`,
      warehouseName: body.warehouseName,
      warehouseType: body.warehouseType,
      location: body.location,
    });
    return response(200).json(OK);
  }),
  http.get('/scm-pp/iv/warehouses/managers/toggle', ({ request, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to load warehouse managers'), {
        status: 500,
      });
    return response(200).json({
      ...OK,
      data: [MANAGER],
    });
  }),
  http.put('/scm-pp/iv/warehouses/{warehouseId}', async ({ request, params, response }) => {
    if (shouldError(request))
      return response('default').json(failure('Failed to update warehouse'), { status: 500 });
    warehouseState(request).edits.set(params.warehouseId, await request.json());
    return response(200).json(OK);
  }),
];
