// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { mockApi } from '@/test/mockApi';
import { attendanceDays } from './attendanceSummary.handlers';
import { todayKey } from './seed';

/**
 * 목이 쓰기 결과를 기억해 뒤의 목록과 상세가 바뀐 상태를 준다(카드 "목이 쓰기 결과를 따르게").
 * 테스트끼리는 공통 setup(vitest.setup.ts)의 afterEach 가 저장소를 비워 서로 영향을 주지 않는다.
 */
const get = (path: string, auth?: string) => mockApi('GET', path, { auth });
const post = (path: string, body?: unknown, auth?: string) => mockApi('POST', path, { body, auth });
const put = (path: string, body?: unknown) => mockApi('PUT', path, { body });
const patch = (path: string, body?: unknown) => mockApi('PATCH', path, { body });

/** 목록 응답의 행들(순서대로). 행마다 적은 필드만 본다 */
const content = (...rows: object[]) => ({ data: { content: rows } });
/** 긴 목록 어딘가에 이 필드를 가진 행이 있다 */
const row = (fields: object) => ({
  data: { content: expect.arrayContaining([expect.objectContaining(fields)]) },
});

/**
 * 목록 전부를 한 쪽으로 받는다. 목이 쪽을 자르고 기본 행이 12~42건이다(카드 "데모 데이터 채우기").
 * 예전 테스트는 목록이 1행이라 `content(그 행)` 으로 봤다. 이제는 그 id 의 행과 총 건수를 같이 본다
 */
const all = (path: string, auth?: string) => get(`${path}?page=0&size=1000`, auth);
const rowOf = (total: number, fields: object) => ({
  data: {
    content: expect.arrayContaining([expect.objectContaining(fields)]),
    page: { totalElements: total },
  },
});
const TotalBody = z.object({ data: z.object({ page: z.object({ totalElements: z.number() }) }) });
const RowsBody = z.object({
  data: z.object({ content: z.array(z.record(z.string(), z.unknown())) }),
});
/** 거래 목록(최신순)의 맨 앞 행들 */
const firstRows = (body: unknown, n: number) => RowsBody.parse(body).data.content.slice(0, n);
/** 마스터 목록(번호순)의 맨 끝 행 */
const lastRow = (body: unknown) => RowsBody.parse(body).data.content.at(-1);
/** 목록 총 건수. 날짜로 만드는 목록(휴가, 출퇴근, 매출 전표)은 쓰기 전 총 건수를 받아 쓰기 뒤와 견준다 */
const totalOf = async (path: string) =>
  z
    .object({ data: z.object({ page: z.object({ totalElements: z.number() }) }) })
    .parse(await get(`${path}${path.includes('?') ? '&' : '?'}page=0&size=1`)).data.page
    .totalElements;
/** 이번 달 emp-001 의 급여 id 와 이번 달 첫 공급사의 매입 전표 id(카드 "데모 목록 인사 재무") */
const THIS_MONTH = todayKey().slice(0, 7).replace('-', '');

