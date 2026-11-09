import { FCM, HRM, IM, MM, PP, SD } from '@/lib/role';

export const getTabCodeText = (tabCode: string | undefined) => {
  switch (tabCode) {
    case 'PO':
      return '발주 프로세스';
    case 'AP':
      return '매입 프로세스';
    case 'AR':
      return '매출 프로세스';
    case 'SO':
      return '주문 프로세스';
    case 'PR':
      return '구매 프로세스';
    case 'ATT':
      return '근태 프로세스';
    case 'LV':
      return '휴가 프로세스';
    case 'QT':
      return '견적 프로세스';
    case 'MES':
      return '생산 프로세스';
    default:
      return '알 수 없는 프로세스';
  }
};

export const getColorClasses = (color: string) => {
  // 모르는 색 이름이 오면 파랑. Partial 이라 없는 키는 undefined 로 잡힌다
  const colorMap: Partial<Record<string, { bg: string; icon: string }>> = {
    red: { bg: 'bg-red-100', icon: 'text-red-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
    purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
    orange: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  };
  return colorMap[color] ?? { bg: 'bg-blue-100', icon: 'text-blue-600' };
};

export const allActions = [
  // ------------ 구매 관리 ------------
  {
    title: '구매 요청',
    description: '새로운 구매 요청을 생성합니다.',
    icon: 'ri-shopping-cart-line',
    color: 'red',
    href: '/purchase',
    roles: [...MM, ...SD, ...IM, ...FCM, ...HRM, ...PP],
  },
  {
    title: '발주서 확인',
    description: '발주서 목록을 조회합니다.',
    icon: 'ri-file-text-line',
    color: 'indigo',
    href: 'purchase?tab=orders',
    roles: MM,
  },
  {
    title: '재고 확인',
    description: '재고 현황을 확인합니다.',
    icon: 'ri-box-3-line',
    color: 'purple',
    href: '/inventory',
    roles: MM,
  },
  {
    title: '공급사 확인',
    description: '공급업체 정보를 확인합니다.',
    icon: 'ri-building-line',
    color: 'orange',
    href: '/purchase?tab=suppliers',
    roles: MM,
  },
  // ------------ 영업 관리 ------------
  {
    title: '견적서 확인',
    description: '견적 목록을 조회합니다.',
    icon: 'ri-file-text-line',
    color: 'green',
    href: '/sales?tab=quotes',
    roles: SD,
  },
  {
    title: '주문서 확인',
    description: '주문 목록을 조회합니다.',
    icon: 'ri-shopping-cart-line',
    color: 'indigo',
    href: '/sales?tab=orders',
    roles: SD,
  },
  {
    title: '고객사 확인',
    description: '고객 목록을 조회합니다.',
    icon: 'ri-user-line',
    color: 'purple',
    href: '/sales?tab=customers',
    roles: [...SD, 'ALL_ADMIN'],
  },
  {
    title: '매출 분석 확인',
    description: '매출 통계를 조회합니다.',
    icon: 'ri-bar-chart-line',
    color: 'orange',
    href: '/sales?tab=analytics',
    roles: SD,
  },
  // ------------ 재고 관리 ------------
  {
    title: '재고 확인',
    description: '재고 목록을 조회합니다.',
    icon: 'ri-box-3-line',
    color: 'green',
    href: '/inventory?tab=inventory',
    roles: IM,
  },
  {
    title: '출고 상태 확인',
    description: '생산중, 출고 준비 완료 목록을 조회합니다.',
    icon: 'ri-truck-line',
    color: 'indigo',
    href: '/inventory?tab=shipping',
    roles: IM,
  },
  {
    title: '입고 상태 확인',
    description: '입고 대기, 입고 완료 목록을 조회합니다.',
    icon: 'ri-shopping-cart-line',
    color: 'purple',
    href: '/inventory?tab=receiving',
    roles: IM,
  },
  {
    title: '창고 확인',
    description: '창고 현황을 조회합니다.',
    icon: 'ri-store-2-line',
    color: 'orange',
    href: '/warehouse',
    roles: IM,
  },
  // ------------ 재무 관리 ------------
  {
    title: '매출 전표 확인',
    description: '매출 전표 확인 목록을 조회합니다.',
    icon: 'ri-archive-line',
    color: 'green',
    href: '/finance?tab=sales',
    roles: [...FCM, 'ALL_ADMIN'],
  },
  {
    title: '매입 전표 확인',
    description: '매입 전표 목록을 조회합니다.',
    icon: 'ri-archive-line',
    color: 'indigo',
    href: '/finance?tab=purchase',
    roles: [...FCM, 'ALL_ADMIN'],
  },
  // ------------ 인적자원 관리 ------------
  {
    title: '직원 정보 확인',
    description: '직원 목록을 조회합니다.',
    icon: 'ri-user-3-line',
    color: 'green',
    href: '/hrm?tab=employee-management',
    roles: HRM,
  },
  {
    title: '급여 확인',
    description: '생산중, 출고 준비 완료 목록을 조회합니다.',
    icon: 'ri-money-dollar-circle-line',
    color: 'indigo',
    href: '/hrm?tab=payroll-management',
    roles: HRM,
  },
  {
    title: '근태 확인',
    description: '입고 대기, 입고 완료 목록을 조회합니다.',
    icon: 'ri-time-line',
    color: 'purple',
    href: '/hrm?tab=attendance-management',
    roles: HRM,
  },
  {
    title: '교육 정보 확인',
    description: '창고 현황을 조회합니다.',
    icon: 'ri-book-open-line',
    color: 'orange',
    href: '/hrm?tab=training-management',
    roles: HRM,
  },

  // ------------ 생산 관리 ------------
  {
    title: '견적 확인',
    description: '견적 목록을 조회합니다.',
    icon: 'ri-file-list-3-line',
    color: 'green',
    href: '/production?tab=quotations',
    roles: PP,
  },
  {
    title: 'MPS 확인',
    description: '주생산계획을 조회합니다.',
    icon: 'ri-calendar-check-line',
    color: 'indigo',
    href: '/production?tab=mps',
    roles: PP,
  },
  {
    title: 'MRP 확인',
    description: '자재소요계획을 조회합니다.',
    icon: 'ri-calculator-line',
    color: 'purple',
    href: '/production?tab=mrp',
    roles: PP,
  },
  {
    title: 'MES 확인',
    description: '제조실행시스템을 조회합니다.',
    icon: 'ri-cpu-line',
    color: 'orange',
    href: '/production?tab=mes',
    roles: PP,
  },
  {
    title: 'BOM 확인',
    description: 'BOM 목록을 조회합니다.',
    icon: 'ri-node-tree',
    color: 'teal',
    href: '/production?tab=bom',
    roles: PP,
  },

  //--------------고객사 & 공급사-----------------
  {
    title: '자재 목록 수정',
    description: '제공 가능한 자재 목록을 수정합니다.',
    icon: 'ri-shopping-cart-line',
    color: 'green',
    href: '/purchase/request/new',
    roles: ['SUPPLIER_ADMIN'],
  },
  {
    title: '신규 견적서 작성',
    description: '새로운 견적서를 작성합니다.',
    icon: 'ri-file-text-line',
    color: 'indigo',
    href: '/production',
    roles: ['CUSTOMER_ADMIN'],
  },
  {
    title: '자사 정보 수정',
    description: '자사 정보를 수정합니다.',
    icon: 'ri-building-line',
    color: 'orange',
    href: '/companies',
    roles: ['SUPPLIER_ADMIN', 'CUSTOMER_ADMIN'],
  },
];
