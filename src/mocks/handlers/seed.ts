import type { Schema } from '@/lib/api/contract';
import { BEARING, MOTOR, WAREHOUSE_ITEMS, line } from './catalog';
import { hashUnit } from './utils';

/**
 * 도메인을 넘는 씨앗(카드 "데모 데이터 채우기"). 직원, 고객, 공급사, 창고, 영업 견적, 영업 주문을 한 곳에 둔다.
 * 여러 도메인 목이 같은 id 와 이름을 쓴다(구매 요청의 요청자 = 직원, 견적과 생산 견적의 고객 = 고객 목록 등).
 * 이름과 회사는 지어낸 것이다. 값은 결정적이다(난수 없음, 해시는 `hashUnit`)
 */

type Line = ReturnType<typeof line>;

// ---------- 날짜(날짜 글자 YYYY-MM-DD). 계산은 UTC 자정끼리, "오늘"만 한국 날짜다 ----------

const DAY = 86_400_000;
const ms = (key: string) => new Date(`${key}T00:00:00Z`).getTime();
const keyOf = (time: number) => new Date(time).toISOString().slice(0, 10);
/**
 * 오늘(한국 날짜, UTC+9). 화면은 브라우저 날짜로 매출 분석 기간을 보내고 앱 시간대가 Asia/Seoul 이다.
 * UTC 로 세면 한국 월요일 0~9시에 차트의 새 주는 0건인데 통계는 지난주를 세어 어긋난다(리뷰 M1)
 */
export const todayKey = () => keyOf(Date.now() + 9 * 3_600_000);
export const addDays = (key: string, days: number) => keyOf(ms(key) + days * DAY);
/** 그 날짜가 든 주의 월요일 */
export const mondayOf = (key: string) => addDays(key, -((new Date(ms(key)).getUTCDay() + 6) % 7));
/** 그 날짜의 달에서 months 달 앞의 1일 */
export const monthStart = (key: string, months = 0) => {
  const date = new Date(ms(key));
  return keyOf(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, 1));
};

// ---------- 직원 ----------

export const DEPARTMENTS = [
  { key: 'dept-001', value: '영업팀' },
  { key: 'dept-002', value: '구매팀' },
  { key: 'dept-003', value: '생산팀' },
  { key: 'dept-004', value: '재무팀' },
  { key: 'dept-005', value: '인사팀' },
  { key: 'dept-006', value: '물류팀' },
];

/** 부서마다 7명. 첫 사람이 팀장이다. 영업팀의 김영업, 이영업, 박영업은 견적 담당자로 나오던 이름이다 */
const NAMES = [
  ['홍길동', '김영업', '이영업', '박영업', '최민준', '정서연', '강도윤'],
  ['윤지호', '장하은', '임준서', '한지민', '오현우', '서예린', '신동현'],
  ['권태호', '황민서', '안재원', '송유나', '전승민', '홍지수', '고은비'],
  ['문성준', '양서윤', '손지훈', '배수아', '백건우', '허예준', '남다은'],
  ['유정민', '노하린', '하준혁', '곽소희', '성민재', '차윤서', '주태양'],
  ['우진혁', '구나연', '민경호', '류다인', '진성우', '엄지원', '채도현'],
];
const CITIES = [
  '서울특별시 강남구',
  '서울특별시 마포구',
  '경기도 성남시',
  '인천광역시 연수구',
  '경기도 수원시',
];
/** 퇴사 처리된 직원(비활성). 나머지 40명이 근태 집계 인원(HEADCOUNT)과 같다 */
const INACTIVE_EMPLOYEES = new Set(['주태양', '채도현']);
/** 견적과 고객 담당자로 나오던 연락처는 그대로 둔다 */
const CONTACTS: Partial<Record<string, { phone: string; email: string }>> = {
  홍길동: { phone: '010-1234-5678', email: 'user@everp.co.kr' },
  김영업: { phone: '010-1111-2222', email: 'sales@everp.co.kr' },
};