describe('구매 목 상태', () => {
  const REQUESTS = '/scm-pp/mm/purchase-requisitions';
  const ORDERS = '/scm-pp/mm/purchase-orders';
  const SUPPLIERS = '/scm-pp/mm/supplier';

  it('구매 요청을 반려하면 목록과 상세가 REJECTED 다', async () => {
    await post(`${REQUESTS}/pr-001/reject`, { comment: '예산 초과' });
    expect(await all(REQUESTS)).toMatchObject(
      rowOf(15, { purchaseRequisitionId: 'pr-001', statusCode: 'REJECTED' }),
    );
    expect(await get(`${REQUESTS}/pr-001`)).toMatchObject({ data: { statusCode: 'REJECTED' } });
  });

  it('구매 요청을 승인하면 목록과 상세가 APPROVAL 이다(게이트웨이 MmController.java:228)', async () => {
    await post(`${REQUESTS}/pr-001/release`);
    expect(await all(REQUESTS)).toMatchObject(
      rowOf(15, { purchaseRequisitionId: 'pr-001', statusCode: 'APPROVAL' }),
    );
    expect(await get(`${REQUESTS}/pr-001`)).toMatchObject({ data: { statusCode: 'APPROVAL' } });
  });

  it('다른 Authorization 은 처음 상태를 보고, Authorization 이 없는 요청도 따로다', async () => {
    await post(`${REQUESTS}/pr-001/reject`, { comment: '예산 초과' }, 'Bearer visitor-a');
    const pr001 = (statusCode: string) =>
      rowOf(15, { purchaseRequisitionId: 'pr-001', statusCode });
    expect(await all(REQUESTS, 'Bearer visitor-a')).toMatchObject(pr001('REJECTED'));
    expect(await all(REQUESTS, 'Bearer visitor-b')).toMatchObject(pr001('PENDING'));
    expect(await all(REQUESTS)).toMatchObject(pr001('PENDING'));
  });

  it('이미 반려한 요청을 또 반려해도 성공으로 답한다(실서버 동작 미확인)', async () => {
    await post(`${REQUESTS}/pr-001/reject`, { comment: '예산 초과' });
    expect(await post(`${REQUESTS}/pr-001/reject`, { comment: '한 번 더' })).toMatchObject({
      success: true,
    });
    expect(await all(REQUESTS)).toMatchObject(
      rowOf(15, { purchaseRequisitionId: 'pr-001', statusCode: 'REJECTED' }),
    );
  });

  it('구매 요청을 만들면 목록 맨 위(오늘 날짜, 최신순)에 PENDING 새 행이 생기고 금액은 수량 × 단가 합이다', async () => {
    await post(REQUESTS, {
      items: [
        { itemName: '볼트', quantity: 10, uomName: 'EA', expectedUnitPrice: 500 },
        { itemName: '너트', quantity: 4, uomName: 'EA', expectedUnitPrice: 250 },
      ],
    });
    const body = await get(REQUESTS);
    expect(body).toMatchObject({ data: { page: { totalElements: 16 } } });
    // 기본 행 15건 다음 번호. 그 아래는 가장 최근 기본 행
    expect(firstRows(body, 2)).toMatchObject([
      { purchaseRequisitionId: 'pr-016', statusCode: 'PENDING', totalAmount: 6000 },
      { purchaseRequisitionId: 'pr-015' },
    ]);
  });

  it('한 로그인이 만든 행은 목록마다 50개까지만 남고, 오래된 것부터 빠진다. id 는 겹치지 않는다', async () => {
    for (let i = 1; i <= 52; i += 1) {
      await post(REQUESTS, {
        items: [{ itemName: '볼트', quantity: 1, uomName: 'EA', expectedUnitPrice: i }],
      });
    }
    const body = await all(REQUESTS);
    const parsed = z
      .object({
        data: z.object({
          content: z.array(
            z.object({ purchaseRequisitionId: z.string(), totalAmount: z.number() }),
          ),
        }),
      })
      .parse(body);
    const rows = parsed.data.content;
    // 기본 행 15 + 만든 행 50. 만든 행은 오늘 날짜라 맨 위에 id 내림차순
    expect(rows).toHaveLength(65);
    expect(new Set(rows.map((r) => r.purchaseRequisitionId)).size).toBe(65);
    // 처음 만든 둘(금액 1, 2)이 빠지고 3번째부터 남는다
    expect(rows[0].totalAmount).toBe(52);
    expect(rows[49].totalAmount).toBe(3);
    expect(rows[50].purchaseRequisitionId).toBe('pr-015');
  });

  it('재고성 구매 요청은 구매 요청 목록에 새 행을 만들고, 그 계획 주문을 PENDING 으로 바꾼다', async () => {
    const PLANNED = '/scm-pp/pp/mrp/runs';
    // 처음엔 mrp-003 이 REJECTED 라 화면에서 고를 수 있다
    expect(await get(PLANNED)).toMatchObject(row({ mrpRunId: 'mrp-003', status: 'REJECTED' }));
    await post('/scm-pp/mm/stock-purchase-requisitions', {
      items: [{ productId: 'item-wh-004', quantity: 30, mrpRunId: 'mrp-003' }],
    });
    const body = await get(REQUESTS);
    expect(body).toMatchObject({ data: { page: { totalElements: 16 } } });
    expect(firstRows(body, 1)).toMatchObject([
      { purchaseRequisitionId: 'pr-016', statusCode: 'PENDING' },
    ]);
    expect(await get(PLANNED)).toMatchObject(row({ mrpRunId: 'mrp-003', status: 'PENDING' }));
  });

  it('발주서를 승인하면 APPROVAL, 배송을 시작하면 DELIVERING 이다(목록과 상세)', async () => {
    await post(`${ORDERS}/po-001/approve`);
    expect(await all(ORDERS)).toMatchObject(
      rowOf(15, { purchaseOrderId: 'po-001', statusCode: 'APPROVAL' }),
    );
    expect(await get(`${ORDERS}/po-001`)).toMatchObject({ data: { statusCode: 'APPROVAL' } });

    await post('/scm-pp/mm/po-001/start-delivery');
    expect(await all(ORDERS)).toMatchObject(
      rowOf(15, { purchaseOrderId: 'po-001', statusCode: 'DELIVERING' }),
    );
    expect(await get(`${ORDERS}/po-001`)).toMatchObject({ data: { statusCode: 'DELIVERING' } });
  });

  it('발주서를 반려하면 REJECTED 다', async () => {
    await post(`${ORDERS}/po-001/reject`, { reason: '단가 불일치' });
    expect(await all(ORDERS)).toMatchObject(
      rowOf(15, { purchaseOrderId: 'po-001', statusCode: 'REJECTED' }),
    );
    expect(await get(`${ORDERS}/po-001`)).toMatchObject({ data: { statusCode: 'REJECTED' } });
  });

  it('공급업체를 등록하면 목록 끝(번호순)에 새 행이 생긴다', async () => {
    await post(SUPPLIERS, {
      supplierInfo: {
        supplierName: '새 공급사',
        supplierEmail: 'hello@new-supplier.co.kr',
        supplierPhone: '031-123-4567',
        supplierBaseAddress: '경기도 화성시',
        supplierDetailAddress: null,
        category: 'MATERIAL',
        deliveryLeadTime: 7,
      },
      managerInfo: { managerName: '김담당', managerPhone: '010', managerEmail: 'kim@x.kr' },
      materialList: [],
    });
    const body = await all(SUPPLIERS);
    // 기본 공급사 6곳 다음 번호
    expect(body).toMatchObject({ data: { page: { totalElements: 7 } } });
    expect(lastRow(body)).toMatchObject({
      statusCode: 'ACTIVE',
      supplierInfo: { supplierId: 'sup-007', supplierName: '새 공급사', deliveryLeadTime: 7 },
    });
  });

  it('공급업체를 수정하면 목록과 상세가 바뀐 값을 준다', async () => {
    await patch(`${SUPPLIERS}/sup-001`, {
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
    });
    const edited = {
      supplierName: '대양상사 2',
      supplierStatusCode: 'INACTIVE',
      category: 'PARTS',
      deliveryLeadTime: 9,
    };
    expect(await all(SUPPLIERS)).toMatchObject(
      rowOf(6, {
        statusCode: 'INACTIVE',
        supplierInfo: expect.objectContaining({ supplierId: 'sup-001', ...edited }),
      }),
    );
    expect(await get(`${SUPPLIERS}/sup-001`)).toMatchObject({
      data: { supplierInfo: edited, managerInfo: { managerName: '새 담당' } },
    });
  });
});

