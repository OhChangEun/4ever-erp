import { NextRequest, NextResponse } from 'next/server';

// ──────────────────────────────────────────────
// 공통 헬퍼
// ──────────────────────────────────────────────
const isoNow = new Date().toISOString();

function ok<T>(data: T) {
  return NextResponse.json({ status: 200, success: true, message: 'OK', data });
}
function okEmpty() {
  return NextResponse.json({ status: 200, success: true, message: 'OK' });
}
function makePage(page = 0, size = 10, totalElements = 0) {
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  return { number: page, size, totalElements, totalPages, hasNext: page + 1 < totalPages };
}
const stat = { value: 1200, delta_rate: 0.12 };
function statResponse<T>(data: T) {
  return { week: data, month: data, quarter: data, year: data };
}

// ──────────────────────────────────────────────
// Mock 데이터
// ──────────────────────────────────────────────
const mockUserInfo = { id: 1, name: '홍길동', email: 'hong@test.com', role: 'ALL_ADMIN' };

const mockProfileInfo = {
  name: '홍길동',
  employeeNumber: 'EMP-2026-001',
  department: '영업팀',
  position: '팀장',
  hireDate: '2022-03-01',
  serviceYears: '3',
  email: 'user@everp.co.kr',
  phoneNumber: '010-1234-5678',
  address: '서울특별시 강남구 테헤란로 123',
  companyName: '에버피',
  baseAddress: '서울특별시 강남구 테헤란로 123',
  detailAddress: '10층',
  officePhone: '02-123-4567',
  businessNumber: '123-45-67890',
  customerName: '홍길동',
};

const mockNotificationList = {
  content: [
    {
      notificationId: 'ntf-001',
      notificationTitle: '발주 승인 요청',
      notificationMessage: 'PO-2026-001 승인 요청이 도착했습니다.',
      linkType: 'PURCHASE_ORDER',
      linkId: 'po-001',
      source: 'PR',
      createdAt: isoNow,
      isRead: false,
    },
    {
      notificationId: 'ntf-002',
      notificationTitle: '재고 부족 경고',
      notificationMessage: 'ITEM-1002의 재고가 안전재고 이하입니다.',
      linkType: 'INVENTORY',
      linkId: 'item-1002',
      source: 'IM',
      createdAt: isoNow,
      isRead: true,
    },
  ],
  page: makePage(0, 10, 2),
};

