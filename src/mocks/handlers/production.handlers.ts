import { http, HttpResponse, type PathParams } from 'msw';
import { addDays, startOfDay, toDateKey } from '@/app/utils/date';
import {
  PRODUCTION_BASE_PATH,
  PRODUCTION_ENDPOINTS,
} from '@/app/(private)/production/api/production.endpoints';
import type { Schema } from '@/lib/api/contract';
import { addCreated, mockState } from '../state';
import { BEARING, MOTOR } from './catalog';
import { purchaseState } from './purchase.handlers';
import {
  ok,
  okNoData,
  error,
  shouldError,
  isoNow,
  makePage,
  flow,
  level,
  statResponse,
} from './utils';

type Bom = Schema<'BomListData'>;

/**
 * 생산 목이 기억하는 쓰기 결과(로그인별, `src/mocks/state.ts`).
 * 상태 값은 서버 근거가 없어(게이트웨이가 Object 로 넘긴다) 화면이 비교하는 값에 맞췄다(verified=false).
 * 견적 확정 뒤 CHECKED, 계획 주문 전환 뒤 CONVERTED, MES 와 공정은 IN_PROGRESS, COMPLETED(시작 전 값은 아래 MES_SEED_STATUSES 주석).
 * 이미 처리된 건에 또 보내도 성공으로 답한다(실서버 동작 미확인)
 */
type MesStatus = 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
type OperationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

