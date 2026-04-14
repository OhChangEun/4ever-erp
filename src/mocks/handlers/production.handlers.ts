import { http, HttpResponse } from 'msw';
import {
  PRODUCTION_BASE_PATH,
  PRODUCTION_ENDPOINTS,
} from '@/app/(private)/production/api/production.endpoints';
import { ok, okNoData, error, shouldError, isoNow, makePage, stat, statResponse } from './utils';

const mockProductionStats = statResponse({
  production_in: stat,
  production_completed: stat,
  bom_count: stat,
});

// ---- 낙관적 락 시뮬레이션: BOM 서버 측 버전 상태 ----
const bomServerVersions: Record<string, string> = {};
const getBomVersion = (bomId: string) => bomServerVersions[bomId] ?? 'v1';
const bumpBomVersion = (bomId: string): string => {
  const current = getBomVersion(bomId);
  const next = `v${parseInt(current.replace('v', ''), 10) + 1}`;
  bomServerVersions[bomId] = next;
  return next;
};

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
    const filterStatus = url.searchParams.get('statusCode') ?? '';
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
    const statusCodes = ['NEW', 'CONFIRMED'];
    const availableStatuses = ['CHECKED', 'UNCHECKED'];
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
        requestDate: `${year}-${month}-${day}`,
        dueDate: `${year}-${nextMonth}-${day}`,
        statusCode: statusCodes[idx % statusCodes.length],
        availableStatus: availableStatuses[idx % availableStatuses.length],
      };
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.statusCode === filterStatus);
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatus === filterAvailable);
    if (filterStartDate) filtered = filtered.filter((d) => d.requestDate >= filterStartDate);
    if (filterEndDate) filtered = filtered.filter((d) => d.requestDate <= filterEndDate);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE, async ({ request }) => {
    if (shouldError(request)) return error('Failed to simulate quotation', 500);

    const body = (await request.json()) as { quotationIds: string[] };
    const quotationIds = body.quotationIds || [];

    const mockQuotations = [
      {
        quotationId: 'qt-001',
        quotationNumber: 'QT-2026-001',
        customerCompanyId: 'cus-001',
        customerCompanyName: '삼성전자',
        productId: 'prod-001',
        productName: '센서 모듈',
        requestQuantity: 5000,
        requestDueDate: 1713067200000,
        simulation: {
          status: 'PASS',
          availableQuantity: 5200,
          shortageQuantity: 0,
          suggestedDueDate: '2026-04-20',
          generatedAt: isoNow,
        },
        shortages: [],
      },
      {
        quotationId: 'qt-002',
        quotationNumber: 'QT-2026-002',
        customerCompanyId: 'cus-002',
        customerCompanyName: 'LG Display',
        productId: 'prod-002',
        productName: 'LCD Panel 32"',
        requestQuantity: 3000,
        requestDueDate: 1713153600000,
        simulation: {
          status: 'FAIL',
          availableQuantity: 500,
          shortageQuantity: 2500,
          suggestedDueDate: '2026-04-25',
          generatedAt: isoNow,
        },
        shortages: [
          {
            itemId: 'item-001',
            itemName: '실리콘 웨이퍼',
            requiredQuantity: 10000,
            currentStock: 7500,
            shortQuantity: 2500,
          },
          {
            itemId: 'item-002',
            itemName: '감광액',
            requiredQuantity: 500,
            currentStock: 200,
            shortQuantity: 300,
          },
        ],
      },
      {
        quotationId: 'qt-003',
        quotationNumber: 'QT-2026-003',
        customerCompanyId: 'cus-003',
        customerCompanyName: 'SK Hynix',
        productId: 'prod-003',
        productName: '메모리칩 16GB',
        requestQuantity: 8000,
        requestDueDate: 1713240000000,
        simulation: {
          status: 'PASS',
          availableQuantity: 8500,
          shortageQuantity: 0,
          suggestedDueDate: '2026-04-22',
          generatedAt: isoNow,
        },
        shortages: [],
      },
    ];

    const selectedQuotations =
      quotationIds.length > 0
        ? mockQuotations.filter((q) => quotationIds.includes(q.quotationId))
        : mockQuotations;

    return ok({
      page: makePage(0, 10, selectedQuotations.length),
      content: selectedQuotations,
    });
  }),
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
  http.post(PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM, ({ request }) => {
    if (shouldError(request)) return error('Failed to confirm quotation', 500);
    return ok(null);
  }),
  http.get(PRODUCTION_ENDPOINTS.BOMS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load BOM list', 500);
    return ok({
      page: makePage(0, 10, 1),
      content: [
        {
          bomId: 'bom-001',
          bomNumber: 'BOM-2026-001',
          productId: 'prod-001',
          productNumber: 'PRD-001',
          productName: '모터 A',
          version: 'v1',
          statusCode: '활성',
          lastModifiedAt: isoNow,
        },
      ],
    });
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
  http.get(`${PRODUCTION_BASE_PATH}/boms/:bomId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load BOM detail', 500);
    const bomId = params.bomId as string;
    return ok({
      bomId,
      bomNumber: 'BOM-2026-001',
      productId: 'prod-001',
      productNumber: 'PRD-001',
      productName: '모터 A',
      version: getBomVersion(bomId),
      statusCode: '활성',
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
      levelStructure: [
        {
          id: 'node-1',
          code: 'ITM-1001',
          name: '베어링 B',
          quantity: 2,
          unit: 'EA',
          level: 1,
          parentId: null,
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
  http.patch(`${PRODUCTION_BASE_PATH}/boms/:bomId`, async ({ request, params }) => {
    if (shouldError(request)) return error('Failed to update BOM', 500);
    const bomId = params.bomId as string;
    const body = (await request.json()) as { version: string; statusCode?: string };
    const serverVersion = getBomVersion(bomId);

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

    const newVersion = bumpBomVersion(bomId);
    return HttpResponse.json({
      status: 200,
      success: true,
      message: `BOM이 수정되었습니다. (버전: ${newVersion})`,
    });
  }),
  // [개발 테스트 전용] 서버 버전을 강제로 올려서 충돌 상황 시뮬레이션
  http.post(`${PRODUCTION_BASE_PATH}/boms/:bomId/simulate-conflict`, ({ params }) => {
    const bomId = params.bomId as string;
    const newVersion = bumpBomVersion(bomId);
    return HttpResponse.json({
      message: `[테스트] 서버 버전이 ${newVersion}로 변경되었습니다. 다음 수정 요청은 409를 반환합니다.`,
    });
  }),
  http.post(PRODUCTION_ENDPOINTS.BOMS, ({ request }) => {
    if (shouldError(request)) return error('Failed to create BOM', 500);
    return okNoData();
  }),
  http.delete(`${PRODUCTION_BASE_PATH}/boms/:bomId`, ({ request }) => {
    if (shouldError(request)) return error('Failed to delete BOM', 500);
    return okNoData();
  }),
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
    });
    let filtered = allData;
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationId === filterQuotation);
    if (filterAvailable && filterAvailable !== 'ALL')
      filtered = filtered.filter((d) => d.availableStatusCode === filterAvailable);
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.post(PRODUCTION_ENDPOINTS.MRP_CONVERT, ({ request }) => {
    if (shouldError(request)) return error('Failed to convert MRP orders', 500);
    return ok({ converted: true });
  }),
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
    });
    let filtered = allData;
    if (filterStatus && filterStatus !== 'ALL')
      filtered = filtered.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      filtered = filtered.filter((d) => d.quotationNumber.includes(filterQuotation));
    const total = filtered.length;
    const start = page * size;
    return ok({ content: filtered.slice(start, start + size), page: makePage(page, size, total) });
  }),
  http.get(`${PRODUCTION_BASE_PATH}/mrp/planned-orders/detail/:mrpId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load MRP planned order detail', 500);
    return ok({
      mrpId: params.mrpId,
      quotationId: 'qt-001',
      quotationCode: 'QT-2026-001',
      requesterId: 'emp-001',
      requesterName: '홍길동',
      departmentName: '구매팀',
      requestDate: '2026-01-10',
      desiredDueDate: '2026-02-01',
      status: 'PLANNED',
      orderItems: [
        {
          itemId: 'item-1001',
          itemName: '베어링 B',
          quantity: 100,
          uomName: 'EA',
          unitPrice: 8000,
        },
      ],
      totalAmount: 800000,
    });
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
    const allData = Array.from({ length: baseTotal }, (_, i) => {
      const idx = i + 1;
      const statusIdx = idx % statuses.length;
      const qIdx = idx % quotationIds.length;
      const progress = statuses[statusIdx] === 'IN_PROGRESS' ? 20 + (idx % 70) : 0;
      return {
        mesId: `mes-${String(idx).padStart(3, '0')}`,
        mesNumber: `MES-2026-${String(idx).padStart(3, '0')}`,
        productId: `prod-${String((idx % 5) + 1).padStart(3, '0')}`,
        productName: productNames[idx % productNames.length],
        quantity: ((idx % 10) + 1) * 50,
        uomName: 'EA',
        quotationId: quotationIds[qIdx],
        quotationNumber: quotationNumbers[qIdx],
        status: statuses[statusIdx],
        currentOperation: statuses[statusIdx] === 'IN_PROGRESS' ? 2 : 1,
        startDate: `2026-0${(idx % 3) + 1}-${String((idx % 28) + 1).padStart(2, '0')}`,
        endDate: `2026-0${(idx % 3) + 2}-${String((idx % 28) + 1).padStart(2, '0')}`,
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
  http.get(`${PRODUCTION_BASE_PATH}/mes/:mesId`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to load MES detail', 500);
    return ok({
      mesId: params.mesId,
      mesNumber: 'MES-2026-001',
      productId: 'prod-001',
      productName: '모터 A',
      quantity: 100,
      uomName: 'EA',
      progressPercent: 60,
      statusCode: 'IN_PROGRESS',
      plan: { startDate: '2026-01-15', dueDate: '2026-02-01' },
      currentOperation: 'OP20',
      operations: [
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
          canStart: false,
          canComplete: false,
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
          canStart: false,
          canComplete: true,
        },
      ],
      canStartMes: false,
      canCompleteMes: false,
    });
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/start`, ({ request }) => {
    if (shouldError(request)) return error('Failed to start MES', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/complete`, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete MES', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/start`, ({ request }) => {
    if (shouldError(request)) return error('Failed to start operation', 500);
    return okNoData();
  }),
  http.put(`${PRODUCTION_BASE_PATH}/mes/:mesId/operations/:operationId/complete`, ({ request }) => {
    if (shouldError(request)) return error('Failed to complete operation', 500);
    return okNoData();
  }),
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
  http.get(PRODUCTION_ENDPOINTS.QUOTATION_STATUS_DROPDOWN, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotation status dropdown', 500);
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'NEW', value: '신규' },
      { key: 'CONFIRMED', value: '확정' },
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