export const EMPLOYEES: Array<Schema<'EmployeeData'>> = NAMES.flatMap((names, d) =>
  names.map((name, k) => {
    const i = d * 7 + k;
    const serial = String(i + 1).padStart(3, '0');
    // 홍길동(emp-001)은 예전 직원 목의 입사일, 생일, 주소 그대로
    const first = i === 0;
    const hireDate = first
      ? '2022-03-01'
      : `${2014 + ((i * 5) % 12)}-${String(((i * 7) % 12) + 1).padStart(2, '0')}-${String(((i * 3) % 27) + 1).padStart(2, '0')}`;
    return {
      employeeId: `emp-${serial}`,
      employeeNumber: `EMP-2026-${serial}`,
      name,
      email: CONTACTS[name]?.email ?? `emp${serial}@everp.co.kr`,
      phone:
        CONTACTS[name]?.phone ??
        `010-${String(3000 + i * 131).slice(-4)}-${String(5000 + i * 277).slice(-4)}`,
      position: k === 0 ? '팀장' : '사원',
      department: DEPARTMENTS[d].value,
      statusCode: INACTIVE_EMPLOYEES.has(name) ? 'INACTIVE' : 'ACTIVE',
      hireDate,
      birthDate: first
        ? '1990-01-01'
        : `${1975 + ((i * 3) % 25)}-${String(((i * 5) % 12) + 1).padStart(2, '0')}-${String(((i * 7) % 27) + 1).padStart(2, '0')}`,
      address: first ? '서울특별시 강남구' : CITIES[i % CITIES.length],
      createdAt: `${hireDate}T09:00:00.000Z`,
      updatedAt: `${hireDate}T09:00:00.000Z`,
    };
  }),
);
/** 부서 이름의 id. 모르는 이름은 빈 글자 */
export const departmentIdOf = (name: string) =>
  DEPARTMENTS.find((option) => option.value === name)?.key ?? '';
/** 이름으로 찾은 직원. 씨앗에 있는 이름만 부른다 */
const employee = (name: string) => EMPLOYEES.find((row) => row.name === name) ?? EMPLOYEES[0];

// ---------- 고객 ----------

export type Customer = Schema<'SalesCustomer'>;
export interface CustomerExtra {
  ceoName: string;
  businessNumber: string;
  customerPhone: string;
  customerEmail: string;
  baseAddress: string;
  detailAddress: string;
  note: string;
}

/** [이름, 대표, 담당 영업 직원, 주소, 상태] */
const CUSTOMER_ROWS: Array<[string, string, string, string, 'ACTIVE' | 'INACTIVE']> = [
  ['한빛전자', '박대표', '김영업', '서울특별시 강서구 공항대로 10', 'ACTIVE'],
  ['대성기계', '김대표', '이영업', '경기도 안산시 단원구 산단로 55', 'ACTIVE'],
  ['서진산업', '정대표', '박영업', '경상남도 창원시 성산구 공단로 210', 'ACTIVE'],
  ['미래전자', '이대표', '최민준', '경기도 수원시 영통구 광교로 107', 'ACTIVE'],
  ['세광정밀', '윤대표', '정서연', '인천광역시 남동구 남동대로 215', 'ACTIVE'],
  ['동해기공', '조대표', '강도윤', '울산광역시 북구 산업로 915', 'ACTIVE'],
  ['우진테크', '한대표', '김영업', '충청북도 청주시 흥덕구 직지대로 380', 'ACTIVE'],
  ['한결산업', '오대표', '이영업', '대구광역시 달서구 성서공단로 11', 'ACTIVE'],
  ['청명전기', '서대표', '박영업', '광주광역시 광산구 하남산단로 60', 'ACTIVE'],
  ['금강엔지니어링', '신대표', '최민준', '대전광역시 유성구 테크노로 77', 'ACTIVE'],
  ['새솔로보틱스', '권대표', '정서연', '경기도 성남시 분당구 판교로 255', 'ACTIVE'],
  ['대륙중공업', '황대표', '강도윤', '경상남도 거제시 장평로 30', 'ACTIVE'],
  ['보람플랜트', '안대표', '김영업', '전라남도 여수시 산단로 120', 'INACTIVE'],
  ['성원오토', '송대표', '이영업', '충청남도 아산시 배방읍 모산로 18', 'ACTIVE'],
  ['나래반도체', '전대표', '박영업', '경기도 평택시 고덕면 고덕로 300', 'INACTIVE'],
];