const productionState = mockState<{
  /** 낙관적 락 시뮬레이션. 실제 백엔드라면 DB 의 version 컬럼이다. 한 방문자의 충돌 재현이 남에게 409 를 내지 않게 로그인별 */
  bomVersion: Map<string, string>;
  bomStatus: Map<string, string>;
  createdBoms: Bom[];
  confirmedQuotations: Set<string>;
  convertedItems: Set<string>;
  mesStatus: Map<string, MesStatus>;
  /** `MES id/공정 id` → 상태 */
  operationStatus: Map<string, OperationStatus>;
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

/**
 * 생산 제품. MES 목록의 제품(prod-001~005)과 제품 상세가 같은 표를 읽는다. 제품 드롭다운은 앞의 둘(예전과 같다).
 * 모터 A 단가는 품목표 값. 나머지 단가와 분류는 목이 정한 값이다(verified=false)
 */
const PRODUCTS = [
  {
    productId: 'prod-001',
    productName: MOTOR.itemName,
    category: 'MOTOR',
    unitPrice: MOTOR.unitPrice,
  },
  { productId: 'prod-002', productName: '펌프 B', category: 'PUMP', unitPrice: 15000 },
  { productId: 'prod-003', productName: '밸브 C', category: 'VALVE', unitPrice: 6000 },
  { productId: 'prod-004', productName: '센서 D', category: 'SENSOR', unitPrice: 9000 },
  { productId: 'prod-005', productName: '컨베이어 E', category: 'CONVEYOR', unitPrice: 48000 },
];

/** 생산 견적 목록과 시뮬레이션이 같은 견적에 같은 고객, 제품을 쓴다(예전엔 배열이 따로라 qt-001 이 다른 회사였다) */
const QUOTATION_CUSTOMERS = [
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
const QUOTATION_PRODUCTS = [
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

/**
 * 기본 BOM(bom-001, 모터 A)의 구성. 베어링 B 는 품목표의 번호와 단가를 쓴다(예전엔 item-1001, ITM-1001, 4,200원이라
 * 재고의 모터 A 번호와 겹쳤다).
 */
const SEED_BOM_STRUCTURE = {
  components: [
    {
      itemId: BEARING.itemId,
      code: BEARING.itemNumber,
      name: BEARING.itemName,
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
      code: BEARING.itemNumber,
      name: BEARING.itemName,
      quantity: 2,
      unit: 'EA',
      level: 2,
      parentId: 'node-2',
      unitCost: BEARING.unitPrice,
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
};

/**
 * MES 의 처음 상태. 목록과 상세가 같은 규칙을 쓴다. 예전 상세는 어떤 MES 를 열어도 진행중이라 "MES 시작"을 누를 수 없었다(리뷰 P2).
 * 값은 verified=false 다. 게이트웨이는 MES 응답을 Object 로 넘긴다(scm/pp/controller/PpController.java:133, :189).
 * - 목록의 시작 전 값 WAITING: 화면의 상태 글자표(MesTab.tsx:36)가 아는 값이다. 게이트웨이 옛 목 데이터는 PLANNED 였는데
 *   (mockdata/scmpp/controller/PpController.java:906) 그 값을 주면 화면이 코드를 그대로 보인다. 화면과 같이 고칠 일이다(카드의 넘기는 표).
 * - 상세의 시작 전 값 PENDING: 상세는 공통 상태 글자(StatusLabel)를 쓰는데 WAITING 은 거기 없다.
 * - 공정의 시작 전 값 PENDING: 게이트웨이 옛 목 데이터(같은 파일 :975).
 */
const MES_SEED_STATUSES: MesStatus[] = [
  'WAITING',
  'IN_PROGRESS',
  'WAITING',
  'IN_PROGRESS',
  'WAITING',
];
/** `mes-007` 이면 7번째 규칙. 끝에 번호가 없는 id 는 예전 상세처럼 진행중 */
const seedMesStatus = (mesId: string): MesStatus => {
  const serial = Number(/(\d+)$/.exec(mesId)?.[1]);
  return Number.isInteger(serial)
    ? MES_SEED_STATUSES[serial % MES_SEED_STATUSES.length]
    : 'IN_PROGRESS';
};
const mesStatusOf = (request: Request, mesId: string): MesStatus =>
  productionState(request).mesStatus.get(mesId) ?? seedMesStatus(mesId);

/** MES 상세 목의 공정 둘. 목록에서 어떤 MES 를 열어도 같은 공정이 나온다. `running` 은 진행중인 MES 에서의 처음 상태 */
const OPERATIONS: Array<{
  mesOperationLogId: string;
  operationNumber: string;
  operationName: string;
  sequence: number;
  manager: { id: number; name: string };
  running: OperationStatus;
}> = [
  {
    mesOperationLogId: 'op-001',
    operationNumber: 'OP10',
    operationName: '절삭',
    sequence: 1,
    manager: { id: 1, name: '박공정' },
    running: 'COMPLETED',
  },
  {
    mesOperationLogId: 'op-002',
    operationNumber: 'OP20',
    operationName: '조립',
    sequence: 2,
    manager: { id: 2, name: '정공정' },
    running: 'IN_PROGRESS',
  },
];
/** 공정의 지금 상태. 시작 전인 MES 의 공정은 전부 시작 전이다 */
const operationStatusOf = (
  request: Request,
  mesId: string,
  operation: (typeof OPERATIONS)[number],
): OperationStatus =>
  productionState(request).operationStatus.get(`${mesId}/${operation.mesOperationLogId}`) ??
  (seedMesStatus(mesId) === 'WAITING' ? 'PENDING' : operation.running);

/** 목록의 MES 수 */
const MES_TOTAL = 50;
const MES_QUOTATIONS = ['qt-001', 'qt-002', 'qt-003', 'qt-004', 'qt-005'];

/**
 * MES 한 건. 목록과 상세가 같이 쓴다(카드 "목 데이터 현실성"). `idx` 는 제품, 수량, 날짜를 정하는 순번이고
 * 상태와 공정은 `mesId` 의 것이다(모르는 id 도 쓰기 결과를 따른다).
 * 진행률은 끝난 공정 / 전체 공정, 현재 공정은 처음으로 안 끝난 공정(다 끝났으면 마지막)이다
 */
const mesRow = (request: Request, mesId: string, idx: number) => {
  const status = mesStatusOf(request, mesId);
  const statuses = OPERATIONS.map((operation) => operationStatusOf(request, mesId, operation));
  const done = statuses.filter((operationStatus) => operationStatus === 'COMPLETED').length;
  const product = PRODUCTS[idx % PRODUCTS.length];
  const quotationId = MES_QUOTATIONS[idx % MES_QUOTATIONS.length];
  const today = startOfDay(new Date());
  return {
    mesId,
    mesNumber: `MES-2026-${String(idx).padStart(3, '0')}`,
    productId: product.productId,
    productName: product.productName,
    quantity: ((idx % 10) + 1) * 50,
    uomName: 'EA',
    quotationId,
    quotationNumber: `QT-2026-${quotationId.slice(3)}`,
    status,
    currentOperation: Math.min(done + 1, OPERATIONS.length),
    // 오늘 기준 상대 날짜(시각화 3 간트). 시작은 오늘-14일~오늘, 기간 5~12일.
    // 진행 중인데 끝날이 지난 건(지연)이 몇 개 생긴다
    startDate: toDateKey(addDays(today, -((idx * 3) % 15))),
    endDate: toDateKey(addDays(today, -((idx * 3) % 15) + 5 + (idx % 8))),
    progressRate: Math.round((done / OPERATIONS.length) * 100),
    sequence: OPERATIONS.map((operation) => operation.operationNumber),
    statuses,
  };
};
/** 목록에 있는 MES 의 순번. 목록 밖이면 1(첫 건의 제품과 수량) */
const mesIndex = (mesId: string) => {
  const serial = Number(/^mes-(\d+)$/.exec(mesId)?.[1]);
  return Number.isInteger(serial) && serial >= 1 && serial <= MES_TOTAL ? serial : 1;
};

/** MES 목록 50건(그 로그인의 시작, 완료 결과 반영) */
const mesListOf = (request: Request) =>
  Array.from({ length: MES_TOTAL }, (_, i) => {
    const { statuses: _statuses, ...row } = mesRow(
      request,
      `mes-${String(i + 1).padStart(3, '0')}`,
      i + 1,
    );
    return row;
  });

/**
 * 생산 통계. 건수는 그 로그인의 지금 목록에서 센다(리뷰 관찰 1). 진행 중과 완료는 MES 목록의 상태,
 * BOM 수는 BOM 목록 행 수(새 BOM 포함)
 */
const productionStats = (request: Request) => {
  const statuses = mesListOf(request).map((row) => row.status);
  const count = (status: MesStatus) => statuses.filter((value) => value === status).length;
  return statResponse({
    production_in: level(count('IN_PROGRESS')),
    production_completed: flow(count('COMPLETED')),
    bom_count: level(1 + productionState(request).createdBoms.length),
  });
};

export const productionHandlers = [
  http.get(PRODUCTION_ENDPOINTS.STATISTICS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load production stats', 500);
    return ok(productionStats(request));
  }),
  http.get(PRODUCTION_ENDPOINTS.QUOTATIONS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load quotations', 500);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? 0);
    const size = Number(url.searchParams.get('size') ?? 10);
    const filterAvailable = url.searchParams.get('availableStatusCode') ?? '';
    const filterStartDate = url.searchParams.get('startDate') ?? '';
    const filterEndDate = url.searchParams.get('endDate') ?? '';
    const customers = QUOTATION_CUSTOMERS;
    const availableStatuses = ['CHECKED', 'UNCHECKED'];
    const products = QUOTATION_PRODUCTS;
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

      const customers = QUOTATION_CUSTOMERS;
      const products = QUOTATION_PRODUCTS;
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
    // 제품 표에서 찾는다. 모르는 id 는 계약에 404 가 없어 모터 A 본문에 그 id 를 싣는다
    const product = PRODUCTS.find((p) => p.productId === params.productId) ?? PRODUCTS[0];
    return ok({
      productId: params.productId,
      productName: product.productName,
      category: product.category,
      productNumber: product.productId.replace('prod-', 'PRD-'),
      uomName: 'EA',
      unitPrice: product.unitPrice,
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
    const state = productionState(request);
    // 목록의 그 행에서 만든다. 모르는 id 는 계약에 404 가 없어 기본 BOM 본문에 그 id 를 싣는다
    const created = state.createdBoms.find((bom) => bom.bomId === bomId);
    const bom = created ?? SEED_BOM;
    // 새로 등록한 BOM 은 구성품을 모른다(등록 본문의 자재를 기억하지 않는다). 기본 BOM 의 구성을 빌려 보이지 않고 비운다
    const structure = created
      ? {
          components: [],
          levelStructure: [
            {
              id: 'node-0',
              code: bom.productNumber,
              name: bom.productName,
              quantity: null,
              unit: null,
              level: 0,
              parentId: null,
            },
          ],
          routing: [],
        }
      : SEED_BOM_STRUCTURE;
    return ok({
      bomId,
      bomNumber: bom.bomNumber,
      productId: bom.productId,
      productNumber: bom.productNumber,
      productName: bom.productName,
      version: getBomVersion(request, bomId),
      statusCode: state.bomStatus.get(bomId) ?? bom.statusCode,
      lastModifiedAt: bom.lastModifiedAt,
      ...structure,
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
      addCreated(createdBoms, (serial) => ({
        ...SEED_BOM,
        bomId: `bom-${serial}`,
        bomNumber: `BOM-2026-${serial}`,
        productId: `prod-${serial}`,
        productNumber: `PRD-${serial}`,
        productName,
      }));
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
    // 시작이나 완료를 눌렀으면 그 결과, 아니면 상세와 같은 처음 상태
    const allData = mesListOf(request);
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
    const { mesId } = params;
    // 목록의 그 행에서 만든다. 모르는 id 는 계약에 404 가 없어 첫 건의 제품과 수량에 그 id 의 상태를 싣는다
    const row = mesRow(request, mesId, mesIndex(mesId));
    const mes = row.status;
    const running = mes === 'IN_PROGRESS';
    const { statuses } = row;
    // 버튼을 누를 수 있는지는 서버가 정해 준다. 목은 지금 상태에서 계산한다. 공정은 앞 공정이 끝나야 시작할 수 있다
    const operations = OPERATIONS.map(({ running: _running, ...operation }, index) => {
      const status = statuses[index];
      return {
        ...operation,
        statusCode: status,
        startedAt: status === 'PENDING' ? '' : isoNow,
        finishedAt: status === 'COMPLETED' ? isoNow : '',
        durationHours: status === 'COMPLETED' ? 2 : 0,
        canStart:
          running &&
          status === 'PENDING' &&
          statuses.slice(0, index).every((before) => before === 'COMPLETED'),
        canComplete: running && status === 'IN_PROGRESS',
      };
    });
    const allDone = statuses.every((status) => status === 'COMPLETED');
    return ok({
      mesId,
      mesNumber: row.mesNumber,
      productId: row.productId,
      productName: row.productName,
      quantity: row.quantity,
      uomName: row.uomName,
      progressPercent: row.progressRate,
      // 상세의 상태 글자는 공통 상태 메시지다. 시작 전은 PENDING(대기)으로 준다(위 MES_SEED_STATUSES 주석)
      statusCode: mes === 'WAITING' ? 'PENDING' : mes,
      plan: { startDate: row.startDate, dueDate: row.endDate },
      currentOperation: row.sequence[row.currentOperation - 1],
      operations,
      canStartMes: mes === 'WAITING',
      canCompleteMes: running && allDone,
    });
  }),
  http.put<{ mesId: string }>(`${PRODUCTION_BASE_PATH}/mes/:mesId/start`, ({ request, params }) => {
    if (shouldError(request)) return error('Failed to start MES', 500);
    // 시작 전일 때만 바꾼다. 진행중이거나 끝난 MES 에 또 보내면 그대로 두고 성공으로 답한다(실서버 동작 미확인)
    if (mesStatusOf(request, params.mesId) === 'WAITING')
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
      const { mesId, operationId } = params;
      const operation = OPERATIONS.find((item) => item.mesOperationLogId === operationId);
      // 시작 전일 때만 바꾼다. 끝난 공정에 시작을 또 보내도 진행중으로 되돌리지 않고 성공으로 답한다(실서버 동작 미확인)
      if (operation && operationStatusOf(request, mesId, operation) === 'PENDING')
        productionState(request).operationStatus.set(`${mesId}/${operationId}`, 'IN_PROGRESS');
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
    return ok(
      PRODUCTS.slice(0, 2).map(({ productId, productName }) => ({
        key: productId,
        value: productName,
      })),
    );
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
