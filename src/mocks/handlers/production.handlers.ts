import { http, HttpResponse, type PathParams } from 'msw';
import { addDays, startOfDay, toDateKey } from '@/app/utils/date';
import {
  PRODUCTION_BASE_PATH,
  PRODUCTION_ENDPOINTS,
} from '@/app/(private)/production/api/production.endpoints';
import type { Schema } from '@/lib/api/contract';
import { mockState } from '../state';
import { purchaseState } from './purchase.handlers';
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

const mockProductionStats = statResponse({
  production_in: stat,
  production_completed: stat,
  bom_count: stat,
});

type Bom = Schema<'BomListData'>;

/**
 * 생산 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 상태 값은 서버 근거가 없어(게이트웨이가 Object 로 넘긴다) 화면이 비교하는 값에 맞췄다(verified=false).
 * 견적 확정 뒤 CHECKED, 계획 주문 전환 뒤 CONVERTED, MES 와 공정은 IN_PROGRESS, COMPLETED.
 * 이미 처리된 건에 또 보내도 성공으로 답한다(실서버 동작 미확인)
 */
const productionState = mockState<{
  /** 낙관적 락 시뮬레이션. 실제 백엔드라면 DB 의 version 컬럼이다. 한 방문자의 충돌 재현이 남에게 409 를 내지 않게 로그인별 */
  bomVersion: Map<string, string>;
  bomStatus: Map<string, string>;
  createdBoms: Bom[];
  confirmedQuotations: Set<string>;
  convertedItems: Set<string>;
  mesStatus: Map<string, string>;
  /** `MES id/공정 id` → 상태 */
  operationStatus: Map<string, string>;
}>(() => ({
  bomVersion: new Map(),
  bomStatus: new Map(),
  createdBoms: [],
  confirmedQuotations: new Set(),
  convertedItems: new Set(),
  mesStatus: new Map(),
  operationStatus: new Map(),
}));

const getBomVersion = (request: Request, bomId: string) =>
  productionState(request).bomVersion.get(bomId) ?? 'v1';
const bumpBomVersion = (request: Request, bomId: string): string => {
  const next = `v${parseInt(getBomVersion(request, bomId).replace('v', ''), 10) + 1}`;
  productionState(request).bomVersion.set(bomId, next);
  return next;
};

const SEED_BOM: Bom = {
  bomId: 'bom-001',
  bomNumber: 'BOM-2026-001',
  productId: 'prod-001',
  productNumber: 'PRD-001',
  productName: '모터 A',
  version: 'v1',
  statusCode: '활성',
  lastModifiedAt: isoNow,
};

/** MES 상세 목의 공정 둘과 처음 상태. 목록에서 어떤 MES 를 열어도 같은 공정이 나온다 */
const SEED_OPERATIONS = [
  {
    mesOperationLogId: 'op-001',
    operationNumber: 'OP10',
    operationName: '절삭',
    sequence: 1,
    statusCode: 'COMPLETED',
    startedAt: isoNow,
    finishedAt: isoNow,
    durationHours: 2,
    manager: { id: 1, name: '박공정' },
  },
  {
    mesOperationLogId: 'op-002',
    operationNumber: 'OP20',
    operationName: '조립',
    sequence: 2,
    statusCode: 'IN_PROGRESS',
    startedAt: isoNow,
    finishedAt: '',
    durationHours: 0,
    manager: { id: 2, name: '정공정' },
  },
];

