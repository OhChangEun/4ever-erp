import { http } from 'msw';
import { DASHBOARD_ENDPOINTS } from '@/app/types/api';
import { ok, error, shouldError, isoNow, stat, statResponse } from './utils';

const mockDashboardStats = statResponse({
  total_sales: stat,
  total_purchases: stat,
  net_profit: stat,
  total_employees: stat,
});

export const dashboardHandlers = [
  http.get(DASHBOARD_ENDPOINTS.STATS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load dashboard stats', 500);
    return ok(mockDashboardStats);
  }),
  http.get(DASHBOARD_ENDPOINTS.WORKFLOW_STATUS, ({ request }) => {
    if (shouldError(request)) return error('Failed to load workflow status', 500);
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
  }),
];