describe('인사 목 상태', () => {
  const HRM = '/business/hrm';

  it('급여는 처음에 PAYROLL_UNPAID 이고, 지급 완료 뒤 목록과 상세가 PAYROLL_PAID 다', async () => {
    // 이번 달 급여(연월이 없으면 이번 달)는 재직자 40명
    const PAY = `pay-${THIS_MONTH}-001`;
    expect(await all(`${HRM}/payroll`)).toMatchObject(
      rowOf(40, { payrollId: PAY, pay: expect.objectContaining({ statusCode: 'PAYROLL_UNPAID' }) }),
    );
    expect(await get(`${HRM}/payroll/${PAY}`)).toMatchObject({
      data: { statusCode: 'PAYROLL_UNPAID' },
    });

    await post(`${HRM}/payroll/complete`, { payrollId: PAY });
    expect(await all(`${HRM}/payroll`)).toMatchObject(
      rowOf(40, { payrollId: PAY, pay: expect.objectContaining({ statusCode: 'PAYROLL_PAID' }) }),
    );
    expect(await get(`${HRM}/payroll/${PAY}`)).toMatchObject({
      data: { statusCode: 'PAYROLL_PAID' },
    });
  });

  it('급여 상태 드롭다운의 key 가 게이트웨이 enum(PayrollStatus)이다', async () => {
    expect(await get(`${HRM}/payroll/statuses`)).toMatchObject({
      data: [{ key: 'PAYROLL_UNPAID' }, { key: 'PAYROLL_PAID' }],
    });
  });

  it('휴가를 승인하면 APPROVED, 반려하면 REJECTED 다', async () => {
    const total = await totalOf(`${HRM}/leave-request`);
    await patch(`${HRM}/leave/request/leave-001/release`);
    expect(await all(`${HRM}/leave-request`)).toMatchObject(
      rowOf(total, { leaveRequestId: 'leave-001', status: 'APPROVED' }),
    );
    await patch(`${HRM}/leave/request/leave-001/reject`);
    expect(await all(`${HRM}/leave-request`)).toMatchObject(
      rowOf(total, { leaveRequestId: 'leave-001', status: 'REJECTED' }),
    );
  });

  it('교육 프로그램을 수정하면 목록과 상세의 이름과 상태가 바뀐다', async () => {
    await patch(`${HRM}/program/prog-001`, { programName: '안전 교육 2', statusCode: 'COMPLETED' });
    const edited = { programName: '안전 교육 2', statusCode: 'COMPLETED' };
    expect(await all(`${HRM}/program`)).toMatchObject(
      rowOf(12, { programId: 'prog-001', ...edited }),
    );
    expect(await get(`${HRM}/program/prog-001`)).toMatchObject({ data: edited });
  });

  it('교육 프로그램을 추가하면 목록 끝에 새 행이 생긴다', async () => {
    await post(`${HRM}/program`, {
      programName: '품질 교육',
      category: 'QUALITY',
      trainingHour: 8,
      isOnline: false,
      startDate: '2026-12-01',
      capacity: 20,
      requiredDepartments: [],
      requiredPositions: [],
      description: '신규 품질 기준',
    });
    // 씨앗 12개(카드 "데모 목록 인사 재무") 다음 번호
    const programs = await all(`${HRM}/program`);
    expect(programs).toMatchObject(rowOf(13, { programId: 'prog-001' }));
    expect(lastRow(programs)).toMatchObject({
      programId: 'prog-013',
      programName: '품질 교육',
      category: 'QUALITY',
      trainingHour: 8,
      capacity: 20,
    });
  });

  /**
   * emp-001 의 씨앗 교육 이력(카드 "데모 목록 인사 재무" 결정 5). 진행 중 프로그램 prog-001 은 이미 대상이라
   * 지정은 아직 아무도 대상이 아닌 모집 중 프로그램 prog-010(산업 안전 보건)으로 한다
   */
  const HISTORY_EMP_001 = [
    { programId: 'prog-001', programStatus: 'INCOMPLETED' },
    { programId: 'prog-002', programStatus: 'COMPLETED' },
    { programId: 'prog-003', programStatus: 'COMPLETED' },
    { programId: 'prog-005', programStatus: 'COMPLETED' },
    { programId: 'prog-006', programStatus: 'COMPLETED' },
    { programId: 'prog-007', programStatus: 'COMPLETED' },
    { programId: 'prog-008', programStatus: 'INCOMPLETED' },
    { programId: 'prog-009', programStatus: 'INCOMPLETED' },
  ];

  it('직원에게 교육을 지정하면 그 직원 교육 상세에 미완료 이력이 생기고 목록의 진행 중 수가 는다', async () => {
    await post(`${HRM}/program/emp-001`, { programId: 'prog-010' });
    expect(await get(`${HRM}/training/employee/emp-001`)).toMatchObject({
      data: {
        programHistory: [
          ...HISTORY_EMP_001,
          { programId: 'prog-010', programName: '산업 안전 보건', programStatus: 'INCOMPLETED' },
        ],
      },
    });
    expect(await get(`${HRM}/training-status`)).toMatchObject({
      data: {
        items: expect.arrayContaining([
          expect.objectContaining({ employeeId: 'emp-001', inProgressCount: 4 }),
        ]),
      },
    });
  });

  it('같은 프로그램을 같은 직원에게 또 지정해도 성공이고 이력은 하나다', async () => {
    await post(`${HRM}/program/emp-001`, { programId: 'prog-010' });
    expect(await post(`${HRM}/program/emp-001`, { programId: 'prog-010' })).toMatchObject({
      success: true,
    });
    expect(await get(`${HRM}/training/employee/emp-001`)).toMatchObject({
      data: { programHistory: [...HISTORY_EMP_001, { programId: 'prog-010' }] },
    });
    expect(await get(`${HRM}/training-status`)).toMatchObject({
      data: {
        items: expect.arrayContaining([
          expect.objectContaining({ employeeId: 'emp-001', inProgressCount: 4 }),
        ]),
      },
    });
  });

  it('이미 이력에 있는 프로그램을 지정해도 이력은 그대로다', async () => {
    await post(`${HRM}/program/emp-001`, { programId: 'prog-001' });
    expect(await get(`${HRM}/training/employee/emp-001`)).toMatchObject({
      data: { programHistory: HISTORY_EMP_001 },
    });
  });

  it('부서를 수정하면 목록의 설명과 부서장 id 가 바뀐다', async () => {
    await patch(`${HRM}/departments/dept-001`, { managerId: 'emp-002', description: '해외 영업' });
    // 부서장 이름도 그 id 의 직원(김영업)을 따른다(부서원이 생겨서, 카드 "데모 목록 인사 재무")
    expect(await get(`${HRM}/departments`)).toMatchObject({
      data: {
        content: expect.arrayContaining([
          expect.objectContaining({
            departmentId: 'dept-001',
            managerId: 'emp-002',
            managerName: '김영업',
            description: '해외 영업',
          }),
        ]),
      },
    });
  });

  it('출퇴근 기록을 수정하면 목록의 출근, 퇴근 시각이 바뀐다', async () => {
    // 출퇴근 기록은 근태 집계의 날마다 만든다(카드 "데모 목록 인사 재무"). 마지막 근무일의 첫 행을 고친다
    const date = attendanceDays().days.at(-1)?.date ?? '';
    const list = `${HRM}/time-record?date=${date}`;
    const before = await get(`${list}&page=0&size=1000`);
    const first = RowsBody.parse(before).data.content[0];
    const total = await totalOf(list);
    const times = { checkInTime: `${date}T08:30:00`, checkOutTime: `${date}T17:30:00` };
    await put(`${HRM}/time-record/${String(first.timerecordId)}`, times);
    expect(await get(`${list}&page=0&size=1000`)).toMatchObject(
      rowOf(total, { timerecordId: first.timerecordId, ...times }),
    );
  });

  it('직원을 수정하면 목록의 이름, 부서, 직급이 바뀐다', async () => {
    await patch(`${HRM}/employee/emp-001`, {
      employeeName: '홍길순',
      departmentId: 'dept-002',
      positionId: 'pos-002',
    });
    expect(await all(`${HRM}/employee`)).toMatchObject(
      rowOf(42, { employeeId: 'emp-001', name: '홍길순', department: '구매팀', position: '사원' }),
    );
  });

  it('직원을 등록하면 목록 끝(번호순)에 새 행이 생긴다', async () => {
    await post(`${HRM}/employee/signup`, {
      name: '김신입',
      departmentId: 'dept-002',
      positionId: 'pos-002',
      email: 'new@everp.co.kr',
      phoneNumber: '010-7777-8888',
      hireDate: '2026-11-12',
      birthDate: '1998-05-05',
      baseAddress: '서울특별시 마포구',
      detailAddress: '101호',
    });
    const body = await all(`${HRM}/employee`);
    // 기본 직원 42명 다음 번호
    expect(body).toMatchObject({ data: { page: { totalElements: 43 } } });
    expect(lastRow(body)).toMatchObject({
      employeeId: 'emp-043',
      name: '김신입',
      department: '구매팀',
      position: '사원',
      hireDate: '2026-11-12',
    });
  });
});

