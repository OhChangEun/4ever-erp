'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('dashboard');
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
    // 도메인 레이아웃마다 QueryClient 가 따로라 다른 화면의 mutation 은 이 키를 지울 수 없다. 대시보드에 올 때마다
    // 다시 받는다(서버가 미리 받은 값이 staleTime 안이어도). 떠 있는 동안 바꾸는 것은 견적 요청 모달 하나이고 ActionCard 가 무효화한다
    refetchOnMount: 'always',
  });

  if (statsLoading || workflowLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // 카드에는 제목 키와 단위 없는 직원 수가 있다. 글자와 단위는 여기서 붙인다
  const dashboardStatsData = dashboardStats
    ? Object.fromEntries(
        Object.entries(mapDashboardStatsToCards(dashboardStats)).map(([period, cards]) => [
          period,
          cards.map((card) => ({
            ...card,
            title: t(`stats.${card.title}`),
            value:
              card.title === 'totalEmployees'
                ? t('employeeCount', { value: card.value })
                : card.value,
          })),
        ]),
      )
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