export const CUSTOMERS: Array<{ customer: Customer; extra: CustomerExtra }> = CUSTOMER_ROWS.map(
  ([customerName, ceoName, managerName, baseAddress, statusCode], i) => {
    const serial = String(i + 1).padStart(3, '0');
    const manager = employee(managerName);
    return {
      customer: {
        customerId: `cus-${serial}`,
        customerNumber: `CUS-${serial}`,
        customerName,
        manager: { managerName, managerPhone: manager.phone, managerEmail: manager.email },
        address: baseAddress,
        // 거래 금액, 주문 수, 마지막 주문일은 영업 목이 주문 목록에서 센다
        totalTransactionAmount: 0,
        orderCount: 0,
        lastOrderDate: '',
        statusCode,
      },
      extra:
        i === 0
          ? {
              ceoName,
              businessNumber: '123-45-67890',
              customerPhone: '02-222-3333',
              customerEmail: 'contact@hanbit.co.kr',
              baseAddress,
              detailAddress: '5층',
              note: '중요 고객',
            }
          : {
              ceoName,
              businessNumber: `${130 + i * 7}-${81 + (i % 7)}-${String(10000 + i * 2371).slice(-5)}`,
              customerPhone: `0${31 + (i % 9)}-${300 + i * 17}-${String(1000 + i * 433).slice(-4)}`,
              customerEmail: `contact@cus${serial}.co.kr`,
              baseAddress,
              detailAddress: `${(i % 4) + 1}동 ${(i % 3) + 1}층`,
              note: statusCode === 'INACTIVE' ? '거래 중단' : '',
            },
    };
  },
);
const customerNamed = (name: string) =>
  CUSTOMERS.find(({ customer }) => customer.customerName === name)?.customer ??
  CUSTOMERS[0].customer;
const ACTIVE_CUSTOMERS = CUSTOMERS.filter(({ customer }) => customer.statusCode === 'ACTIVE');

// ---------- 공급사 ----------

type SupplierInfo = Omit<Schema<'SupplierInfo'>, 'supplierStatusCode' | 'category'> & {
  supplierStatusCode: string;
  category: string;
};
const SUPPLIER_ROWS: Array<[string, string, number, string, string, string, string]> = [
  ['대양상사', 'MATERIAL', 5, '부산광역시 사상구', '2층', 'ACTIVE', '정공급'],
  ['대한금속', 'PARTS', 7, '경기도 시흥시 정왕동', '3층', 'ACTIVE', '김공급'],
  ['한성파스너', 'PARTS', 4, '인천광역시 서구 가좌동', '1층', 'ACTIVE', '이공급'],
  ['하나금속', 'MATERIAL', 6, '경상북도 포항시 남구', '2층', 'ACTIVE', '박공급'],
  ['세진부품', 'PARTS', 10, '경상남도 김해시 주촌면', '1층', 'INACTIVE', '최공급'],
  ['동양소재', 'MATERIAL', 8, '충청남도 당진시 송악읍', '4층', 'ACTIVE', '한공급'],
];
export const SUPPLIERS: Array<{ supplierInfo: SupplierInfo; managerInfo: Schema<'ManagerInfo'> }> =
  SUPPLIER_ROWS.map(
    ([supplierName, category, deliveryLeadTime, base, detail, status, managerName], i) => {
      const serial = String(i + 1).padStart(3, '0');
      return {
        supplierInfo: {
          supplierId: `sup-${serial}`,
          supplierName,
          supplierNumber: `SUP-${serial}`,
          supplierEmail: i === 0 ? 'supplier@everp.co.kr' : `sales@sup${serial}.co.kr`,
          supplierPhone: i === 0 ? '02-999-0000' : `0${51 + i}-${400 + i * 23}-${1000 + i * 111}`,
          supplierBaseAddress: base,
          supplierDetailAddress: detail,
          supplierStatusCode: status,
          category,
          deliveryLeadTime,
        },
        managerInfo: {
          managerName,
          managerPhone: i === 0 ? '010-9999-0000' : `010-${7000 + i * 101}-${2000 + i * 37}`,
          managerEmail: i === 0 ? 'manager@supplier.co.kr' : `manager@sup${serial}.co.kr`,
        },
      };
    },
  );