describe('영업 목 상태', () => {
  const SD = '/business/sd';

  it('견적 검토를 요청하면 목록과 상세가 REVIEW 다', async () => {
    await post(`${SD}/quotations/confirm`, { quotationId: 'qt-002' });
    expect(await all(`${SD}/quotations`)).toMatchObject(
      rowOf(16, { quotationId: 'qt-002', statusCode: 'REVIEW' }),
    );
    expect(await get(`${SD}/quotations/qt-002`)).toMatchObject({ data: { statusCode: 'REVIEW' } });
  });

  it('즉시 납품하면 견적이 APPROVAL 이고 주문 목록에 READY_FOR_SHIPMENT 주문이 하나 생긴다', async () => {
    const total = async () =>
      z
        .object({ data: z.object({ page: z.object({ totalElements: z.number() }) }) })
        .parse(await get(`${SD}/orders`)).data.page.totalElements;
    const before = await total();
    await post(`${SD}/quotations/qt-002/approve-order`);
    // 두 번 눌러도 주문은 하나다
    await post(`${SD}/quotations/qt-002/approve-order`);
    expect(await all(`${SD}/quotations`)).toMatchObject(
      rowOf(16, { quotationId: 'qt-002', statusCode: 'APPROVAL' }),
    );
    expect(await total()).toBe(before + 1);
    // 오늘 만든 주문이라 최신순 맨 위
    expect(firstRows(await get(`${SD}/orders`), 1)).toMatchObject([
      {
        salesOrderId: 'so-qt-002',
        customerName: '대성기계',
        totalAmount: 4300000,
        statusCode: 'READY_FOR_SHIPMENT',
      },
    ]);
  });

  it('견적을 등록하면 목록 맨 위(오늘 날짜, 최신순)에 PENDING 새 행이 생긴다', async () => {
    await post(`${SD}/quotations`, {
      items: [{ itemId: 'item-1001', quantity: 5, unitPrice: 12000 }],
      note: '신규',
    });
    const body = await get(`${SD}/quotations`);
    // 기본 견적 16건 다음 번호
    expect(body).toMatchObject({ data: { page: { totalElements: 17 } } });
    expect(firstRows(body, 2)).toMatchObject([
      { quotationId: 'qt-017', statusCode: 'PENDING', totalAmount: 60000 },
      { quotationId: 'qt-016' },
    ]);
  });

  it('고객을 등록하면 목록 끝(번호순)에 새 행이 생긴다', async () => {
    await post(`${SD}/customers`, {
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
    });
    const customers = z
      .object({
        data: z.object({
          customers: z.array(z.record(z.string(), z.unknown())),
          page: z.object({ totalElements: z.number() }),
        }),
      })
      .parse(await get(`${SD}/customers?page=0&size=1000`)).data;
    // 기본 고객 15곳 다음 번호
    expect(customers.page.totalElements).toBe(16);
    expect(customers.customers.at(-1)).toMatchObject({
      customerId: 'cus-016',
      customerName: '신규상사',
      statusCode: 'ACTIVE',
      manager: { managerName: '박담당' },
      orderCount: 0,
    });
  });

  it('고객을 수정하면 목록과 상세가 바뀐 값을 준다', async () => {
    await patch(`${SD}/customers/cus-001`, {
      customerName: '한빛전자 2',
      statusCode: 'INACTIVE',
      manager: { name: '새 담당', mobile: '010-9999-8888', email: 'new@hanbit.co.kr' },
    });
    expect(await get(`${SD}/customers`)).toMatchObject({
      data: {
        customers: expect.arrayContaining([
          expect.objectContaining({
            customerId: 'cus-001',
            customerName: '한빛전자 2',
            statusCode: 'INACTIVE',
            manager: expect.objectContaining({ managerName: '새 담당' }),
          }),
        ]),
        page: { totalElements: 15 },
      },
    });
    expect(await get(`${SD}/customers/cus-001`)).toMatchObject({
      data: {
        customerName: '한빛전자 2',
        statusCode: 'INACTIVE',
        manager: { managerName: '새 담당', managerPhone: '010-9999-8888' },
        ceoName: '박대표',
      },
    });
  });
});

