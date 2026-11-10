import { describe, expect, it } from 'vitest';
import { getResponse, http, HttpResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import { server } from '@/test/msw-server';
import { isAppError } from '@/lib/AppError';
import {
  DASHBOARD_ENDPOINTS,
  FINANCE_ENDPOINTS,
  INVENTORY_ENDPOINTS,
  WAREHOUSE_ENDPOINTS,
} from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import * as dashboard from '@/app/(private)/dashboard/dashboard.api';
import * as finance from '@/app/(private)/finance/finance.api';
import * as hrm from '@/app/(private)/hrm/api/hrm.api';
import * as inventory from '@/app/(private)/inventory/inventory.api';
import * as warehouse from '@/app/(private)/warehouse/warehouse.api';
import { useMockSource, type MockSource } from './serverMock';
import { collectFailures } from './collect';

/**
 * 타입 4차 카드. 대시보드, 재무, 인사, 재고, 창고에서 화면이 null 가드를 두던 GET 읽기만 스키마로 확인한다.
 * 가드를 지운 자리는 이 검증이 대신 막는다. 가드가 지키던 필드가 비면 형식 오류로 올라와야 한다.
 */

type Path = (string | number)[];

interface GuardedRead {
  url: string;
  read: () => Promise<unknown>;
  /** 화면이 가드를 두던 필드. 이 값을 null 로 바꾸면 형식 오류여야 한다 */
  guarded: Path;
}

const ID = 'id-1';

const READS: Record<string, GuardedRead> = {
  '대시보드 워크플로우': {
    url: DASHBOARD_ENDPOINTS.WORKFLOW_STATUS,
    read: () => dashboard.getWorkflowStatus(),
    guarded: ['tabs', 0, 'items'],
  },
  '재무 고객사 통계': {
    url: FINANCE_ENDPOINTS.CUSTOMER_STATISTICS,
    read: () => finance.getCustomerStats(),
    guarded: ['month'],
  },
  '재무 공급사 통계': {
    url: FINANCE_ENDPOINTS.SUPPLIER_STATISTICS,
    read: () => finance.getSupplierStats(),
    guarded: ['month'],
  },
  '매출 전표 상세': {
    url: FINANCE_ENDPOINTS.SALES_INVOICE_DETAIL(ID),
    read: () => finance.getSalesInvoiceDetail(ID),
    guarded: ['items', 0],
  },
  '매입 전표 상세': {
    url: FINANCE_ENDPOINTS.PURCHASE_INVOICE_DETAIL(ID),
    read: () => finance.getPurchaseInvoiceDetail(ID),
    guarded: ['items', 0],
  },
  '부서 목록': {
    url: HRM_ENDPOINTS.DEPARTMENTS,
    read: () => hrm.fetchDepartmentsList(),
    guarded: ['content', 0, 'employees'],
  },
  '급여 상세': {
    url: HRM_ENDPOINTS.PAYROLL_DETAIL(ID),
    read: () => hrm.fetchPayRollDetail(ID),
    guarded: ['pay', 'basePayItem'],
  },
  '교육 프로그램 상세': {
    url: HRM_ENDPOINTS.PROGRAM_DETAIL(ID),
    read: () => hrm.fetchProgramDetail(ID),
    guarded: ['designatedEmployee'],
  },
  '출퇴근 목록': {
    url: HRM_ENDPOINTS.TIME_RECORD,
    read: () => hrm.fetchAttendanceList({ date: '2026-11-10', page: 0, size: 10 }),
    guarded: ['content', 0, 'employee'],
  },
  '교육 현황 목록': {
    url: HRM_ENDPOINTS.TRAINING_STATUS,
    read: () => hrm.fetchTrainingList({ page: 0, size: 10 }),
    guarded: ['items', 0, 'lastTrainingDate'],
  },
  '재고 추가 품목': {
    url: INVENTORY_ENDPOINTS.ITEM_TOGGLE,
    read: () => inventory.getItemInfo(),
    guarded: [0, 'unitPrice'],
  },
  '재고 상세': {
    url: INVENTORY_ENDPOINTS.INVENTORY_DETAIL(ID),
    read: () => inventory.getInventoryDetail(ID),
    guarded: ['lastModified'],
  },
  '재고 목록': {
    url: INVENTORY_ENDPOINTS.INVENTORY_LIST,
    read: () => inventory.getInventoryList({ page: 0, size: 10 }),
    guarded: ['content', 0, 'warehouseName'],
  },
  '창고 상세': {
    url: WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL(ID),
    read: () => warehouse.getWarehouseDetail(ID),
    guarded: ['warehouseInfo', 'description'],
  },
  '창고 담당자 목록': {
    url: WAREHOUSE_ENDPOINTS.WAREHOUSE_MANAGER_INFO,
    read: () => warehouse.getWarehouseManagerInfo(),
    guarded: [0, 'managerId'],
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** MSW 핸들러가 주는 응답 data 를 그대로 꺼낸다 */
const mockData = async (url: string): Promise<unknown> => {
  const origin = 'http://localhost';
  const response = await getResponse(handlers, new Request(new URL(url, origin)), {
    baseUrl: origin,
  });
  if (!response) throw new Error(`목 핸들러 없음: ${url}`);
  const body: unknown = await response.json();
  if (!isRecord(body)) throw new Error(`응답 래퍼가 아님: ${url}`);
  return body.data;
};

/** path 위치의 값을 null 로 바꾼다. 경로가 목에 없으면 테스트가 잘못된 것이라 바로 실패시킨다 */
const nullAt = (root: unknown, path: Path): void => {
  let node = root;
  for (const key of path.slice(0, -1)) {
    if (!isRecord(node)) throw new Error(`목에 ${path.join('.')} 경로가 없다`);
    node = node[String(key)];
  }
  const last = path.at(-1);
  if (!isRecord(node) || last === undefined || !(String(last) in node)) {
    throw new Error(`목에 ${path.join('.')} 경로가 없다`);
  }
  node[String(last)] = null;
};

const SOURCES: MockSource[] = ['msw', 'server'];

describe.each(SOURCES)('가드를 지운 읽기의 계약 (%s 목)', (source) => {
  it('목 응답이 스키마를 지킨다', async () => {
    useMockSource(source);
    const failures = await collectFailures(
      Object.fromEntries(Object.entries(READS).map(([name, { read }]) => [name, read])),
    );
    expect(failures).toEqual([]);
  });
});

describe('가드가 지키던 필드가 비면 형식 오류', () => {
  it.each(Object.entries(READS))('%s', async (_, { url, read, guarded }) => {
    const data = await mockData(url);
    nullAt(data, guarded);
    server.use(
      http.get(url, () => HttpResponse.json({ status: 200, success: true, message: 'OK', data })),
    );

    const error: unknown = await read().then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(isAppError(error) && error.kind).toBe('invalidShape');
    expect(error instanceof Error && error.message).toContain(guarded.join('.'));
  });
});