export const ACTIVE_SUPPLIERS = SUPPLIERS.filter(
  ({ supplierInfo }) => supplierInfo.supplierStatusCode === 'ACTIVE',
);

/** 자재(품목표에서 완제품 모터 A 를 뺀 13개). 구매 요청, 발주, MRP, BOM 구성품이 쓴다 */
export const MATERIALS = WAREHOUSE_ITEMS.filter((item) => item.itemId !== MOTOR.itemId);

// ---------- 창고 ----------

const WAREHOUSE_ROWS: Array<[string, string, string, string]> = [
  ['1공장 창고', 'RAW', '서울 강서구', 'ACTIVE'],
  ['1공장 제품 창고', 'ITEM', '서울 강서구', 'ACTIVE'],
  ['2공장 원자재 창고', 'MATERIAL', '경기 화성시', 'ACTIVE'],
  ['2공장 제품 창고', 'ITEM', '경기 화성시', 'ACTIVE'],
  ['3공장 부품 창고', 'MATERIAL', '충남 아산시', 'ACTIVE'],
  ['평택 물류센터', 'ETC', '경기 평택시', 'ACTIVE'],
  ['부산 물류센터', 'ETC', '부산 강서구', 'ACTIVE'],
  ['인천 보세 창고', 'ETC', '인천 중구', 'INACTIVE'],
  ['대전 부품 창고', 'MATERIAL', '대전 대덕구', 'ACTIVE'],
  ['광주 원자재 창고', 'MATERIAL', '광주 광산구', 'ACTIVE'],
  ['시화 자재 창고', 'MATERIAL', '경기 시흥시', 'ACTIVE'],
  ['반품 창고', 'ETC', '서울 강서구', 'INACTIVE'],
];
export const WAREHOUSES: Array<Schema<'WarehouseListItem'>> = WAREHOUSE_ROWS.map(
  ([warehouseName, warehouseType, location, statusCode], i) => ({
    warehouseId: `wh-${String(i + 1).padStart(3, '0')}`,
    warehouseNumber: `WH-${String(i + 1).padStart(3, '0')}`,
    warehouseName,
    statusCode,
    warehouseType,
    location,
    manager: '이자재',
    managerPhone: '010-2222-3333',
  }),
);

// ---------- 영업 견적 ----------

export type Quote = Schema<'Quote'>;
/**
 * 영업 견적 16건과 품목 줄. 줄 금액 합이 총액이다. 생산 견적과 시뮬레이션도 이 견적을 쓴다(제품 = 첫 줄).
 * qt-001~004 는 예전 값 그대로. 대기(PENDING) 중 qt-016 은 재고(모터 A 120, 베어링 B 20) 안이라 즉시 납품,
 * qt-002, 009, 014 는 넘쳐 생산 검토로 간다
 */
