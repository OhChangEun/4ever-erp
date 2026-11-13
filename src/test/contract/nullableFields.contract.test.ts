import { describe, expect, it } from 'vitest';
import { isAppError } from '@/lib/AppError';
import { INVENTORY_ENDPOINTS, SALES_ENDPOINTS, WAREHOUSE_ENDPOINTS } from '@/app/types/api';
import { HRM_ENDPOINTS } from '@/app/(private)/hrm/api/hrm.endpoints';
import { PRODUCTION_ENDPOINTS } from '@/app/(private)/production/api/production.endpoints';
import * as production from '@/app/(private)/production/api/production.api';
import * as sales from '@/app/(private)/sales/sales.api';
import * as hrm from '@/app/(private)/hrm/api/hrm.api';
import * as inventory from '@/app/(private)/inventory/inventory.api';
import * as warehouse from '@/app/(private)/warehouse/warehouse.api';
import { dropAt, nullAt, serveEdited, type Path } from './mockData';

/**
 * 응답 null 허용 카드. zod 를 붙이기 전 화면이 null 가드(`?? '-'`, `|| '-'`, `?.`)를 두던 글자 필드는
 * null 이 오거나 키가 없어도 읽기가 성공해야 한다(필드 하나 때문에 화면 전체가 형식 오류가 되지 않게).
 * 같은 읽기의 ID 는 그대로 엄격해서, 빠지면 형식 오류다.
 */

interface NullableRead {
  url: string;
  read: () => Promise<unknown>;
  /** null 을 받기로 한 필드 */
  nullable: Path[];
  /** 빠지면 형식 오류여야 하는 ID */
  id: Path;
}

// 상세는 목록 기본 행의 id 로 부른다. 목록에 없는 id 는 404 다(카드 "없는 건은 404")

const READS: Record<string, NullableRead> = {
  'MES 상세': {
    url: PRODUCTION_ENDPOINTS.MES_WORK_ORDER_DETAIL('mes-001'),
    read: () => production.fetchMesDetail('mes-001'),
    nullable: [
      ['operations', 0, 'startedAt'],
      ['operations', 0, 'finishedAt'],
      ['operations', 0, 'manager'],
      ['operations', 0, 'manager', 'name'],
    ],
    id: ['operations', 0, 'mesOperationLogId'],
  },
  'MRP 순소요 목록': {
    url: PRODUCTION_ENDPOINTS.MRP_ORDERS,
    read: () =>
      production.fetchMrpOrdersList({
        page: 0,
        size: 10,
        quotationId: 'ALL',
        availableStatusCode: 'ALL',
      }),
    nullable: [
      ['content', 0, 'procurementStartDate'],
      ['content', 0, 'expectedArrivalDate'],
    ],
    id: ['content', 0, 'itemId'],
  },
  '생산 견적 목록': {
    url: PRODUCTION_ENDPOINTS.QUOTATIONS,
    read: () => production.fetchQuotationList({ page: 0, size: 10, availableStatusCode: 'ALL' }),
    nullable: [['content', 0, 'dueDate']],
    id: ['content', 0, 'quotationId'],
  },
  // 남은 표시 결함 3 카드. 수량이지만 zod 전 화면이 네 칸 모두 `?? '-'` 로 막았다(f769122b^ MpsTab.tsx)
  'MPS 목록': {
    url: PRODUCTION_ENDPOINTS.MPS_PLANS,
    read: () =>
      production.fetchMpsList({
        bomId: 'bom-001',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        page: 0,
        size: 100,
      }),
    nullable: [
      ['content', 0, 'demand'],
      ['content', 0, 'requiredInventory'],
      ['content', 0, 'productionNeeded'],
      ['content', 0, 'plannedProduction'],
    ],
    id: ['bomId'],
  },
  '주문 상세': {
    url: SALES_ENDPOINTS.ORDER_DETAIL('so-001'),
    read: () => sales.getOrderDetail('so-001'),
    nullable: [['note']],
    id: ['order', 'salesOrderId'],
  },
  '부서 목록': {
    url: HRM_ENDPOINTS.DEPARTMENTS,
    read: () => hrm.fetchDepartmentsList(),
    nullable: [
      ['content', 0, 'description'],
      ['content', 0, 'managerName'],
      ['content', 0, 'location'],
      ['content', 0, 'establishedDate'],
    ],
    id: ['content', 0, 'departmentId'],
  },
  '출퇴근 목록': {
    url: HRM_ENDPOINTS.TIME_RECORD,
    read: () => hrm.fetchAttendanceList({ date: '2026-11-10', page: 0, size: 10 }),
    nullable: [
      ['content', 0, 'employee', 'employeeName'],
      ['content', 0, 'employee', 'position'],
    ],
    id: ['content', 0, 'employee', 'employeeId'],
  },
  '교육 현황 목록': {
    url: HRM_ENDPOINTS.TRAINING_STATUS,
    read: () => hrm.fetchTrainingList({ page: 0, size: 10 }),
    nullable: [['items', 0, 'lastTrainingDate']],
    id: ['items', 0, 'employeeId'],
  },
  '재고 목록': {
    url: INVENTORY_ENDPOINTS.INVENTORY_LIST,
    read: () => inventory.getInventoryList({ page: 0, size: 10 }),
    nullable: [['content', 0, 'warehouseName']],
    id: ['content', 0, 'itemId'],
  },
  '재고 상세': {
    url: INVENTORY_ENDPOINTS.INVENTORY_DETAIL('item-1001'),
    read: () => inventory.getInventoryDetail('item-1001'),
    nullable: [['lastModified']],
    id: ['itemId'],
  },
  '창고 상세': {
    url: WAREHOUSE_ENDPOINTS.WAREHOUSE_DETAIL('wh-001'),
    read: () => warehouse.getWarehouseDetail('wh-001'),
    nullable: [
      ['warehouseInfo', 'warehouseName'],
      ['warehouseInfo', 'location'],
      ['warehouseInfo', 'description'],
      ['manager', 'managerName'],
      ['manager', 'managerPhoneNumber'],
      ['manager', 'managerEmail'],
    ],
    id: ['manager', 'managerId'],
  },
};

// 예전 가드(?., ??, ||)는 undefined 도 막았다. null 과 키 누락 둘 다 받는다
const EDITS = [
  { mode: 'null', edit: nullAt },
  { mode: '키 누락', edit: dropAt },
];

const EMPTY_CASES = Object.entries(READS).flatMap(([name, { url, read, nullable }]) =>
  EDITS.flatMap(({ mode, edit }) =>
    nullable.map((path) => ({
      label: `${name} ${path.join('.')} (${mode})`,
      url,
      read,
      path,
      edit,
    })),
  ),
);

describe('가드가 있던 필드는 null 이거나 없어도 읽힌다', () => {
  it.each(EMPTY_CASES)('$label', async ({ url, read, path, edit }) => {
    await serveEdited(url, (data) => edit(data, path));
    await expect(read()).resolves.toBeDefined();
  });
});

describe('ID 가 빠지면 여전히 형식 오류', () => {
  it.each(Object.entries(READS))('%s', async (_, { url, read, id }) => {
    await serveEdited(url, (data) => dropAt(data, id));
    const error: unknown = await read().then(
      () => null,
      (reason: unknown) => reason,
    );
    expect(isAppError(error) && error.kind).toBe('invalidShape');
    expect(error instanceof Error && error.message).toContain(id.join('.'));
  });
});
