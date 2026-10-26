import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { getDashboardStats, getWorkflowStatus } from './dashboard.api';
import DashboardClient from './DashboardClient';
import { dashboardKeys } from './dashboard.keys';

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: dashboardKeys.stats(), queryFn: getDashboardStats }),
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.workflowStatus(),
      queryFn: getWorkflowStatus,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
