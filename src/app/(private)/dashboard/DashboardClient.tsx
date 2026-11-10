'use client';

import { useQuery } from '@tanstack/react-query';
import QuickActions from '@/app/(private)/dashboard/components/QuickActions';
import WorkflowStatus from '@/app/(private)/dashboard/components/WorkflowStatus';
import StatSection, { EMPTY_STATS } from '@/app/components/common/StatSection';
import { getDashboardStats, getWorkflowStatus } from '@/app/(private)/dashboard/dashboard.api';
import { mapDashboardStatsToCards } from './dashboard.service';
import { dashboardKeys } from '@/app/(private)/dashboard/dashboard.keys';
import SupplyFlow from '@/app/(private)/dashboard/components/supplyFlow/SupplyFlow';
import { useRole } from '@/app/hooks/useRole';
import { OPERATIONS } from '@/lib/authz/policy';
import type { Role } from '@/lib/authz/policy';

export default function DashboardClient() {
  const role = useRole();
  // 회사 전체 자재 금액이라 운영 역할만. API 도 같은 표로 막는다(시각화 6)
  const readonlyOps: readonly Role[] = OPERATIONS;
  const showSupplyFlow = readonlyOps.some((r) => r === role);
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: getDashboardStats,
  });

  const { data: workflowData, isLoading: workflowLoading } = useQuery({
    queryKey: dashboardKeys.workflowStatus(),
    queryFn: getWorkflowStatus,
  });

  if (statsLoading || workflowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const dashboardStatsData = dashboardStats
    ? mapDashboardStatsToCards(dashboardStats)
    : EMPTY_STATS;

  return (
    <div>
      <main className="w-full px-6 py-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={dashboardStatsData} error={statsError} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 mb-8">
          {/* 빠른 작업 */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>

          {/* 워크플로우 현황 */}
          <div className="lg:col-span-2">
            <WorkflowStatus workflowData={workflowData} />
          </div>
        </div>

        {showSupplyFlow && <SupplyFlow />}
      </main>
    </div>
  );
}