describe('재고와 창고 목 상태', () => {
  const SCM = '/scm-pp';

  it('배송을 시작하면 출고 준비 완료 목록에서 그 주문이 빠진다', async () => {
    // 출고 준비는 영업 주문의 출고 준비 전부라 건수가 날마다 다르다(카드 "데모 목록 재고 물류"). 전후 차이와 그 행을 본다
    const READY = `${SCM}/sales-orders/ready-to-ship`;
    const before = TotalBody.parse(await all(READY)).data.page.totalElements;
    expect(await all(READY)).toMatchObject(rowOf(before, { salesOrderId: 'so-002' }));
    await patch(`${SCM}/sales-orders/so-002/status`, { itemIds: ['item-1002'] });
    const after = await all(READY);
    expect(RowsBody.parse(after).data.content.map((r) => r.salesOrderId)).not.toContain('so-002');
    expect(after).toMatchObject({ data: { page: { totalElements: before - 1 } } });
  });

  it('안전재고를 수정하면 재고 상세와 목록의 그 품목 안전재고가 바뀐다', async () => {
    await patch(`${SCM}/iv/items/item-1001/safety-stock?safetyStock=777`);
    expect(await get(`${SCM}/iv/items/item-1001`)).toMatchObject({ data: { safetyStock: 777 } });
    // 재고 목록은 품목표 14개(카드 "데모 목록 재고 물류")
    expect(await all(`${SCM}/iv/inventory-items`)).toMatchObject(
      rowOf(14, { itemId: 'item-1001', safetyStock: 777 }),
    );
    // 다른 품목(베어링 B, 처음 안전재고 50)은 그대로다. 목록에 없는 id 는 404 라 목록의 다른 품목으로 본다(카드 "없는 건은 404")
    expect(await get(`${SCM}/iv/items/item-1002`)).toMatchObject({ data: { safetyStock: 50 } });
  });

  it('창고 3D 가 쓰는 창고별 재고 조회도 같은 품목은 같은 수량이고, 안전재고 수정과 재고 이동을 따른다', async () => {
    const BY_WAREHOUSE = `${SCM}/iv/inventory-items?type=WAREHOUSE_NAME&keyword=${encodeURIComponent('1공장 창고')}&size=20`;
    // 일반 목록과 상세가 주는 값(현재고 120, 안전재고 50)과 같다
    expect(await get(BY_WAREHOUSE)).toMatchObject(
      row({ itemId: 'item-1001', currentStock: 120, safetyStock: 50, statusCode: 'NORMAL' }),
    );

    await patch(`${SCM}/iv/items/item-1001/safety-stock?safetyStock=777`);
    await post(`${SCM}/iv/stock-transfers`, {
      fromWarehouseId: 'wh-001',
      toWarehouseId: 'wh-002',
      itemId: 'item-1001',
      stockQuantity: 3,
      uomName: 'EA',
      reason: '재배치',
    });
    expect(await get(BY_WAREHOUSE)).toMatchObject(
      row({ itemId: 'item-1001', currentStock: 117, safetyStock: 777 }),
    );
    // 이 조회에만 있는 품목도 따른다. 예전 item-wh-002 는 베어링 B 였는데 안전재고 목록과 같은 item-1002 로 바뀌어(카드 "목 데이터 현실성") 볼트 M6 로 본다
    await patch(`${SCM}/iv/items/item-wh-003/safety-stock?safetyStock=5`);
    expect(await get(BY_WAREHOUSE)).toMatchObject(row({ itemId: 'item-wh-003', safetyStock: 5 }));
  });

  it('안전재고 수정에 safetyStock 이 없으면 400 이고 값은 그대로다(0 으로 저장하지 않는다)', async () => {
    expect(await patch(`${SCM}/iv/items/item-1001/safety-stock`)).toMatchObject({
      status: 400,
      success: false,
    });
    expect(await patch(`${SCM}/iv/items/item-1001/safety-stock?safetyStock=abc`)).toMatchObject({
      status: 400,
      success: false,
    });
    expect(await get(`${SCM}/iv/items/item-1001`)).toMatchObject({ data: { safetyStock: 50 } });
  });

  it('부족 재고 품목의 안전재고를 수정하면 안전재고 화면 목록도 바뀐다', async () => {
    await patch(`${SCM}/iv/items/item-1002/safety-stock?safetyStock=30`);
    // 부족 품목은 구리선, 베어링 B, 너트 M6, 와셔 4개(현재고 < 안전재고). 베어링 B 는 20 < 30 이라 남고 주의가 된다
    expect(await all(`${SCM}/iv/shortage`)).toMatchObject(
      rowOf(4, { itemId: 'item-1002', safetyStock: 30, statusCode: 'CAUTION' }),
    );
    expect(await get(`${SCM}/iv/shortage/preview`)).toMatchObject(
      row({ itemId: 'item-1002', safetyStock: 30, statusCode: 'CAUTION' }),
    );
  });

  it('재고를 다른 창고로 옮기면 출발 창고 상세와 목록의 현재고가 그만큼 준다', async () => {
    await post(`${SCM}/iv/stock-transfers`, {
      fromWarehouseId: 'wh-001',
      toWarehouseId: 'wh-002',
      itemId: 'item-1001',
      stockQuantity: 3,
      uomName: 'EA',
      reason: '재배치',
    });
    expect(await get(`${SCM}/iv/items/item-1001`)).toMatchObject({
      data: { currentStock: 117, totalAmount: 117 * 12000 },
    });
    expect(await all(`${SCM}/iv/inventory-items`)).toMatchObject(
      rowOf(14, { itemId: 'item-1001', currentStock: 117 }),
    );
  });

  it('창고를 추가하면 목록 끝(번호순)에 새 행이 생긴다', async () => {
    await post(`${SCM}/iv/warehouses`, {
      warehouseName: '3공장 창고',
      warehouseType: 'RAW',
      location: '부산',
      managerId: 'mgr-001',
      note: '',
    });
    const body = await all(`${SCM}/iv/warehouses`);
    // 기본 창고 12곳 다음 번호
    expect(body).toMatchObject({ data: { page: { totalElements: 13 } } });
    expect(lastRow(body)).toMatchObject({
      warehouseId: 'wh-013',
      warehouseName: '3공장 창고',
      location: '부산',
      statusCode: 'ACTIVE',
      manager: '이자재',
    });
  });

  it('창고를 수정하면 목록과 상세의 이름, 유형, 위치, 상태가 바뀐다', async () => {
    await put(`${SCM}/iv/warehouses/wh-001`, {
      warehouseName: '2공장 창고',
      warehouseType: 'PRODUCT',
      location: '인천 서구',
      managerId: 'mgr-001',
      warehouseStatusCode: 'INACTIVE',
      note: '이전 예정',
    });
    const edited = {
      warehouseName: '2공장 창고',
      warehouseType: 'PRODUCT',
      location: '인천 서구',
      statusCode: 'INACTIVE',
    };
    expect(await all(`${SCM}/iv/warehouses`)).toMatchObject(
      rowOf(12, { warehouseId: 'wh-001', ...edited }),
    );
    expect(await get(`${SCM}/iv/warehouses/wh-001`)).toMatchObject({
      data: { warehouseInfo: { ...edited, description: '이전 예정' } },
    });
  });
});