const QUOTE_ROWS: Array<[string, string, string, Quote['statusCode'], number, number]> = [
  ['한빛전자', '김영업', '2026-01-10', 'APPROVAL', 875, 250],
  ['대성기계', '이영업', '2026-01-14', 'PENDING', 225, 200],
  ['서진산업', '김영업', '2026-01-18', 'REVIEW', 450, 300],
  ['한빛전자', '박영업', '2026-01-20', 'REJECTED', 125, 75],
  ['세광정밀', '정서연', '2026-10-02', 'APPROVAL', 300, 120],
  ['동해기공', '강도윤', '2026-10-07', 'REJECTED', 80, 0],
  ['우진테크', '김영업', '2026-10-10', 'REVIEW', 500, 200],
  ['한결산업', '이영업', '2026-10-15', 'APPROVAL', 60, 15],
  ['청명전기', '박영업', '2026-10-20', 'PENDING', 250, 80],
  ['금강엔지니어링', '최민준', '2026-10-23', 'REVIEW', 180, 40],
  ['새솔로보틱스', '정서연', '2026-10-28', 'APPROVAL', 100, 20],
  ['대륙중공업', '강도윤', '2026-10-31', 'REJECTED', 400, 150],
  ['미래전자', '최민준', '2026-11-04', 'REVIEW', 220, 60],
  ['성원오토', '이영업', '2026-11-06', 'PENDING', 350, 120],
  ['서진산업', '박영업', '2026-11-10', 'APPROVAL', 90, 10],
  ['대성기계', '이영업', '2026-11-12', 'PENDING', 40, 10],
];
/** qt-001~004 의 예전 납기 */
const OLD_DUE = ['2026-02-01', '2026-02-10', '2026-02-15', '2026-02-20'];

export const QUOTES: Array<{ quote: Quote; lines: Line[] }> = QUOTE_ROWS.map(
  ([customerName, managerName, quotationDate, statusCode, motor, bearing], i) => {
    const serial = String(i + 1).padStart(3, '0');
    const lines = [line(MOTOR, motor), ...(bearing ? [line(BEARING, bearing)] : [])];
    return {
      quote: {
        quotationId: `qt-${serial}`,
        quotationNumber: `QT-2026-${serial}`,
        customerName,
        managerName,
        quotationDate,
        dueDate: OLD_DUE[i] ?? addDays(quotationDate, 30),
        totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
        statusCode,
      },
      lines,
    };
  },
);

// ---------- 영업 주문 ----------

export type Order = Schema<'Order'>;
export interface SeedOrder {
  order: Order;
  lines: Line[];
}

const orderOf = (
  salesOrderId: string,
  salesOrderNumber: string,
  customerName: string,
  orderDate: string,
  dueDate: string,
  statusCode: Order['statusCode'],
  lines: Line[],
): SeedOrder => ({
  order: {
    salesOrderId,
    salesOrderNumber,
    customerName,
    manager: customerNamed(customerName).manager,
    orderDate,
    dueDate,
    totalAmount: lines.reduce((sum, item) => sum + item.amount, 0),
    statusCode,
  },
  lines,
});

/**
 * 재고 목록이 같은 id 로 가리키는 주문 둘. so-001 은 재고의 생산중 목록, so-002 는 출고 준비 목록과 같은 주문이다
 */
const ANCHOR_ORDERS: SeedOrder[] = [
  orderOf('so-001', 'SO-2026-001', '한빛전자', '2026-01-12', '2026-02-05', 'IN_PRODUCTION', [
    line(MOTOR, 550),
    line(BEARING, 250),
  ]),
  orderOf('so-002', 'SO-2026-002', '미래전자', '2026-01-10', '2026-02-02', 'READY_FOR_SHIPMENT', [
    line(BEARING, 650),
  ]),
];

/** 주문 번호를 세기 시작하는 주(월요일). 번호는 이 주부터 이어 세어 창이 옮겨 가도 같은 주문은 같은 id 다 */
const ORDER_EPOCH = '2025-11-03';
/**
 * 오늘이 든 주에서 몇 주 앞까지 만드나(리뷰 M3). 재무 월별 손익 12달(열한 달 전 1일부터)이 늘 들고,
 * 시간이 지나도 행이 끝없이 늘지 않는다
 */
const ORDER_WINDOW_WEEKS = 53;
/** 그 주의 주문 수(8~20) */
const weekCount = (monday: string) => 8 + Math.floor(hashUnit(monday) * 13);