export const productionHandlers = [
  http.get(PRODUCTION_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load production stats', 500);
    return ok(mockProductionStats);
  }),
  http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotations', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterAvailable = url.searchParams.get('availableStatusCode') ?? '';
    const filterStartDate = url.searchParams.get('startDate') ?? '';
    const filterEndDate = url.searchParams.get('endDate') ?? '';
    const customers = [
      '한빛전자',
      '대양상사',
      '삼성전자',
      '현대모비스',
      '두산중공업',
      'LG화학',
      '포스코',
      'SK하이닉스',
      '론데케미칼',
      'KT&G',
    ];
    const availableStatuses = ['CHECKED', 'UNCHECKED'];
    const products = [
      '모터 A',
      '펌프 B',
      '밸브 C',
      '기어 D',
      '베어링 E',
      '실린더 F',
      '피스톤 G',
      'LCD Panel 32"',
      '메모리칩 16GB',
      '센서 H',
    ];
    const baseTotal = 512;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      return {
        quotationId: `qt-${String(idx).padStart(3, '0')}`,
        quotationNumber: `QT-${year}-${String(idx).padStart(3, '0')}`,
        customerName: customers[idx % customers.length],
        productName: products[idx % products.length],
        requestDate: `${year}-${month}-${day}`,
        dueDate: `${year}-${nextMonth}-${day}`,
        availableStatus: availableStatuses[idx % availableStatuses.length],
      };
    }).map((quotation) =>
      // 제안 납기를 확정한 견적은 확인됨으로 바뀐다
      productionState(request).confirmedQuotations.has(quotation.quotationId)
        ? { ...quotation, availableStatus: 'CHECKED' }
        : quotation,
    );
    let filtered = allData;
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatus === filterAvailable);
    if (filterStartDate) filtered = filtered.filter((d) => d.requestDate >= filterStartDate);
    if (filterEndDate) filtered = filtered.filter((d) => d.requestDate <= filterEndDate);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post<PathParams, { quotationIds?: string[] }>(
    PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to simulate quotation', 500);

      const body = await request.json();
      const quotationIds = body.quotationIds || [];

      const customers = [
        '삼성전자',
        'LG Display',
        'SK Hynix',
        '현대모비스',
        '두산중공업',
        'LG화학',
        '포스코',
        '한빛전자',
        '대양상사',
        'KT&G',
      ];
      const products = [
        '센서 모듈',
        'LCD Panel 32"',
        '메모리칩 16GB',
        '모터 A',
        '펌프 B',
        '밸브 C',
        '기어 D',
        '베어링 E',
        '실린더 F',
        '피스톤 G',
      ];
      const selectedQuotations = quotationIds.map((quotationId) => {
        const num = parseInt(quotationId.replace('qt-', ''), 10) || 1;
        const requestQty = ((num % 10) + 1) * 1000;
        // 가용 수량은 요청 수량의 40~130% 범위에서 결정
        const availableRatio = [0.4, 0.6, 0.8, 1.0, 1.1, 1.3][num % 6];
        const availableQty = Math.floor(requestQty * availableRatio);
        const shortageQty = Math.max(0, requestQty - availableQty);
        // 생산 불필요(재고 충당)면 항상 STOCK_SUFFICIENT, 필요한 경우 내부 사정으로 약 30% FAIL
        const isFail = shortageQty > 0 && (num * 7 + 3) % 10 < 2;
        const simulationStatus = shortageQty === 0 ? 'STOCK_SUFFICIENT' : isFail ? 'FAIL' : 'PASS';
        const year = 2025 + Math.floor(num / 300);
        const month = String((num % 12) + 1).padStart(2, '0');
        const day = String((num % 28) + 1).padStart(2, '0');
        const nextMonth = String((((num % 12) + 1) % 12) + 1).padStart(2, '0');

        return {
          quotationId,
          quotationNumber: `QT-${year}-${String(num).padStart(3, '0')}`,
          customerCompanyId: `cus-${String((num % customers.length) + 1).padStart(3, '0')}`,
          customerCompanyName: customers[num % customers.length],
          productId: `prod-${String((num % products.length) + 1).padStart(3, '0')}`,
          productName: products[num % products.length],
          requestQuantity: requestQty,
          requestDueDate: new Date(`${year}-${month}-${day}`).getTime(),
          simulation: {
            status: simulationStatus,
            availableQuantity: availableQty,
            shortageQuantity: shortageQty,
            shortageReason: isFail
              ? [
                  '주요 원자재(실리콘 웨이퍼) 입고 지연',
                  '협력사 생산 차질',
                  '공정 설비 점검으로 인한 생산 중단',
                  '긴급 오더로 인한 재고 소진',
                  '예상치 못한 불량률 증가',
                  '납기일 내 입고 불가',
                ][num % 6]
              : '',
            suggestedDueDate: `${year}-${nextMonth}-${day}`,
            generatedAt: isoNow,
          },
        };
      });

      return ok({
        page: makePage(0, selectedQuotations.length, selectedQuotations.length),
        content: selectedQuotations,
      });
    },
  ),
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_PREVIEW, ({ request }) => {
    if (shouldError(request)) return error('Failed to preview quotation', 500);
    return ok([
      {
        quotationNumber: 'QT-2026-001',
        customerCompanyName: '한빛전자',
        productName: '모터 A',
        confirmedDueDate: '2026-02-01',
        weeks: [
          {
            week: '2026-01-1W',
            demand: 100,
            requiredQuantity: 100,
            productionQuantity: 100,
            mps: 100,
          },
        ],
      },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MPS_PLANS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MPS', 500);
    return ok({
      bomId: 'bom-001',
      productName: '모터 A',
      content: [
        {
          week: '2026-01-1W',
          demand: 100,
          requiredInventory: 20,
          productionNeeded: 80,
          plannedProduction: 90,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }),
  http.post<PathParams, { quotationIds?: string[] }>(
    PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to confirm quotation', 500);
      const { confirmedQuotations } = productionState(request);
      for (const id of (await request.json()).quotationIds ?? []) confirmedQuotations.add(id);
      return ok(null);
    },
  ),
  http.get(PRODUCTION_ENDPOINTS.BOMS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load BOM list', 500);
    const state = productionState(request);
    const content = [SEED_BOM, ...state.createdBoms].map((bom) => ({
      ...bom,
      version: getBomVersion(request, bom.bomId),
      statusCode: state.bomStatus.get(bom.bomId) ?? bom.statusCode,
    }));
    return ok({ page: makePage(0, 10, content.length), content });
  }),
  http.get(`${PRODUCTION_BASE_PATH}/products/:productId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load product detail', 500);
    return ok({
      productId: params.productId,
      productName: '모터 A',
      category: 'MOTOR',
      productNumber: 'PRD-001',
      uomName: 'EA',
      unitPrice: 12000,
      supplierName: '대양상사',
    });
  }),
  http.get(PRODUCTION_ENDPOINTS.OPERATIONS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load operations', 500);
    return ok([
      { key: 'OP10', value: '절삭' },
      { key: 'OP20', value: '조립' },
    ]);
  }),
  http.get<{ bomId: string }>(`${PRODUCTION_BASE_PATH}/boms/:bomId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load BOM detail', 500);
    const { bomId } = params;
    return ok({
      bomId,
      bomNumber: 'BOM-2026-001',
      productId: 'prod-001',
      productNumber: 'PRD-001',
      productName: '모터 A',
      version: getBomVersion(request, bomId),
      statusCode: productionState(request).bomStatus.get(bomId) ?? '활성',
      lastModifiedAt: isoNow,
      components: [
        {
          itemId: 'item-1001',
          code: 'ITM-1001',
          name: '베어링 B',
          quantity: 2,
          unit: 'EA',
          level: 'Level 1',
          supplierName: '대한금속',
          operationId: 'OP10',
          operationName: '절삭',
          componentType: '부품',
        },
      ],
      // 3단 BOM(시각화 7). 단가는 자재(잎)에만 있고, 샤프트는 단가가 비어 있다(0 원으로 세지 않는지 본다)
      levelStructure: [
        {
          id: 'node-0',
          code: 'PRD-001',
          name: '모터 A',
          quantity: null,
          unit: null,
          level: 0,
          parentId: null,
        },
        {
          id: 'node-1',
          code: 'ASM-100',
          name: '하우징 조립',
          quantity: 1,
          unit: 'EA',
          level: 1,
          parentId: 'node-0',
        },
        {
          id: 'node-2',
          code: 'ASM-200',
          name: '로터 조립',
          quantity: 1,
          unit: 'EA',
          level: 1,
          parentId: 'node-0',
        },
        {
          id: 'node-3',
          code: 'ITM-3001',
          name: '커버',
          quantity: 1,
          unit: 'EA',
          level: 1,
          parentId: 'node-0',
          unitCost: 3000,
        },
        {
          id: 'node-4',
          code: 'ITM-2001',
          name: '알루미늄 판',
          quantity: 2,
          unit: 'kg',
          level: 2,
          parentId: 'node-1',
          unitCost: 8500,
        },
        {
          id: 'node-5',
          code: 'ITM-2002',
          name: '볼트 M6',
          quantity: 8,
          unit: 'EA',
          level: 2,
          parentId: 'node-1',
          unitCost: 120,
        },
        {
          id: 'node-6',
          code: 'ITM-2003',
          name: '구리선',
          quantity: 1.5,
          unit: 'kg',
          level: 2,
          parentId: 'node-2',
          unitCost: 12000,
        },
        {
          id: 'node-7',
          code: 'ITM-1001',
          name: '베어링 B',
          quantity: 2,
          unit: 'EA',
          level: 2,
          parentId: 'node-2',
          unitCost: 4200,
        },
        {
          id: 'node-8',
          code: 'ITM-2004',
          name: '샤프트',
          quantity: 1,
          unit: 'EA',
          level: 2,
          parentId: 'node-2',
          unitCost: null,
        },
      ],
      routing: [
        {
          itemName: '모터 A',
          sequence: 1,
          operationName: '절삭',
          runTime: 30,
        },
      ],
    });
  }),
  // BOM 상태 수정 요청 — 낙관적 락 버전 검증
  http.patch<{ bomId: string }, { version: string; statusCode?: string }>(
    `${PRODUCTION_BASE_PATH}/boms/:bomId`,
    async ({ request, params }) => {
      if (shouldError(request)) return error('Failed to update BOM', 500);
      const { bomId } = params;
      const body = await request.json();
      const serverVersion = getBomVersion(request, bomId);

      if (body.version !== serverVersion) {
        return HttpResponse.json(
          {
            status: 409,
            success: false,
            message: `다른 사용자가 이미 이 BOM을 수정했습니다. (서버: ${serverVersion} / 요청: ${body.version})`,
          },
          { status: 409 },
        );
      }

      const newVersion = bumpBomVersion(request, bomId);
      if (body.statusCode) productionState(request).bomStatus.set(bomId, body.statusCode);
      return HttpResponse.json({
        status: 200,
        success: true,
        message: `BOM이 수정되었습니다. (버전: ${newVersion})`,
      });
    },
  ),
  // [개발 테스트 전용] 서버 버전을 강제로 올려서 충돌 상황 시뮬레이션
  http.post<{ bomId: string }>(
    `${PRODUCTION_BASE_PATH}/boms/:bomId/simulate-conflict`,
    ({ request, params }) => {
      const { bomId } = params;
      const newVersion = bumpBomVersion(request, bomId);
      return HttpResponse.json({
        message: `[테스트] 서버 버전이 ${newVersion}로 변경되었습니다. 다음 수정 요청은 409를 반환합니다.`,
      });
    },
  ),
  http.post<PathParams, Schema<'BomRequestBody'>>(
    PRODUCTION_ENDPOINTS.BOMS,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to create BOM', 500);
      const { createdBoms } = productionState(request);
      const { productName } = await request.json();
      const serial = String(createdBoms.length + 2).padStart(3, '0');
      createdBoms.push({
        ...SEED_BOM,
        bomId: `bom-${serial}`,
        bomNumber: `BOM-2026-${serial}`,
        productId: `prod-${serial}`,
        productNumber: `PRD-${serial}`,
        productName,
      });
      return okNoData();
    },
  ),
  http.get(PRODUCTION_ENDPOINTS.MRP_ORDERS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const filterAvailable = url.searchParams.get('availableStatusCode') ?? '';
    const itemNames = [
      '베어링 B',
      '스프링 C',
      '볼트 M10',
      '너트 M10',
      '기어 A',
      '샤프트 D',
      '플랜지 E',
      '커플링 F',
      '실린더 G',
      '피스톤 H',
    ];
    const suppliers = [
      '대한금속',
      '현대파스너',
      '하나금속',
      '삼성부품',
      '두산소재',
      'LG부품',
      '포스코재료',
      'SK소재',
      '론데금속',
      'KT부품',
    ];
    const itemTypes = ['MATERIAL', 'PRODUCT'];
    const convertStatuses = ['NOT_CONVERTED', 'CONVERTED', 'PENDING'];
    const baseTotal = 500;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      const requiredQty = ((idx % 50) + 1) * 10;
      const availableStock = (idx % 30) * 5;
      const consumptionQty = Math.min(availableStock, requiredQty);
      const shortageQty = Math.max(0, requiredQty - availableStock);
      return {
        quotationId: `qt-${String((idx % 10) + 1).padStart(3, '0')}`,
        itemId: `item-${1000 + idx}`,
        itemName: itemNames[idx % itemNames.length],
        requiredQuantity: requiredQty,
        currentStock: availableStock + (idx % 10),
        reservedStock: idx % 5,
        actualAvailableStock: availableStock,
        safetyStock: 30,
        availableStock,
        availableStatusCode: shortageQty > 0 ? 'INSUFFICIENT' : 'SUFFICIENT',
        shortageQuantity: shortageQty,
        consumptionQuantity: consumptionQty,
        itemType: itemTypes[idx % itemTypes.length],
        procurementStartDate: `${year}-${month}-${day}`,
        expectedArrivalDate: `${year}-${nextMonth}-${day}`,
        supplierCompanyName: suppliers[idx % suppliers.length],
        convertStatus: convertStatuses[idx % convertStatuses.length],
      };
    }).map((order) =>
      productionState(request).convertedItems.has(order.itemId)
        ? { ...order, convertStatus: 'CONVERTED' }
        : order,
    );
    let filtered = allData;
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationId === filterQuotation);
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatusCode === filterAvailable);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post<PathParams, Schema<'MrpOrdersConvertReqeustBody'>>(
    PRODUCTION_ENDPOINTS.MRP_CONVERT,
    async ({ request }) => {
      if (shouldError(request)) return error('Failed to convert MRP orders', 500);
      // 전환 상태만 따른다. 계획 주문 탭에 새 행을 만들지는 않는다(목이 순번으로 만든 500행이고 새 행의 번호 규칙을 모른다)
      const { convertedItems } = productionState(request);
      for (const item of (await request.json()).items) convertedItems.add(item.itemId);
      return ok({ converted: true });
    },
  ),
  http.get(PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP planned orders', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterStatus = url.searchParams.get('status') ?? '';
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const itemNames = [
      '베어링 B',
      '스프링 C',
      '볼트 M10',
      '너트 M10',
      '기어 A',
      '샤프트 D',
      '플랜지 E',
      '커플링 F',
      '실린더 G',
      '피스톤 H',
    ];
    const statuses = ['PENDING', 'PLANNED', 'APPROVED', 'REJECTED'];
    const baseTotal = 500;
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      return {
        mrpRunId: `mrp-${String(idx).padStart(3, '0')}`,
        quotationNumber: `QT-${year}-${String((idx % 20) + 1).padStart(3, '0')}`,
        itemId: `item-${1000 + idx}`,
        itemName: itemNames[idx % itemNames.length],
        quantity: ((idx % 50) + 1) * 10,
        status: statuses[idx % statuses.length],
        procurementStartDate: `${year}-${month}-${day}`,
        expectedArrivalDate: `${year}-${nextMonth}-${day}`,
      };
    }).map((order) =>
      // 자재 구매 요청(구매 목의 stock-purchase-requisitions)이 들어간 계획 주문은 승인 대기가 된다
      purchaseState(request).requestedMrpRuns.has(order.mrpRunId)
        ? { ...order, status: 'PENDING' }
        : order,
    );
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationNumber.includes(filterQuotation));
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.get(PRODUCTION_ENDPOINTS.MES_LIST, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MES list', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterStatus = url.searchParams.get('status') ?? '';
    const filterQuotation = url.searchParams.get('quotationId') ?? '';
    const productNames = ['모터 A', '펌프 B', '밸브 C', '센서 D', '컨베이어 E'];
    const quotationNumbers = [
      'QT-2026-001',
      'QT-2026-002',
      'QT-2026-003',
      'QT-2026-004',
      'QT-2026-005',
    ];
    const quotationIds = ['qt-001', 'qt-002', 'qt-003', 'qt-004', 'qt-005'];
    const statuses = ['WAITING', 'IN_PROGRESS', 'WAITING', 'IN_PROGRESS', 'WAITING'];
    const baseTotal = 50;
    const today = startOfDay(new Date());
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const statusIdx = idx % statuses.length;
      const qIdx = idx % quotationIds.length;
      const mesId = `mes-${String(idx).padStart(3, '0')}`;
      // 시작이나 완료를 눌렀으면 그 결과
      const status = productionState(request).mesStatus.get(mesId) ?? statuses[statusIdx];
      const progress =
        status === 'COMPLETED' ? 100 : status === 'IN_PROGRESS' ? 20 + (idx % 70) : 0;
      return {
        mesId,
        mesNumber: `MES-2026-${String(idx).padStart(3, '0')}`,
        productId: `prod-${String((idx % 5) + 1).padStart(3, '0')}`,
        productName: productNames[idx % productNames.length],
        quantity: ((idx % 10) + 1) * 50,
        uomName: 'EA',
        quotationId: quotationIds[qIdx],
        quotationNumber: quotationNumbers[qIdx],
        status,
        currentOperation: status === 'WAITING' ? 1 : 2,
        // 오늘 기준 상대 날짜(시각화 3 간트). 시작은 오늘-14일~오늘, 기간 5~12일.
        // 진행 중인데 끝날이 지난 건(지연)이 몇 개 생긴다
        startDate: toDateKey(addDays(today, -((idx * 3) % 15))),
        endDate: toDateKey(addDays(today, -((idx * 3) % 15) + 5 + (idx % 8))),
        progressRate: progress,
        sequence: ['OP10', 'OP20', 'OP30'],
      };
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationId === filterQuotation);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.get<{ mesId: string }>(`${PRODUCTION_BASE_PATH}/mes/:mesId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load MES detail', 500);
    const state = productionState(request);
    const { mesId } = params;
    const statusCode = state.mesStatus.get(mesId) ?? 'IN_PROGRESS';
    const mesRunning = statusCode === 'IN_PROGRESS';
    // 버튼을 누를 수 있는지는 서버가 정해 준다. 목은 지금 상태에서 계산한다
    const operations = SEED_OPERATIONS.map((operation) => {
      const status =
        state.operationStatus.get(`${mesId}/${operation.mesOperationLogId}`) ??
        operation.statusCode;
      return {
        ...operation,
        statusCode: status,
        canStart: mesRunning && status !== 'IN_PROGRESS' && status !== 'COMPLETED',
        canComplete: mesRunning && status === 'IN_PROGRESS',
      };
    });
    const allDone = operations.every((operation) => operation.statusCode === 'COMPLETED');
    return ok({
      mesId,
      mesNumber: 'MES-2026-001',
      productId: 'prod-001',
      productName: '모터 A',
      quantity: 100,
      uomName: 'EA',
      progressPercent: allDone ? 100 : 60,
      statusCode,
      plan: { startDate: '2026-01-15', dueDate: '2026-02-01' },
      currentOperation: 'OP20',
      operations,
      canStartMes: statusCode === 'WAITING',
      canCompleteMes: mesRunning && allDone,
    });
  }),
  http.put<{ mesId: string }>(`${PRODUCTION_BASE_PATH}/mes/:mesId/start`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to start MES', 500);
    productionState(request).mesStatus.set(params.mesId, 'IN_PROGRESS');
    return okNoData();
  }),
  http.put<{ mesId: string }>(
    `${PRODUCTION_BASE_PATH}/mes/:mesId/complete`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to complete MES', 500);
      productionState(request).mesStatus.set(params.mesId, 'COMPLETED');
      return okNoData();
    },
  ),
  http.put<{ mesId: string; operationId: string }>(
    `${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/start`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to start operation', 500);
      productionState(request).operationStatus.set(
        `${params.mesId}/${params.operationId}`,
        'IN_PROGRESS',
      );
      return okNoData();
    },
  ),
  http.put<{ mesId: string; operationId: string }>(
    `${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/complete`,
    ({ request, params }) => {
      if (shouldError(request)) return error('Failed to complete operation', 500);
      productionState(request).operationStatus.set(
        `${params.mesId}/${params.operationId}`,
        'COMPLETED',
      );
      return okNoData();
    },
  ),
  http.get(PRODUCTION_ENDPOINTS.MPS_TOGGLE_PRODUCTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MPS dropdown', 500);
    return ok([
      { key: 'bom-001', value: '모터 A' },
      { key: 'bom-002', value: '펌프 B' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.PRODUCTS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load products', 500);
    return ok([
      { key: 'prod-001', value: '모터 A' },
      { key: 'prod-002', value: '펌프 B' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.AVAILABLE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load available status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 가용재고' },
      { key: 'CHECKED', value: '확인' },
      { key: 'UNCHECKED', value: '미확인' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP quotations dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_AVAILABLE_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP available status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'SUFFICIENT', value: '충분' },
      { key: 'INSUFFICIENT', value: '부족' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_RUNS_QUOTATIONS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP runs quotations dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MRP_RUNS_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MRP runs status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'PENDING', value: '대기' },
      { key: 'PLANNED', value: '계획' },
      { key: 'APPROVED', value: '승인' },
      { key: 'REJECTED', value: '반려' },
    ]);
  }),
  http.get(PRODUCTION_ENDPOINTS.MES_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load MES status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'WAITING', value: '대기' },
      { key: 'IN_PROGRESS', value: '진행중' },
    ]);
  }),
];