// ──────────────────────────────────────────────
// 메인 핸들러
// ──────────────────────────────────────────────
async function handler(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = (slug ?? []).join('/');
  const method = request.method;
  const sp = request.nextUrl.searchParams;
  const page = Number(sp.get('page') ?? 0);
  const size = Number(sp.get('size') ?? 10);

  // ──────────────── AUTH ────────────────
  if (path === 'login') {
    return NextResponse.json({ accessToken: 'mock-access-token', user: mockUserInfo });
  }
  if (path === 'logout') return okEmpty();
  if (path === 'me') return ok(mockUserInfo);

  // ──────────────── DASHBOARD ────────────────
  if (path === 'dashboard/statistics') {
    return ok(
      statResponse({
        total_sales: stat,
        total_purchases: stat,
        net_profit: stat,
        total_employees: stat,
      }),
    );
  }
  if (path === 'dashboard/workflows') {
    return ok({
      tabs: [
        {
          tabCode: 'APPROVAL',
          items: [
            {
              itemId: 'wf-001',
              itemTitle: '구매요청 승인',
              itemNumber: 'PR-2026-001',
              name: '김구매',
              statusCode: 'PENDING',
              date: isoNow,
            },
          ],
        },
      ],
    });
  }

  // ──────────────── NOTIFICATION ────────────────
  if (path === 'alarm/notifications/list') return ok(mockNotificationList);
  if (path === 'alarm/notifications/count') return ok({ count: 2 });
  if (path === 'alarm/notifications/all/read') return okEmpty();
  if (/^alarm\/notifications\/[^/]+\/read$/.test(path)) return okEmpty();
  if (path === 'alarm/notifications/subscribe') {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: string) =>
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        send('keepalive', 'connected');
        send('unreadCount', '2');
        setTimeout(
          () =>
            send(
              'alarm',
              JSON.stringify({
                alarmId: 'alarm-001',
                alarmType: 'INFO',
                title: '발주 승인 요청',
                message: 'PO-2026-001 승인 요청이 도착했습니다.',
              }),
            ),
          500,
        );
        setTimeout(() => controller.close(), 1500);
      },
    });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  // ──────────────── SALES (business/sd) ────────────────
  if (path === 'business/sd/statistics') {
    return ok(statResponse({ sales_amount: stat, new_orders_count: stat }));
  }
  if (path === 'business/sd/quotations/customer/count') {
    return ok(statResponse({ quotation_count: stat }));
  }
  if (path === 'business/sd/quotations/confirm') return okEmpty();
  if (path === 'business/sd/quotations/inventory/check') {
    return ok({
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          requiredQuantity: 100,
          inventoryQuantity: 120,
          shortageQuantity: 0,
          statusCode: 'AVAILABLE',
          productionRequired: false,
          inventoryCheckTime: isoNow,
        },
      ],
    });
  }
  if (path === 'business/sd/quotations' && method === 'GET') {
    return ok({
      content: [
        {
          quotationId: 'qt-001',
          quotationNumber: 'QT-2026-001',
          customerName: '한빛전자',
          managerName: '김영업',
          quotationDate: '2026-01-10',
          dueDate: '2026-02-01',
          totalAmount: 12500000,
          statusCode: 'APPROVED',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'business/sd/quotations' && method === 'POST') return ok({ success: true });
  if (/^business\/sd\/quotations\/[^/]+\/approve-order$/.test(path)) return okEmpty();
  if (/^business\/sd\/quotations\/[^/]+$/.test(path) && method === 'GET') {
    const quotationId = path.split('/').pop();
    return ok({
      quotationId,
      quotationNumber: 'QT-2026-001',
      quotationDate: '2026-01-10',
      dueDate: '2026-02-01',
      statusCode: 'APPROVED',
      customerName: '한빛전자',
      ceoName: '박대표',
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          quantity: 100,
          uomName: 'EA',
          unitPrice: 12000,
          amount: 1200000,
        },
      ],
      totalAmount: 12500000,
    });
  }
  if (path === 'business/sd/orders' && method === 'GET') {
    return ok({
      content: [
        {
          salesOrderId: 'so-001',
          salesOrderNumber: 'SO-2026-001',
          customerName: '한빛전자',
          manager: {
            managerName: '김영업',
            managerPhone: '010-1111-2222',
            managerEmail: 'sales@everp.co.kr',
          },
          orderDate: '2026-01-12',
          dueDate: '2026-02-05',
          totalAmount: 8600000,
          statusCode: 'IN_PRODUCTION',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (/^business\/sd\/orders\/[^/]+$/.test(path) && method === 'GET') {
    const salesOrderId = path.split('/').pop();
    return ok({
      order: {
        salesOrderId,
        salesOrderNumber: 'SO-2026-001',
        orderDate: '2026-01-12',
        dueDate: '2026-02-05',
        statusCode: 'IN_PRODUCTION',
        totalAmount: 8600000,
      },
      customer: {
        customerId: 1,
        customerName: '한빛전자',
        customerCode: 'CUS-001',
        customerBaseAddress: '서울시 강서구 공항대로 10',
        customerDetailAddress: '5층',
        manager: {
          managerName: '김영업',
          managerPhone: '010-1111-2222',
          managerEmail: 'sales@everp.co.kr',
        },
      },
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          quantity: 100,
          uonName: 'EA',
          unitPrice: 12000,
          amount: 1200000,
        },
      ],
      note: '우선 납기 요청',
    });
  }
  if (path === 'business/sd/customers' && method === 'GET') {
    return ok({
      customers: [
        {
          customerId: 'cus-001',
          customerNumber: 'CUS-001',
          customerName: '한빛전자',
          manager: {
            managerName: '김영업',
            managerPhone: '010-1111-2222',
            managerEmail: 'sales@everp.co.kr',
          },
          address: '서울특별시 강서구 공항대로 10',
          totalTransactionAmount: 25000000,
          orderCount: 14,
          lastOrderDate: '2026-01-20',
          statusCode: 'ACTIVE',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'business/sd/customers' && method === 'POST') {
    return ok({
      customerId: 100,
      customerCode: 'CUS-100',
      statusCode: 'ACTIVE',
      createdAt: isoNow,
    });
  }
  if (/^business\/sd\/customers\/[^/]+$/.test(path) && method === 'GET') {
    const customerId = path.split('/').pop();
    return ok({
      customerId,
      customerNumber: 'CUS-001',
      customerName: '한빛전자',
      ceoName: '박대표',
      businessNumber: '123-45-67890',
      statusCode: 'ACTIVE',
      customerPhone: '02-222-3333',
      customerEmail: 'contact@hanbit.co.kr',
      baseAddress: '서울특별시 강서구 공항대로 10',
      detailAddress: '5층',
      manager: {
        managerName: '김영업',
        managerPhone: '010-1111-2222',
        managerEmail: 'sales@everp.co.kr',
      },
      totalOrders: 14,
      totalTransactionAmount: 25000000,
      note: '중요 고객',
    });
  }
  if (/^business\/sd\/customers\/[^/]+$/.test(path) && method === 'PATCH')
    return ok({ success: true });
  if (path === 'business/sd/analytics/sales') {
    return ok({
      period: { start: '2026-01-01', end: '2026-01-31' },
      trend: [
        { year: 2026, month: 1, week: 1, sale: 1200000, orderCount: 12 },
        { year: 2026, month: 1, week: 2, sale: 1500000, orderCount: 15 },
      ],
      trendScale: { sale: { min: 1000000, max: 2000000 }, orderCount: { min: 10, max: 20 } },
      productShare: [
        { productCode: 'P-1001', productName: '모터 A', sale: 5000000, saleShare: 40 },
      ],
      topCustomers: [
        {
          customerCode: 'CUS-001',
          customerName: '한빛전자',
          orderCount: 5,
          sale: 8000000,
          active: true,
        },
      ],
    });
  }

  // ──────────────── FINANCE (business/fcm) ────────────────
  if (path === 'business/fcm/statictics' || path === 'business/fcm/statistics') {
    return ok(statResponse({ total_purchases: stat, net_profit: stat, total_sales: stat }));
  }
  if (path === 'business/fcm/statistics/customer/total-purchases') {
    return ok(statResponse({ total_amount: stat }));
  }
  if (path === 'business/fcm/statistics/supplier/total-sales') {
    return ok(statResponse({ total_amount: stat }));
  }
  if (path === 'business/fcm/invoice/ap' && method === 'GET') {
    return ok({
      content: [
        {
          invoiceId: 'inv-ap-001',
          invoiceNumber: 'AP-2026-001',
          connection: {
            connectionId: 'sup-001',
            connectionCode: 'SUP-001',
            connectionName: '대양상사',
          },
          totalAmount: 4200000,
          issueDate: '2026-01-15',
          dueDate: '2026-02-15',
          statusCode: 'UNPAID',
          referenceNumber: 'REF-AP-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (/^business\/fcm\/invoice\/ap\/[^/]+$/.test(path) && method === 'GET') {
    const invoiceId = path.split('/').pop();
    return ok({
      invoiceId,
      invoiceNumber: 'AP-2026-001',
      invoiceType: 'AP',
      statusCode: 'UNPAID',
      issueDate: '2026-01-15',
      dueDate: '2026-02-15',
      name: '대양상사',
      referenceNumber: 'REF-AP-001',
      totalAmount: 4200000,
      note: '납기 준수 요청',
      items: [
        {
          itemId: 'item-2001',
          itemName: '원자재 A',
          quantity: 200,
          unitOfMaterialName: 'EA',
          unitPrice: 20000,
          totalPrice: 4000000,
        },
      ],
    });
  }
  if (path === 'business/fcm/invoice/ap/receivable/request') return okEmpty();
  if (/^business\/fcm\/invoice\/ap\/[^/]+\/payable\/complete$/.test(path)) return okEmpty();
  if (path === 'business/fcm/invoice/ar' && method === 'GET') {
    return ok({
      content: [
        {
          invoiceId: 'inv-ar-001',
          invoiceNumber: 'AR-2026-001',
          connection: {
            connectionId: 'cus-001',
            connectionCode: 'CUS-001',
            connectionName: '한빛전자',
          },
          totalAmount: 8200000,
          issueDate: '2026-01-20',
          dueDate: '2026-02-20',
          statusCode: 'PENDING',
          referenceNumber: 'REF-AR-001',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (/^business\/fcm\/invoice\/ar\/[^/]+$/.test(path) && method === 'GET') {
    const invoiceId = path.split('/').pop();
    return ok({
      invoiceId,
      invoiceNumber: 'AR-2026-001',
      invoiceType: 'AR',
      statusCode: 'PENDING',
      issueDate: '2026-01-20',
      dueDate: '2026-02-20',
      name: '한빛전자',
      referenceNumber: 'REF-AR-001',
      totalAmount: 8200000,
      note: '입금 대기',
      items: [
        {
          itemId: 'item-1001',
          itemName: '모터 A',
          quantity: 100,
          unitOfMaterialName: 'EA',
          unitPrice: 82000,
          totalPrice: 8200000,
        },
      ],
    });
  }
  if (/^business\/fcm\/invoice\/ar\/[^/]+\/receivable\/complete$/.test(path)) return okEmpty();

  // ──────────────── HRM (business/hrm) ────────────────
  if (path === 'business/hrm/statistics') {
    return ok(statResponse({ totalEmployeeCount: stat, newEmployeeCount: stat }));
  }
  if (path === 'business/hrm/employee' && method === 'GET') {
    return ok({
      content: [
        {
          employeeId: 'emp-001',
          employeeNumber: 'EMP-2026-001',
          name: '홍길동',
          email: 'user@everp.co.kr',
          phone: '010-1234-5678',
          position: '팀장',
          department: '영업팀',
          statusCode: 'ACTIVE',
          hireDate: '2022-03-01',
          birthDate: '1990-01-01',
          address: '서울특별시 강남구',
          createdAt: isoNow,
          updatedAt: isoNow,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'business/hrm/employee/signup' && method === 'POST') return ok(null);
  if (/^business\/hrm\/employee\/[^/]+$/.test(path) && method === 'PATCH') return okEmpty();
  if (path === 'business/hrm/positions' && method === 'GET') {
    return ok([{ positionId: 'pos-001', positionName: '팀장', headCount: 4, payment: 5000000 }]);
  }
  if (/^business\/hrm\/positions\/[^/]+$/.test(path) && method === 'GET') {
    const positionId = path.split('/').pop();
    return ok({
      positionId,
      positionName: '팀장',
      headCount: 4,
      payment: 5000000,
      employees: [
        {
          employeeId: 'emp-001',
          employeeCode: 'EMP-2026-001',
          employeeName: '홍길동',
          position: '팀장',
          department: '영업팀',
          hireDate: '2022-03-01',
        },
      ],
    });
  }
  if (path === 'business/hrm/departments' && method === 'GET') {
    return ok({
      content: [
        {
          departmentId: 'dept-001',
          departmentNumber: 'D-001',
          departmentName: '영업팀',
          description: 'B2B 영업',
          managerName: '홍길동',
          managerId: 'emp-001',
          location: '서울 강남',
          statusCode: 'ACTIVE',
          employeeCount: 8,
          establishedDate: '2020-01-01',
          employees: [
            {
              employeeId: 'emp-001',
              employeeName: '홍길동',
              position: '팀장',
              hireDate: '2022-03-01',
            },
          ],
        },
      ],
    });
  }
  if (/^business\/hrm\/departments\/[^/]+$/.test(path) && method === 'PATCH') return ok(null);
  if (path === 'business/hrm/payroll' && method === 'GET') {
    return ok({
      content: [
        {
          payrollId: 'pay-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            departmentId: 'dept-001',
            department: '영업팀',
            positionId: 'pos-001',
            position: '팀장',
          },
          pay: {
            basePay: 3000000,
            overtimePay: 200000,
            deduction: 150000,
            netPay: 3050000,
            statusCode: 'PENDING',
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'business/hrm/payroll/complete' && method === 'POST') return ok(null);
  if (path === 'business/hrm/payroll/statuses')
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'PAID', value: '지급완료' },
    ]);
  if (/^business\/hrm\/payroll\/[^/]+$/.test(path) && method === 'GET') {
    const payrollId = path.split('/').pop();
    return ok({
      payrollId,
      employee: {
        employeeId: 'emp-001',
        employeeName: '홍길동',
        department: '영업팀',
        position: '팀장',
      },
      pay: {
        basePay: 3000000,
        basePayItem: [{ itemContent: '기본급', itemSum: 3000000 }],
        overtimePay: 200000,
        overtimePayItem: [{ itemContent: '연장근무', itemSum: 200000 }],
        deduction: 150000,
        deductionItem: [{ itemContent: '세금', itemSum: 150000 }],
        netPay: 3050000,
      },
      statusCode: 'PENDING',
      expectedDate: '2026-01-25',
    });
  }
  if (path === 'business/hrm/training-status') {
    return ok({
      items: [
        {
          employeeId: 'emp-001',
          name: '홍길동',
          department: '영업팀',
          position: '팀장',
          completedCount: 2,
          inProgressCount: 1,
          requiredMissingCount: 0,
          lastTrainingDate: '2026-01-05',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (/^business\/hrm\/training\/employee\/[^/]+$/.test(path)) {
    const employeeId = path.split('/').pop();
    return ok({
      employeeId,
      employeeName: '홍길동',
      department: '영업팀',
      position: '팀장',
      completedCount: 2,
      requiredMissingCount: 0,
      lastTrainingDate: '2026-01-05',
      programHistory: [
        {
          programId: 'prog-001',
          programName: '안전 교육',
          programStatus: 'COMPLETED',
          completedAt: '2026-01-05',
        },
      ],
    });
  }
  if (path === 'business/hrm/program' && method === 'GET') {
    return ok({
      content: [
        {
          programId: 'prog-001',
          programName: '안전 교육',
          statusCode: 'ACTIVE',
          category: 'SAFETY',
          trainingHour: 4,
          isOnline: true,
          capacity: 30,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'business/hrm/program' && method === 'POST') return ok(null);
  if (/^business\/hrm\/program\/[^/]+$/.test(path) && method === 'GET') {
    const programId = path.split('/').pop();
    return ok({
      programId,
      programName: '안전 교육',
      statusCode: 'ACTIVE',
      category: 'SAFETY',
      trainingHour: 4,
      isOnline: true,
      startDate: '2026-02-01',
      designatedEmployee: [
        {
          employeeId: 'emp-001',
          employeeName: '홍길동',
          department: '영업팀',
          position: '팀장',
          statusCode: 'PENDING',
          completedAt: null,
        },
      ],
      number: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  }
  if (/^business\/hrm\/program\/[^/]+$/.test(path) && method === 'PATCH') return ok(null);
  if (/^business\/hrm\/program\/[^/]+$/.test(path) && method === 'POST') return ok(null);
  if (path === 'business/hrm/time-record') {
    return ok({
      content: [
        {
          timerecordId: 'time-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            department: '영업팀',
            position: '팀장',
          },
          workDate: '2026-01-28',
          checkInTime: '2026-01-28T09:00:00',
          checkOutTime: '2026-01-28T18:00:00',
          totalWorkMinutes: 540,
          overtimeMinutes: 30,
          statusCode: 'ON_TIME',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (/^business\/hrm\/time-record\/[^/]+$/.test(path) && method === 'PUT') return ok(null);
  if (path === 'business/hrm/leave-request') {
    return ok({
      content: [
        {
          leaveRequestId: 'leave-001',
          employee: {
            employeeId: 'emp-001',
            employeeName: '홍길동',
            department: '영업팀',
            position: '팀장',
          },
          leaveType: 'ANNUAL',
          startDate: '2026-02-05',
          endDate: '2026-02-06',
          numberOfLeaveDays: 2,
          remainingLeaveDays: 8,
          status: 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'business/hrm/leave/request' && method === 'POST') return okEmpty();
  if (/^business\/hrm\/leave\/request\/[^/]+\/release$/.test(path)) return ok(null);
  if (/^business\/hrm\/leave\/request\/[^/]+\/reject$/.test(path)) return ok(null);
  if (path === 'business/hrm/departments/all') {
    return ok([
      { key: 'dept-001', value: '영업팀' },
      { key: 'dept-002', value: '구매팀' },
    ]);
  }
  if (/^business\/hrm\/[^/]+\/positions\/all$/.test(path)) {
    return ok([
      { key: 'pos-001', value: '팀장' },
      { key: 'pos-002', value: '사원' },
    ]);
  }
  if (path === 'business/hrm/attendance/statuses') {
    return ok([
      { key: 'ON_TIME', value: '정상' },
      { key: 'LATE', value: '지각' },
    ]);
  }
  if (path === 'business/hrm/attendance/check-in') return okEmpty();
  if (path === 'business/hrm/attendance/check-out') return okEmpty();
  if (/^business\/hrm\/departments\/[^/]+\/members$/.test(path)) {
    return ok([{ key: 'emp-001', value: '홍길동' }]);
  }
  if (path === 'business/hrm/trainings/categories') {
    return ok([
      { key: 'SAFETY', value: '안전' },
      { key: 'SKILL', value: '기술' },
    ]);
  }
  if (path === 'business/hrm/trainings/programs') {
    return ok([{ key: 'prog-001', value: '안전 교육' }]);
  }
  if (path === 'business/hrm/trainings/completion-statuses') {
    return ok([
      { key: 'COMPLETED', value: '완료' },
      { key: 'INCOMPLETED', value: '미완료' },
    ]);
  }

  // ──────────────── PROFILE (business/profile) ────────────────
  if (path === 'business/profile') return ok(mockProfileInfo);
  if (path === 'business/profile/attendance-records') {
    return ok([
      {
        date: '2026-01-28',
        status: 'ON_TIME',
        startTime: '09:00',
        endTime: '18:00',
        workHours: '8h',
      },
    ]);
  }
  if (path === 'business/profile/today-attendance') {
    return ok({ checkInTime: '09:00', checkOutTime: '18:00', workHours: '8h', status: 'ON_TIME' });
  }
  if (path === 'business/profile/trainings/available') {
    return ok([
      {
        trainingId: 'tr-001',
        trainingName: '안전 교육',
        trainingStatus: 'AVAILABLE',
        durationHours: 4,
        delieveryMethod: 'ONLINE',
        completionStatus: 'INCOMPLETED',
        category: 'SAFETY',
        description: '기본 안전 교육',
        complementationDate: '',
      },
    ]);
  }
  if (path === 'business/profile/trainings/completed') {
    return ok([
      {
        trainingId: 'tr-003',
        trainingName: 'ERP 사용법',
        trainingStatus: 'COMPLETED',
        durationHours: 2,
        delieveryMethod: 'ONLINE',
        completionStatus: 'COMPLETED',
        category: 'SYSTEM',
        description: 'ERP 기본 사용법',
        complementationDate: '2026-01-05',
      },
    ]);
  }
  if (path === 'business/profile/trainings/in-progress') {
    return ok([
      {
        trainingId: 'tr-002',
        trainingName: '품질 교육',
        trainingStatus: 'IN_PROGRESS',
        durationHours: 3,
        delieveryMethod: 'OFFLINE',
        completionStatus: 'INCOMPLETED',
        category: 'QUALITY',
        description: '품질 기준 교육',
        complementationDate: '',
      },
    ]);
  }
  if (path === 'business/profile/trainings/request') return okEmpty();
  if (path === 'business/profile/employees/profile/update') return okEmpty();

  // ──────────────── INVENTORY (scm-pp/iv) ────────────────
  if (path === 'scm-pp/iv/statistic') {
    return ok(
      statResponse({
        total_stock: stat,
        store_complete: stat,
        store_pending: stat,
        delivery_complete: stat,
        delivery_pending: stat,
      }),
    );
  }
  if (path === 'scm-pp/iv/inventory-items') {
    return ok({
      content: [
        {
          itemId: 'item-1001',
          itemNumber: 'ITM-1001',
          itemName: '모터 A',
          category: 'MOTOR',
          currentStock: 120,
          forShipmentStock: 30,
          reservedStock: 10,
          safetyStock: 50,
          uomName: 'EA',
          unitPrice: 12000,
          totalAmount: 1440000,
          warehouseName: '1공장 창고',
          warehouseType: 'RAW',
          statusCode: 'NORMAL',
          shelfNumber: 12,
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'scm-pp/iv/shortage/count/critical/statistic') {
    return ok(statResponse({ total_emergency: stat, total_warning: stat }));
  }
  if (path === 'scm-pp/iv/shortage/preview') {
    return ok({
      content: [
        {
          itemId: 'item-1002',
          itemName: '베어링 B',
          currentStock: 20,
          uomName: 'EA',
          safetyStock: 50,
          statusCode: 'URGENT',
        },
      ],
    });
  }
  if (path === 'scm-pp/iv/shortage') {
    return ok({
      content: [
        {
          itemId: 'item-1002',
          itemName: '베어링 B',
          itemNumber: 'ITM-1002',
          category: 'BEARING',
          currentStock: 20,
          uomName: 'EA',
          safetyStock: 50,
          unitPrice: 8000,
          totalAmount: 160000,
          warehouseName: '1공장 창고',
          warehouseNumber: 'WH-001',
          statusCode: 'URGENT',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'scm-pp/iv/stock-transfers' && method === 'GET') {
    return ok({
      content: [
        {
          type: 'OUT',
          quantity: 10,
          uomName: 'EA',
          itemName: '모터 A',
          workDate: '2026-01-25',
          managerName: '이자재',
        },
      ],
    });
  }
  if (path === 'scm-pp/iv/stock-transfers' && method === 'POST') return okEmpty();
  if (path === 'scm-pp/iv/items/toggle') {
    return ok([
      {
        itemId: 'item-1001',
        unitPrice: 12000,
        supplierCompanyName: '대양상사',
        uomName: 'EA',
        supplierCompanyId: 'sup-001',
        itemName: '모터 A',
      },
    ]);
  }
  if (path === 'scm-pp/iv/items/info' && method === 'POST') {
    return ok([
      {
        itemId: 'item-1001',
        itemName: '모터 A',
        itemNmber: 'ITM-1001',
        unitPrice: 12000,
        supplierName: '대양상사',
      },
    ]);
  }
  if (path === 'scm-pp/iv/items' && method === 'POST') return okEmpty();
  if (/^scm-pp\/iv\/items\/[^/]+\/safety-stock$/.test(path)) return okEmpty();
  if (/^scm-pp\/iv\/items\/[^/]+$/.test(path) && method === 'GET') {
    const itemId = path.split('/').pop();
    return ok({
      itemId,
      itemNumber: 'ITM-1001',
      itemName: '모터 A',
      category: 'MOTOR',
      supplierCompanyName: '대양상사',
      statusCode: 'NORMAL',
      currentStock: 120,
      safetyStock: 50,
      uomName: 'EA',
      unitPrice: 12000,
      totalAmount: 1440000,
      warehouseId: 'wh-001',
      warehouseName: '1공장 창고',
      warehouseNumber: 'WH-001',
      location: 'A-1',
      lastModified: isoNow,
      description: '표준 모터',
      stockMovement: [
        {
          type: 'IN',
          quantity: 50,
          uomName: 'EA',
          from: '대양상사',
          to: '1공장 창고',
          movementDate: isoNow,
          managerName: '이자재',
          referenceNumber: 'IN-2026-001',
          note: '정상 입고',
        },
      ],
    });
  }
  if (path === 'scm-pp/iv/warehouses/statistic') {
    return ok(statResponse({ total_warehouse: stat, in_operation_warehouse: stat }));
  }
  if (path === 'scm-pp/iv/warehouses/dropdown') {
    return ok({
      warehouses: [
        { warehouseId: 'wh-001', warehouseName: '1공장 창고', warehouseNumber: 'WH-001' },
      ],
    });
  }
  if (path === 'scm-pp/iv/warehouses/managers/toggle') {
    return ok([
      {
        managerEmail: 'manager@everp.co.kr',
        managerId: 'mgr-001',
        managerName: '이자재',
        managerPhone: '010-2222-3333',
      },
    ]);
  }
  if (path === 'scm-pp/iv/warehouses' && method === 'GET') {
    return ok({
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
    });
  }
  if (path === 'scm-pp/iv/warehouses' && method === 'POST') return okEmpty();
  if (/^scm-pp\/iv\/warehouses\/[^/]+$/.test(path) && method === 'GET') {
    return ok({
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
    });
  }
  if (/^scm-pp\/iv\/warehouses\/[^/]+$/.test(path) && method === 'PUT') return okEmpty();

  // ──────────────── SHIPPING (scm-pp/sales-orders) ────────────────
  if (path === 'scm-pp/sales-orders/production') {
    return ok({
      content: [
        {
          salesOrderId: 'so-001',
          salesOrderNumber: 'SO-2026-001',
          customerName: '한빛전자',
          orderDate: '2026-01-12',
          dueDate: '2026-02-05',
          progress: 60,
          totalAmount: 8600000,
          statusCode: 'PRODUCTION',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'scm-pp/sales-orders/ready-to-ship') {
    return ok({
      content: [
        {
          salesOrderId: 'so-002',
          salesOrderNumber: 'SO-2026-002',
          customerName: '미래전자',
          orderDate: '2026-01-10',
          dueDate: '2026-02-02',
          productionCompletionDate: '2026-01-25',
          readyToShipDate: '2026-01-26',
          totalAmount: 5200000,
          statusCode: 'READT_TO_SHIP',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (/^scm-pp\/sales-orders\/production\/[^/]+$/.test(path)) {
    const itemId = path.split('/').pop();
    return ok({
      salesOrderId: itemId,
      salesOrderNumber: 'SO-2026-001',
      customerCompanyName: '한빛전자',
      dueDate: '2026-02-05',
      statusCode: 'IN_PRODUCTION',
      orderItems: [{ itemId: 'item-1001', itemName: '모터 A', quantity: 100, uomName: 'EA' }],
    });
  }
  if (/^scm-pp\/sales-orders\/ready-to-ship\/[^/]+$/.test(path)) {
    const itemId = path.split('/').pop();
    return ok({
      salesOrderId: itemId,
      salesOrderNumber: 'SO-2026-002',
      customerCompanyName: '미래전자',
      dueDate: '2026-02-02',
      statusCode: 'READY_TO_SHIP',
      orderItems: [{ itemId: 'item-1002', itemName: '베어링 B', quantity: 50, uomName: 'EA' }],
    });
  }
  if (/^scm-pp\/sales-orders\/[^/]+\/status$/.test(path)) {
    return ok({ salesOrderId: 'so-001', salesOrderCode: 'SO-2026-001', status: 'READY_TO_SHIP' });
  }

  // ──────────────── RECEIVING (scm-pp/purchase-orders) ────────────────
  if (path === 'scm-pp/purchase-orders/receiving') {
    return ok({
      content: [
        {
          purchaseOrderId: 'po-001',
          purchaseOrderNumber: 'PO-2026-001',
          supplierCompanyName: '대양상사',
          orderDate: '2026-01-10',
          dueDate: '2026-02-01',
          totalAmount: 4200000,
          statusCode: 'PENDING',
        },
      ],
      page: makePage(page, size, 1),
    });
  }
  if (path === 'scm-pp/purchase-orders/received') {
    return ok({
      content: [
        {
          purchaseOrderId: 'po-002',
          purchaseOrderNumber: 'PO-2026-002',
          supplierCompanyName: '대한금속',
          orderDate: '2026-01-05',
          dueDate: '2026-01-20',
          totalAmount: 2800000,
          statusCode: 'RECEIVED',
        },
      ],
      page: makePage(page, size, 1),
    });
  }

  // ──────────────── PURCHASE (scm-pp/mm) ────────────────
  if (path === 'scm-pp/mm/statistics') {
    return ok(statResponse({ purchaseOrderAmount: stat, purchaseRequestCount: stat }));
  }
  if (path === 'scm-pp/mm/supplier/orders/statistics') {
    return ok(statResponse({ orderCount: stat }));
  }
  if (path === 'scm-pp/mm/purchase-requisition/status/toggle') {
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }
  if (path === 'scm-pp/mm/purchase-requisition/search-type/toggle') {
    return ok([
      { key: 'NUMBER', value: '요청 번호' },
      { key: 'REQUESTER', value: '요청자' },
    ]);
  }
  if (path === 'scm-pp/mm/purchase-orders/status/toggle') {
    return ok([
      { key: 'PENDING', value: '대기' },
      { key: 'APPROVED', value: '승인' },
    ]);
  }
  if (path === 'scm-pp/mm/purchase-orders/search-type/toggle') {
    return ok([
      { key: 'NUMBER', value: '발주 번호' },
      { key: 'SUPPLIER', value: '공급업체' },
    ]);
  }
  if (path === 'scm-pp/mm/supplier/category/toggle') {
    return ok([
      { key: 'MATERIAL', value: '자재' },
      { key: 'SERVICE', value: '서비스' },
    ]);
  }
  if (path === 'scm-pp/mm/supplier/search-type/toggle') {
    return ok([
      { key: 'NAME', value: '공급업체명' },
      { key: 'NUMBER', value: '공급업체 코드' },
    ]);
  }
  if (path === 'scm-pp/mm/supplier/status/toggle') {
    return ok([
      { key: 'ACTIVE', value: '활성' },
      { key: 'INACTIVE', value: '비활성' },
    ]);
  }
  if (path === 'scm-pp/mm/purchase-requisitions' && method === 'GET') {
    return ok({
      content: [
        {
          purchaseRequisitionId: 'pr-001',
          purchaseRequisitionNumber: 'PR-2026-001',
          requesterId: 'emp-001',
          requesterName: '홍길동',
          departmentId: 'dept-001',
          departmentName: '구매팀',
          statusCode: 'PENDING',
          requestDate: '2026-01-10',
          totalAmount: 4200000,
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'scm-pp/mm/purchase-requisitions' && method === 'POST') return ok(null);
  if (path === 'scm-pp/mm/stock-purchase-requisitions') return ok(null);
  if (/^scm-pp\/mm\/purchase-requisitions\/[^/]+\/release$/.test(path)) return ok(null);
  if (/^scm-pp\/mm\/purchase-requisitions\/[^/]+\/reject$/.test(path)) return ok(null);
  if (/^scm-pp\/mm\/purchase-requisitions\/[^/]+$/.test(path) && method === 'GET') {
    const prId = path.split('/').pop();
    return ok({
      id: prId,
      purchaseRequisitionNumber: 'PR-2026-001',
      requesterName: '홍길동',
      departmentName: '구매팀',
      requestDate: '2026-01-10',
      statusCode: 'PENDING',
      items: [
        {
          itemId: 1,
          itemName: '원자재 A',
          dueDate: '2026-02-01',
          quantity: 200,
          uomCode: 'EA',
          unitPrice: 20000,
          amount: 4000000,
        },
      ],
      totalAmount: 4200000,
    });
  }
  if (path === 'scm-pp/mm/purchase-orders' && method === 'GET') {
    return ok({
      content: [
        {
          purchaseOrderId: 'po-001',
          purchaseOrderNumber: 'PO-2026-001',
          supplierName: '대양상사',
          itemsSummary: '원자재 A 외 2건',
          orderDate: '2026-01-08',
          dueDate: '2026-01-30',
          totalAmount: 4200000,
          statusCode: 'PENDING',
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (/^scm-pp\/mm\/purchase-orders\/[^/]+\/approve$/.test(path)) return ok(null);
  if (/^scm-pp\/mm\/purchase-orders\/[^/]+\/reject$/.test(path)) return ok(null);
  if (/^scm-pp\/mm\/[^/]+\/start-delivery$/.test(path)) return ok(null);
  if (/^scm-pp\/mm\/purchase-orders\/[^/]+$/.test(path) && method === 'GET') {
    const purchaseId = path.split('/').pop();
    return ok({
      statusCode: 'PENDING',
      dueDate: '2026-01-30',
      purchaseOrderId: purchaseId,
      purchaseOrderNumber: 'PO-2026-001',
      orderDate: '2026-01-08',
      supplierId: 'sup-001',
      supplierNumber: 'SUP-001',
      supplierName: '대양상사',
      managerPhone: '010-5555-6666',
      managerEmail: 'supplier@everp.co.kr',
      items: [
        {
          itemId: 'item-2001',
          itemName: '원자재 A',
          quantity: 200,
          uomName: 'EA',
          unitPrice: 20000,
          totalPrice: 4000000,
        },
      ],
      totalAmount: 4200000,
      note: '납기 준수 요청',
    });
  }
  if (path === 'scm-pp/mm/supplier' && method === 'GET') {
    return ok({
      content: [
        {
          statusCode: 'ACTIVE',
          supplierInfo: {
            supplierId: 'sup-001',
            supplierName: '대양상사',
            supplierNumber: 'SUP-001',
            supplierEmail: 'supplier@everp.co.kr',
            supplierPhone: '02-999-0000',
            supplierBaseAddress: '부산광역시 사상구',
            supplierDetailAddress: '2층',
            supplierStatusCode: 'ACTIVE',
            category: 'MATERIAL',
            deliveryLeadTime: 5,
          },
        },
      ],
      page: makePage(0, 10, 1),
    });
  }
  if (path === 'scm-pp/mm/supplier' && method === 'POST') return ok(null);
  if (/^scm-pp\/mm\/supplier\/[^/]+$/.test(path) && method === 'GET') {
    const supplierId = path.split('/').pop();
    return ok({
      supplierInfo: {
        supplierId,
        supplierName: '대양상사',
        supplierNumber: 'SUP-001',
        supplierEmail: 'supplier@everp.co.kr',
        supplierPhone: '02-999-0000',
        supplierBaseAddress: '부산광역시 사상구',
        supplierDetailAddress: '2층',
        supplierStatusCode: 'ACTIVE',
        category: 'MATERIAL',
        deliveryLeadTime: 5,
      },
      managerInfo: {
        managerName: '정공급',
        managerPhone: '010-9999-0000',
        managerEmail: 'manager@supplier.co.kr',
      },
    });
  }
  if (/^scm-pp\/mm\/supplier\/[^/]+$/.test(path) && method === 'PATCH') return ok(null);

  // ──────────────── PRODUCTION (scm-pp/pp) ────────────────
  if (path === 'scm-pp/pp/statistic') {
    return ok(statResponse({ production_in: stat, production_completed: stat, bom_count: stat }));
  }
  if (path === 'scm-pp/pp/status/toggle') {
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'NEW', value: '신규' },
      { key: 'CONFIRMED', value: '확정' },
    ]);
  }
  if (path === 'scm-pp/pp/available/status/toggle') {
    return ok([
      { key: 'ALL', value: '전체 가용재고' },
      { key: 'CHECKED', value: '확인' },
      { key: 'UNCHECKED', value: '미확인' },
    ]);
  }
  if (path === 'scm-pp/pp/mrp/quotations/toggle') {
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }
  if (path === 'scm-pp/pp/mrp/available/status/toggle') {
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'SUFFICIENT', value: '충분' },
      { key: 'INSUFFICIENT', value: '부족' },
    ]);
  }
  if (path === 'scm-pp/pp/mrp/runs/quotations/toggle') {
    return ok([
      { key: 'ALL', value: '전체 견적' },
      { key: 'qt-001', value: 'QT-2026-001' },
      { key: 'qt-002', value: 'QT-2026-002' },
      { key: 'qt-003', value: 'QT-2026-003' },
      { key: 'qt-004', value: 'QT-2026-004' },
      { key: 'qt-005', value: 'QT-2026-005' },
    ]);
  }
  if (path === 'scm-pp/pp/mrp/runs/status/toggle') {
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'PENDING', value: '대기' },
      { key: 'PLANNED', value: '계획' },
      { key: 'APPROVED', value: '승인' },
      { key: 'REJECTED', value: '반려' },
    ]);
  }
  if (path === 'scm-pp/pp/mes/status/toggle') {
    return ok([
      { key: 'ALL', value: '전체 상태' },
      { key: 'WAITING', value: '대기' },
      { key: 'IN_PROGRESS', value: '진행중' },
    ]);
  }
  if (path === 'scm-pp/pp/mps/boms/toggle') {
    return ok([
      { key: 'bom-001', value: '모터 A' },
      { key: 'bom-002', value: '펌프 B' },
    ]);
  }
  if (path === 'scm-pp/pp/products') {
    return ok([
      { key: 'prod-001', value: '모터 A' },
      { key: 'prod-002', value: '펌프 B' },
    ]);
  }
  if (path === 'scm-pp/pp/operations') {
    return ok([
      { key: 'OP10', value: '절삭' },
      { key: 'OP20', value: '조립' },
    ]);
  }
  if (path === 'scm-pp/pp/quotations/simulate') {
    const body = (await request.json().catch(() => ({}))) as { quotationIds?: string[] };
    const quotationIds: string[] = body.quotationIds ?? [];
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
    const shortageItems = [
      { name: '실리콘 웨이퍼', base: 10000 },
      { name: '감광액', base: 500 },
      { name: '구리 배선', base: 3000 },
      { name: '에폭시 수지', base: 800 },
      { name: '알루미늄 합금', base: 2000 },
    ];
    const content = quotationIds.map((quotationId) => {
      const num = parseInt(quotationId.replace('qt-', ''), 10) || 1;
      const isFail = num % 3 === 2;
      const requestQty = ((num % 10) + 1) * 1000;
      const availableQty = isFail ? Math.floor(requestQty * 0.3) : requestQty + 500;
      const year = 2025 + Math.floor(num / 300);
      const month = String((num % 12) + 1).padStart(2, '0');
      const day = String((num % 28) + 1).padStart(2, '0');
      const nextMonth = String((((num % 12) + 1) % 12) + 1).padStart(2, '0');
      const shortages = isFail
        ? shortageItems.slice(0, (num % 3) + 1).map((item, i) => {
            const required = item.base + num * 10;
            const stock = Math.floor(required * 0.6);
            return {
              itemId: `item-${num * 10 + i}`,
              itemName: item.name,
              requiredQuantity: required,
              currentStock: stock,
              shortQuantity: required - stock,
            };
          })
        : [];
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
          status: isFail ? 'FAIL' : 'PASS',
          availableQuantity: availableQty,
          shortageQuantity: isFail ? requestQty - availableQty : 0,
          suggestedDueDate: `${year}-${nextMonth}-${day}`,
          generatedAt: isoNow,
        },
        shortages,
      };
    });
    return ok({ page: makePage(0, content.length, content.length), content });
  }
  if (path === 'scm-pp/pp/quotations/preview') {
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
  }
  if (path === 'scm-pp/pp/quotations/mps') {
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
  }
  if (path === 'scm-pp/pp/quotations/confirm') return ok(null);
  if (path === 'scm-pp/pp/quotations' && method === 'GET') {
    const filterStatus = sp.get('statusCode') ?? '';
    const filterAvailable = sp.get('availableStatusCode') ?? '';
    const filterStartDate = sp.get('startDate') ?? '';
    const filterEndDate = sp.get('endDate') ?? '';
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
    let allData = Array.from({ length: 512 }, (_, i) => {
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
    if (filterStatus && filterStatus !== 'ALL')
      allData = allData.filter((d) => d.statusCode === filterStatus);
    if (filterAvailable && filterAvailable !== 'ALL')
      allData = allData.filter((d) => d.availableStatus === filterAvailable);
    if (filterStartDate) allData = allData.filter((d) => d.requestDate >= filterStartDate);
    if (filterEndDate) allData = allData.filter((d) => d.requestDate <= filterEndDate);
    const total = allData.length;
    return ok({
      content: allData.slice(page * size, page * size + size),
      page: makePage(page, size, total),
    });
  }
  if (path === 'scm-pp/pp/boms' && method === 'GET') {
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
  }
  if (path === 'scm-pp/pp/boms' && method === 'POST') return okEmpty();
  if (/^scm-pp\/pp\/boms\/[^/]+$/.test(path) && method === 'GET') {
    const bomId = path.split('/').pop();
    return ok({
      bomId,
      bomNumber: 'BOM-2026-001',
      productId: 'prod-001',
      productNumber: 'PRD-001',
      productName: '모터 A',
      version: 'v1',
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
      routing: [{ itemName: '모터 A', sequence: 1, operationName: '절삭', runTime: 30 }],
    });
  }
  if (/^scm-pp\/pp\/boms\/[^/]+$/.test(path) && method === 'DELETE') return okEmpty();
  if (/^scm-pp\/pp\/products\/[^/]+$/.test(path)) {
    const productId = path.split('/').pop();
    return ok({
      productId,
      productName: '모터 A',
      category: 'MOTOR',
      productNumber: 'PRD-001',
      uomName: 'EA',
      unitPrice: 12000,
      supplierName: '대양상사',
    });
  }
  if (path === 'scm-pp/pp/quotations/mrp') {
    const filterQuotation = sp.get('quotationId') ?? '';
    const filterAvailable = sp.get('availableStatusCode') ?? '';
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
    const convertStatuses = ['NOT_CONVERTED', 'CONVERTED', 'PENDING'];
    let allData = Array.from({ length: 500 }, (_, i) => {
      const idx = i + 1;
      const year = 2025 + Math.floor(idx / 300);
      const month = String((idx % 12) + 1).padStart(2, '0');
      const day = String((idx % 28) + 1).padStart(2, '0');
      const nextMonth = String((Number(month) % 12) + 1).padStart(2, '0');
      const requiredQty = ((idx % 50) + 1) * 10;
      const availableStock = (idx % 30) * 5;
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
        consumptionQuantity: Math.min(availableStock, requiredQty),
        itemType: idx % 2 === 0 ? 'MATERIAL' : 'PRODUCT',
        procurementStartDate: `${year}-${month}-${day}`,
        expectedArrivalDate: `${year}-${nextMonth}-${day}`,
        supplierCompanyName: suppliers[idx % suppliers.length],
        convertStatus: convertStatuses[idx % convertStatuses.length],
      };
    });
    if (filterQuotation && filterQuotation !== 'ALL')
      allData = allData.filter((d) => d.quotationId === filterQuotation);
    if (filterAvailable && filterAvailable !== 'ALL')
      allData = allData.filter((d) => d.availableStatusCode === filterAvailable);
    const total = allData.length;
    return ok({
      content: allData.slice(page * size, page * size + size),
      page: makePage(page, size, total),
    });
  }
  if (path === 'scm-pp/pp/mrp/convert') return ok({ converted: true });
  if (path === 'scm-pp/pp/mrp/runs') {
    const filterStatus = sp.get('status') ?? '';
    const filterQuotation = sp.get('quotationId') ?? '';
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
    let allData = Array.from({ length: 500 }, (_, i) => {
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
    if (filterStatus && filterStatus !== 'ALL')
      allData = allData.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      allData = allData.filter((d) => d.quotationNumber.includes(filterQuotation));
    const total = allData.length;
    return ok({
      content: allData.slice(page * size, page * size + size),
      page: makePage(page, size, total),
    });
  }
  if (/^scm-pp\/pp\/mrp\/planned-orders\/detail\/[^/]+$/.test(path)) {
    return ok({
      mrpId: path.split('/').pop(),
      quotationId: 'qt-001',
      quotationCode: 'QT-2026-001',
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
  }
  if (path === 'scm-pp/pp/mes' && method === 'GET') {
    const filterStatus = sp.get('status') ?? '';
    const filterQuotation = sp.get('quotationId') ?? '';
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
    let allData = Array.from({ length: 50 }, (_, i) => {
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
    if (filterStatus && filterStatus !== 'ALL')
      allData = allData.filter((d) => d.status === filterStatus);
    if (filterQuotation && filterQuotation !== 'ALL')
      allData = allData.filter((d) => d.quotationId === filterQuotation);
    const total = allData.length;
    return ok({
      content: allData.slice(page * size, page * size + size),
      page: makePage(page, size, total),
    });
  }
  if (/^scm-pp\/pp\/mes\/[^/]+\/operations\/[^/]+\/start$/.test(path)) return okEmpty();
  if (/^scm-pp\/pp\/mes\/[^/]+\/operations\/[^/]+\/complete$/.test(path)) return okEmpty();
  if (/^scm-pp\/pp\/mes\/[^/]+\/start$/.test(path)) return okEmpty();
  if (/^scm-pp\/pp\/mes\/[^/]+\/complete$/.test(path)) return okEmpty();
  if (/^scm-pp\/pp\/mes\/[^/]+$/.test(path) && method === 'GET') {
    const mesId = path.split('/').pop();
    return ok({
      mesId,
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
  }

  // ──────────────── product/item/toggle (scm-pp 하위) ────────────────
  if (path === 'scm-pp/product/item/toggle') {
    return ok({
      products: [
        {
          itemId: 'item-1001',
          itemNumber: 'ITM-1001',
          itemName: '모터 A',
          uomName: 'EA',
          unitPrice: 12000,
        },
      ],
    });
  }

  // ──────────────── 404 ────────────────
  return NextResponse.json(
    { status: 404, success: false, message: `Not Found: ${path}` },
    { status: 404 },
  );
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
