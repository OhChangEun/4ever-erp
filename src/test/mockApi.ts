import { getResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import { API_BASE_URL } from '@/app/types/api';

const ORIGIN = 'http://localhost';

/**
 * 목 핸들러를 서버 목 어댑터(`src/app/api/[...slug]/route.ts`)와 같은 방식(getResponse)으로 부른다.
 * path 는 프록시 주소 뒤쪽(`/scm-pp/mm/...`). auth 는 프록시가 붙이는 `Authorization` 값이다(로그인별 목 상태의 키).
 */
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH';
type CallOptions = { body?: unknown; auth?: string };

/** 응답 본문과 함께 HTTP 상태를 돌려준다 */
const mockCall = async (
  method: Method,
  path: string,
  options: CallOptions = {},
): Promise<{ status: number; body: unknown }> => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (options.auth) headers.set('Authorization', options.auth);
  const response = await getResponse(
    handlers,
    new Request(new URL(`${API_BASE_URL}${path}`, ORIGIN), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    { baseUrl: ORIGIN },
  );
  if (!response) throw new Error(`목 핸들러 없음: ${method} ${path}`);
  const body: unknown = await response.json();
  return { status: response.status, body };
};

export const mockApi = async (
  method: Method,
  path: string,
  options: CallOptions = {},
): Promise<unknown> => (await mockCall(method, path, options)).body;

/** 상태를 바꾸는 쓰기 한 건. 계약 테스트가 전부 보낸 뒤 GET 응답을 다시 검사한다 */
type MockWrite = [method: 'POST' | 'PUT' | 'PATCH', path: string, body?: unknown];

const SUPPLIER_EDIT = {
  supplierName: '대양상사 2',
  supplierEmail: 'new@supplier.co.kr',
  supplierPhone: '02-111-2222',
  supplierBaseAddress: '부산광역시 해운대구',
  supplierDetailAddress: '3층',
  category: 'PARTS',
  statusCode: 'INACTIVE',
  deliverLeadTime: 9,
  managerName: '새 담당',
  managerPhone: '010-0000-1111',
  managerEmail: 'new-manager@supplier.co.kr',
};

const WAREHOUSE_EDIT = {
  warehouseName: '2공장 창고',
  warehouseType: 'PRODUCT',
  location: '인천 서구',
  managerId: 'mgr-001',
  warehouseStatusCode: 'INACTIVE',
  note: '이전 예정',
};

const CUSTOMER_EDIT = {
  customerName: '한빛전자 2',
  statusCode: 'INACTIVE',
  manager: { name: '새 담당', mobile: '010-9999-8888', email: 'new@hanbit.co.kr' },
};

/** 수정과 상태 변경. id 는 기본 목 행의 id 를 받아 실제로 보낼 id 를 돌려준다 */
const writesFor = (id: (seed: string) => string): MockWrite[] => [
  ['POST', `/scm-pp/mm/purchase-requisitions/${id('pr-001')}/reject`, { comment: '예산 초과' }],
  ['POST', `/scm-pp/mm/purchase-orders/${id('po-001')}/approve`],
  ['POST', `/scm-pp/mm/${id('po-001')}/start-delivery`],
  ['PATCH', `/scm-pp/mm/supplier/${id('sup-001')}`, SUPPLIER_EDIT],
  ['POST', '/business/hrm/payroll/complete', { payrollId: id('pay-001') }],
  ['PATCH', `/business/hrm/leave/request/${id('leave-001')}/release`],
  [
    'PATCH',
    `/business/hrm/program/${id('prog-001')}`,
    { programName: '안전 교육 2', statusCode: 'COMPLETED' },
  ],
  ['POST', `/business/hrm/program/${id('emp-001')}`, { programId: 'prog-001' }],
  [
    'PATCH',
    `/business/hrm/departments/${id('dept-001')}`,
    { managerId: 'emp-002', description: '해외 영업' },
  ],
  [
    'PUT',
    `/business/hrm/time-record/${id('time-001')}`,
    { checkInTime: '2026-01-28T08:30:00', checkOutTime: '2026-01-28T17:30:00' },
  ],
  [
    'PATCH',
    `/business/hrm/employee/${id('emp-001')}`,
    { employeeName: '홍길순', departmentId: 'dept-002', positionId: 'pos-002' },
  ],
  ['POST', '/business/sd/quotations/confirm', { quotationId: id('qt-002') }],
  ['POST', `/business/sd/quotations/${id('qt-002')}/approve-order`],
  ['PATCH', `/business/sd/customers/${id('cus-001')}`, CUSTOMER_EDIT],
  ['PATCH', `/scm-pp/sales-orders/${id('so-002')}/status`, { itemIds: ['item-1002'] }],
  ['PATCH', `/scm-pp/iv/items/${id('item-1001')}/safety-stock?safetyStock=777`],
  [
    'POST',
    '/scm-pp/iv/stock-transfers',
    {
      fromWarehouseId: 'wh-001',
      toWarehouseId: 'wh-002',
      itemId: id('item-1001'),
      stockQuantity: 3,
      uomName: 'EA',
      reason: '재배치',
    },
  ],
  ['PUT', `/scm-pp/iv/warehouses/${id('wh-001')}`, WAREHOUSE_EDIT],
  ['PATCH', `/scm-pp/pp/boms/${id('bom-001')}`, { version: 'v1', statusCode: '비활성' }],
  ['PUT', `/scm-pp/pp/mes/${id('mes-001')}/operations/${id('op-002')}/start`],
  ['PUT', `/scm-pp/pp/mes/${id('mes-001')}/operations/${id('op-002')}/complete`],
  ['PUT', `/scm-pp/pp/mes/${id('mes-001')}/start`],
  ['PUT', `/scm-pp/pp/mes/${id('mes-001')}/complete`],
  ['POST', `/business/fcm/invoice/ar/${id('inv-ar-001')}/receivable/complete`],
  ['POST', `/business/fcm/invoice/ap/receivable/request?invoiceId=${id('inv-ap-001')}`],
  ['POST', `/business/fcm/invoice/ap/${id('inv-ap-001')}/payable/complete`],
  // 위와 같은 행의 반대 쓰기. 다른 id 로 보낸다(같은 id 면 뒤 쓰기가 앞 결과를 덮는다)
  ['POST', `/scm-pp/mm/purchase-requisitions/${id('pr-002')}/release`],
  ['POST', `/scm-pp/mm/purchase-orders/${id('po-002')}/reject`, { reason: '단가 불일치' }],
  ['PATCH', `/business/hrm/leave/request/${id('leave-002')}/reject`],
];

/** 목록에 새 행을 만드는 쓰기 */
const CREATES: MockWrite[] = [
  [
    'POST',
    '/scm-pp/mm/purchase-requisitions',
    {
      items: [
        {
          itemName: '볼트 M8',
          quantity: 10,
          uomName: 'EA',
          expectedUnitPrice: 500,
          preferredSupplierName: '대양상사',
          dueDate: '2026-12-01',
          purpose: '보충',
        },
      ],
    },
  ],
  [
    'POST',
    '/scm-pp/mm/stock-purchase-requisitions',
    { items: [{ productId: 'item-1003', quantity: 30, mrpRunId: 'mrp-003' }] },
  ],
  [
    'POST',
    '/scm-pp/mm/supplier',
    {
      supplierInfo: {
        supplierName: '새 공급사',
        supplierEmail: 'hello@new-supplier.co.kr',
        supplierPhone: '031-123-4567',
        supplierBaseAddress: '경기도 화성시',
        supplierDetailAddress: null,
        category: 'MATERIAL',
        deliveryLeadTime: 7,
      },
      managerInfo: {
        managerName: '김담당',
        managerPhone: '010-1212-3434',
        managerEmail: 'kim@new-supplier.co.kr',
      },
      materialList: [],
    },
  ],
  [
    'POST',
    '/business/hrm/program',
    {
      programName: '품질 교육',
      category: 'QUALITY',
      trainingHour: 8,
      isOnline: false,
      startDate: '2026-12-01',
      capacity: 20,
      requiredDepartments: [],
      requiredPositions: [],
      description: '신규 품질 기준',
    },
  ],
  [
    'POST',
    '/business/hrm/employee/signup',
    {
      name: '김신입',
      departmentId: 'dept-002',
      positionId: 'pos-002',
      email: 'new@everp.co.kr',
      phoneNumber: '010-7777-8888',
      hireDate: '2026-11-12',
      birthDate: '1998-05-05',
      baseAddress: '서울특별시 마포구',
      detailAddress: '101호',
    },
  ],
  [
    'POST',
    '/business/sd/quotations',
    { items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }], note: '신규' },
  ],
  [
    'POST',
    '/business/sd/customers',
    {
      companyName: '신규상사',
      businessNumber: '111-22-33333',
      ceoName: '최대표',
      contactPhone: '02-333-4444',
      contactEmail: 'contact@new.co.kr',
      zipCode: '04000',
      address: '서울특별시 마포구',
      detailAddress: '2층',
      manager: { name: '박담당', mobile: '010-5555-4444', email: 'park@new.co.kr' },
      note: '',
    },
  ],
  [
    'POST',
    '/scm-pp/iv/warehouses',
    {
      warehouseName: '3공장 창고',
      warehouseType: 'RAW',
      location: '부산',
      managerId: 'mgr-001',
      note: '',
    },
  ],
  ['POST', '/scm-pp/pp/boms', { productName: '펌프 B', unit: 'EA', items: [] }],
  ['POST', '/scm-pp/pp/quotations/confirm', { quotationIds: ['qt-001', 'qt-003'] }],
  [
    'POST',
    '/scm-pp/pp/mrp/convert',
    { items: [{ quotationId: 'qt-004', itemId: 'item-1003', quantity: 40 }] },
  ],
];

const isSuccess = (body: unknown) =>
  typeof body === 'object' && body !== null && 'success' in body && body.success === true;

/**
 * 결과를 기억하는 쓰기를 전부 보낸다(40종, `src/test/mockApi.test.ts` 가 핸들러 목록과 맞춰 본다).
 * 계약 테스트는 상세를 `id-1` 로 불러서, 목록의 기본 행과 `id-1` 양쪽에 같은 쓰기를 보낸다.
 * 보낸 요청과 성공 여부(2xx 이고 본문의 `success` 가 true)를 돌려준다
 */
export const applyAllMockWrites = async (auth?: string) => {
  const writes = [...writesFor((seed) => seed), ...writesFor(() => 'id-1'), ...CREATES];
  const sent: Array<{ method: string; path: string; ok: boolean }> = [];
  for (const [method, path, body] of writes) {
    const response = await mockCall(method, path, { body, auth });
    const ok = response.status >= 200 && response.status < 300 && isSuccess(response.body);
    sent.push({ method, path, ok });
  }
  return sent;
};