/** 주문일에서 지난 날 수로 정하는 진행 상태(verified=false, 서버의 상태 전이 기간을 모른다) */
const statusByAge = (days: number): Order['statusCode'] =>
  days <= 3
    ? 'MATERIAL_PREPARATION'
    : days <= 10
      ? 'IN_PRODUCTION'
      : days <= 17
        ? 'READY_FOR_SHIPMENT'
        : days <= 24
          ? 'DELIVERING'
          : 'DELIVERED';

/**
 * 주마다 만든 주문(카드 "데모 데이터 채우기" 결정 4). 주의 월요일 글자로 정해지는 해시로 주문 수(8~20)를 고르고
 * 주문마다 평일 하루, 활성 고객, 모터 A 와 베어링 B 수량을 고른다. 주의 첫 주문은 늘 월요일이다(월요일에
 * "이번 주 신규 주문 0"이 안 되게, 리뷰 M1). 오늘 뒤 날짜는 만들지 않는다. 오늘이 든 주에서 53주 앞까지만 만든다.
 * id 는 so-003 부터 ORDER_EPOCH 주에서 날짜 순으로 이어 센다. 번호는 `SO-<주문 연도>-<순번>`.
 * 상태는 오늘에서 지난 날로 정한다
 */
const generateOrders = (today: string): SeedOrder[] => {
  const windowStart = addDays(mondayOf(today), -ORDER_WINDOW_WEEKS * 7);
  const first = windowStart > ORDER_EPOCH ? windowStart : ORDER_EPOCH;
  // 창 앞 주들의 주문 수만큼 번호를 건너뛴다(그 주들은 다 지나 전부 셀 수 있다)
  let skipped = 0;
  for (let monday = ORDER_EPOCH; monday < first; monday = addDays(monday, 7))
    skipped += weekCount(monday);
  const drafts: Array<{ date: string; customer: string; lines: Line[]; due: number }> = [];
  for (let monday = first; monday <= today; monday = addDays(monday, 7)) {
    const week = Array.from({ length: weekCount(monday) }, (_, j) => {
      const h = (what: string) => hashUnit(`${monday}:${j}:${what}`);
      const motor = 300 + Math.floor(h('motor') * 100) * 10;
      const bearing = 200 + Math.floor(h('bearing') * 80) * 10;
      return {
        date: j === 0 ? monday : addDays(monday, Math.floor(h('day') * 5)),
        customer:
          ACTIVE_CUSTOMERS[Math.floor(h('customer') * ACTIVE_CUSTOMERS.length)].customer
            .customerName,
        lines:
          h('mix') < 0.25 ? [line(MOTOR, motor)] : [line(MOTOR, motor), line(BEARING, bearing)],
        due: 21 + Math.floor(h('due') * 14),
      };
    });
    drafts.push(
      ...week.filter((draft) => draft.date <= today).sort((a, b) => a.date.localeCompare(b.date)),
    );
  }
  return drafts.map((draft, i) => {
    const serial = String(skipped + i + 3).padStart(3, '0');
    return orderOf(
      `so-${serial}`,
      `SO-${draft.date.slice(0, 4)}-${serial}`,
      draft.customer,
      draft.date,
      addDays(draft.date, draft.due),
      statusByAge((ms(today) - ms(draft.date)) / DAY),
      draft.lines,
    );
  });
};

let cached: { today: string; orders: SeedOrder[] } | undefined;
/** 기본 주문(로그인 없음) 전부. 같은 날에는 한 번만 만든다 */
export const seedOrders = (today = todayKey()): SeedOrder[] => {
  if (cached?.today !== today)
    cached = { today, orders: [...ANCHOR_ORDERS, ...generateOrders(today)] };
  return cached.orders;
};

/** from~to(양끝 포함) 주문의 건수와 금액 합 */
export const orderTotals = (orders: Order[], from: string, to: string) => {
  const inRange = orders.filter((order) => order.orderDate >= from && order.orderDate <= to);
  return {
    count: inRange.length,
    amount: inRange.reduce((sum, order) => sum + order.totalAmount, 0),
  };
};
