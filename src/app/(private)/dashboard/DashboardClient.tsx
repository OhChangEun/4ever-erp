'use client';

import { useQuery } from '@tanstack/react-query';
import QuickActions from '@/app/(private)/dashboard/components/QuickActions';
import WorkflowStatus from '@/app/(private)/dashboard/components/WorkflowStatus';
import StatSection from '@/app/components/common/StatSection';
import { getDashboardStats, getWorkflowStatus } from '@/app/(private)/dashboard/dashboard.api';
import { mapDashboardStatsToCards } from './dashboard.service';

export default function DashboardClient() {
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  const { data: workflowData, isLoading: workflowLoading } = useQuery({
    queryKey: ['workflowStatus'],
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
    : { week: [], month: [], quarter: [], year: [] };

  return (
    <div>
      <main className="w-full px-6 py-6">
        {/* 페이지 헤더 */}
        <StatSection statsData={dashboardStatsData} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 mb-8">
          {/* 빠른 작업 */}
          <div className="lg:col-span-1">
            <QuickActions />
          </div>

          {/* 워크플로우 현황 */}
          <div className="lg:col-span-2">
            <WorkflowStatus $workflowData={workflowData} />
          </div>
        </div>
      </main>
    </div>
  );
}
