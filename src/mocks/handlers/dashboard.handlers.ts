import { http } from 'msw';
import { DASHBOARD_ENDPOINTS } from '@/app/types/api';
import { ok, error, shouldError, isoNow, stat, statResponse } from './utils';

const mockDashboardStats = statResponse({
  total_sales: stat,
  total_purchases: stat,
  net_profit: stat,
  total_employees: stat,
});

/**
 * 역할 앞 글자(MM_ADMIN 의 MM)별 워크플로우 탭 코드. 게이트웨이 DashboardServiceImpl.java:56 의 switch 와 같은 코드, 같은 순서다
 * (SUPPLIER :57, CUSTOMER :81, MM :105, SD :135, FCM :159, IM :172, HRM :196, PP :220).
 */
const WORKFLOW_TABS: Partial<Record<string, readonly [string, string]>> = {
  SUPPLIER: ['PO', 'AR'],
  CUSTOMER: ['QT', 'AP'],
  MM: ['PO', 'SO'],
  SD: ['QT', 'SO'],
  FCM: ['AR', 'AP'],
  IM: ['IN', 'OUT'],
  HRM: ['ATT', 'LV'],
  PP: ['QT', 'MES'],
};
// 게이트웨이 default(:244). ALL_ADMIN 과 모르는 역할은 재무와 같은 전표 탭
const DEFAULT_WORKFLOW_TABS = ['AR', 'AP'] as const;

/**
 * 역할은 프록시가 서버 목으로 넘길 때 세션에서 붙이는 x-session-role 헤더로 안다(src/app/api/proxy/[...path]/route.ts).
 * 브라우저 MSW(워커)와 단위 테스트는 헤더가 없어 기본 탭을 받는다.
 */
const workflowTabCodes = (role: string | null): readonly [string, string] =>
  WORKFLOW_TABS[role?.split('_')[0] ?? ''] ?? DEFAULT_WORKFLOW_TABS;

const WORKFLOW_ITEMS: Partial<Record<string, { itemTitle: string; itemNumber: string }>> = {
  PO: { itemTitle: '발주서 승인 대기', itemNumber: 'PO-2026-001' },
  SO: { itemTitle: '주문서 확인', itemNumber: 'SO-2026-001' },
  QT: { itemTitle: '견적서 검토', itemNumber: 'QT-2026-001' },
  AR: { itemTitle: '매출 전표 확인', itemNumber: 'AR-2026-001' },
  AP: { itemTitle: '매입 전표 확인', itemNumber: 'AP-2026-001' },
  IN: { itemTitle: '입고 대기', itemNumber: 'IN-2026-001' },
  OUT: { itemTitle: '출고 준비', itemNumber: 'OUT-2026-001' },
  ATT: { itemTitle: '출퇴근 기록 확인', itemNumber: 'ATT-2026-001' },
  LV: { itemTitle: '휴가 신청', itemNumber: 'LV-2026-001' },
  MES: { itemTitle: '생산 작업 진행', itemNumber: 'MES-2026-001' },
};

const workflowTab = (tabCode: string) => {
  const item = WORKFLOW_ITEMS[tabCode];
  return {
    tabCode,
    items: item
      ? [{ itemId: `wf-${tabCode}`, ...item, name: '김담당', statusCode: 'PENDING', date: isoNow }]
      : [],
  };
};

export const dashboardHandlers = [
  http.get(DASHBOARD_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load dashboard stats', 500);
    return ok(mockDashboardStats);
  }),
  http.get(DASHBOARD_ENDPOINTS.WORKFLOW_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load workflow status', 500);
    return ok({ tabs: workflowTabCodes(request.headers.get('x-session-role')).map(workflowTab) });
  }),
];