describe('생산 목 상태', () => {
  const PP = '/scm-pp/pp';

  it('BOM 상태를 바꾸면 상세와 목록의 상태와 버전이 바뀐다', async () => {
    await patch(`${PP}/boms/bom-001`, { version: 'v1', statusCode: '비활성' });
    expect(await get(`${PP}/boms/bom-001`)).toMatchObject({
      data: { statusCode: '비활성', version: 'v2' },
    });
    expect(await all(`${PP}/boms`)).toMatchObject(
      rowOf(12, { bomId: 'bom-001', statusCode: '비활성', version: 'v2' }),
    );
  });

  it('옛 버전으로 BOM 을 바꾸면 409 이고 상태는 그대로다', async () => {
    await post(`${PP}/boms/bom-001/simulate-conflict`);
    expect(
      await patch(`${PP}/boms/bom-001`, { version: 'v1', statusCode: '비활성' }),
    ).toMatchObject({ status: 409, success: false });
    expect(await get(`${PP}/boms/bom-001`)).toMatchObject({
      data: { statusCode: '활성', version: 'v2' },
    });
  });

  it('BOM 버전은 로그인별이다. 한 방문자의 충돌 재현이 다른 방문자에게 409 를 내지 않는다', async () => {
    await mockApi('POST', `${PP}/boms/bom-001/simulate-conflict`, { auth: 'Bearer visitor-a' });
    expect(
      await mockApi('PATCH', `${PP}/boms/bom-001`, {
        body: { version: 'v1', statusCode: '비활성' },
        auth: 'Bearer visitor-b',
      }),
    ).toMatchObject({ status: 200, success: true });
  });

  it('BOM 을 등록하면 목록 끝(번호순)에 활성 새 행이 생긴다', async () => {
    await post(`${PP}/boms`, { productName: '펌프 B', unit: 'EA', items: [] });
    const body = await all(`${PP}/boms`);
    // 기본 BOM 12개 다음 번호
    expect(body).toMatchObject({ data: { page: { totalElements: 13 } } });
    expect(lastRow(body)).toMatchObject({
      bomId: 'bom-013',
      productName: '펌프 B',
      statusCode: '활성',
      version: 'v1',
    });
  });

  it('제안 납기를 확정하면 그 견적의 가용 상태가 CHECKED 다', async () => {
    expect(await get(`${PP}/quotations`)).toMatchObject(
      row({ quotationId: 'qt-001', availableStatus: 'UNCHECKED' }),
    );
    await post(`${PP}/quotations/confirm`, { quotationIds: ['qt-001'] });
    expect(await get(`${PP}/quotations`)).toMatchObject(
      row({ quotationId: 'qt-001', availableStatus: 'CHECKED' }),
    );
    // 상태 필터도 바뀐 값을 따른다
    expect(await get(`${PP}/quotations?availableStatusCode=UNCHECKED`)).not.toMatchObject(
      row({ quotationId: 'qt-001' }),
    );
  });

  it('순소요를 계획 주문으로 전환하면 그 견적의 그 품목 전환 상태가 CONVERTED 다', async () => {
    // 첫 쪽 셋째 행: 견적 qt-004 의 알루미늄 판(품목표 item-wh-004)
    const target = { quotationId: 'qt-004', itemId: 'item-wh-004', itemName: '알루미늄 판' };
    expect(await get(`${PP}/quotations/mrp`)).toMatchObject(
      row({ ...target, convertStatus: 'NOT_CONVERTED' }),
    );
    await post(`${PP}/mrp/convert`, {
      items: [{ quotationId: 'qt-004', itemId: 'item-wh-004', quantity: 40 }],
    });
    expect(await get(`${PP}/quotations/mrp`)).toMatchObject(
      row({ ...target, convertStatus: 'CONVERTED' }),
    );
  });

  it('공정을 완료하면 그 공정이 COMPLETED 이고 MES 완료 버튼이 열린다', async () => {
    const DETAIL = `${PP}/mes/mes-001`;
    expect(await get(DETAIL)).toMatchObject({
      data: { canCompleteMes: false, operations: [{}, { statusCode: 'IN_PROGRESS' }] },
    });

    await put(`${DETAIL}/operations/op-002/complete`);
    expect(await get(DETAIL)).toMatchObject({
      data: {
        canCompleteMes: true,
        operations: [
          { mesOperationLogId: 'op-001', statusCode: 'COMPLETED' },
          { mesOperationLogId: 'op-002', statusCode: 'COMPLETED', canComplete: false },
        ],
      },
    });
  });

  it('완료한 공정에 시작을 또 보내도 성공이고 COMPLETED 그대로다', async () => {
    const DETAIL = `${PP}/mes/mes-001`;
    await put(`${DETAIL}/operations/op-002/complete`);
    expect(await put(`${DETAIL}/operations/op-002/start`)).toMatchObject({ success: true });
    expect(await put(`${DETAIL}/operations/op-001/start`)).toMatchObject({ success: true });
    expect(await get(DETAIL)).toMatchObject({
      data: {
        canCompleteMes: true,
        operations: [{ statusCode: 'COMPLETED' }, { statusCode: 'COMPLETED', canStart: false }],
      },
    });
  });

  it('MES 를 완료하면 상세와 목록이 COMPLETED 이고 버튼이 전부 잠긴다', async () => {
    const DETAIL = `${PP}/mes/mes-001`;
    await put(`${DETAIL}/operations/op-002/complete`);
    await put(`${DETAIL}/complete`);
    expect(await get(DETAIL)).toMatchObject({
      data: {
        statusCode: 'COMPLETED',
        progressPercent: 100,
        canStartMes: false,
        canCompleteMes: false,
        operations: [{ canComplete: false }, { canComplete: false }],
      },
    });
    expect(await get(`${PP}/mes`)).toMatchObject(
      row({ mesId: 'mes-001', status: 'COMPLETED', progressRate: 100 }),
    );
    expect(await get(`${PP}/mes?status=COMPLETED`)).toMatchObject(content({ mesId: 'mes-001' }));
  });

  it('목록에서 시작 전인 MES 는 상세에서도 시작 전이고 시작 버튼이 열린다. 시작하면 목록과 상세가 IN_PROGRESS 다', async () => {
    const DETAIL = `${PP}/mes/mes-002`;
    expect(await get(`${PP}/mes`)).toMatchObject(row({ mesId: 'mes-002', status: 'WAITING' }));
    // 상세의 상태 글자는 공통 상태 메시지를 쓴다. 시작 전은 PENDING(대기)
    expect(await get(DETAIL)).toMatchObject({
      data: {
        statusCode: 'PENDING',
        progressPercent: 0,
        canStartMes: true,
        canCompleteMes: false,
        operations: [
          { mesOperationLogId: 'op-001', statusCode: 'PENDING', canStart: false },
          { mesOperationLogId: 'op-002', statusCode: 'PENDING', canStart: false },
        ],
      },
    });

    await put(`${DETAIL}/start`);
    expect(await get(`${PP}/mes`)).toMatchObject(row({ mesId: 'mes-002', status: 'IN_PROGRESS' }));
    expect(await get(DETAIL)).toMatchObject({
      data: {
        statusCode: 'IN_PROGRESS',
        canStartMes: false,
        // 앞 공정부터 시작할 수 있다
        operations: [
          { statusCode: 'PENDING', canStart: true, canComplete: false },
          { statusCode: 'PENDING', canStart: false },
        ],
      },
    });
  });

  it('시작 전 공정을 시작하면 IN_PROGRESS, 완료하면 다음 공정의 시작이 열린다', async () => {
    const DETAIL = `${PP}/mes/mes-002`;
    await put(`${DETAIL}/start`);
    await put(`${DETAIL}/operations/op-001/start`);
    expect(await get(DETAIL)).toMatchObject({
      data: { operations: [{ statusCode: 'IN_PROGRESS', canStart: false, canComplete: true }, {}] },
    });

    await put(`${DETAIL}/operations/op-001/complete`);
    expect(await get(DETAIL)).toMatchObject({
      data: {
        canCompleteMes: false,
        operations: [
          { statusCode: 'COMPLETED', canComplete: false },
          { statusCode: 'PENDING', canStart: true },
        ],
      },
    });
  });

  it('완료한 MES 에 시작을 또 보내도 성공이고 COMPLETED 그대로다', async () => {
    await put(`${PP}/mes/mes-001/complete`);
    expect(await put(`${PP}/mes/mes-001/start`)).toMatchObject({ success: true });
    expect(await get(`${PP}/mes/mes-001`)).toMatchObject({ data: { statusCode: 'COMPLETED' } });
  });
});

describe('재무 목 상태', () => {
  const FCM = '/business/fcm/invoice';

  it('매출 전표의 수금을 완료하면 목록과 상세가 PAID 다', async () => {
    // 매출 전표는 주문마다 하나(카드 "데모 목록 인사 재무"). inv-ar-001 은 so-001 의 전표다
    const total = await totalOf(`${FCM}/ar`);
    await post(`${FCM}/ar/inv-ar-001/receivable/complete`);
    expect(await all(`${FCM}/ar`)).toMatchObject(
      rowOf(total, { invoiceId: 'inv-ar-001', statusCode: 'PAID' }),
    );
    expect(await get(`${FCM}/ar/inv-ar-001`)).toMatchObject({ data: { statusCode: 'PAID' } });
  });

  it('매입 전표는 처리 요청 뒤 PENDING, 공급사가 완료하면 PAID 다', async () => {
    // 매입 전표는 활성 공급사 5곳 × 12달(카드 "데모 목록 인사 재무"). 이번 달 첫 공급사의 전표는 미납이다
    const AP = `inv-ap-${THIS_MONTH}-001`;
    expect(await get(`${FCM}/ap/${AP}`)).toMatchObject({ data: { statusCode: 'UNPAID' } });
    await post(`${FCM}/ap/receivable/request?invoiceId=${AP}`);
    expect(await all(`${FCM}/ap`)).toMatchObject(
      rowOf(60, { invoiceId: AP, statusCode: 'PENDING' }),
    );
    expect(await get(`${FCM}/ap/${AP}`)).toMatchObject({ data: { statusCode: 'PENDING' } });

    await post(`${FCM}/ap/${AP}/payable/complete`);
    expect(await all(`${FCM}/ap`)).toMatchObject(rowOf(60, { invoiceId: AP, statusCode: 'PAID' }));
    expect(await get(`${FCM}/ap/${AP}`)).toMatchObject({ data: { statusCode: 'PAID' } });
  });
});
