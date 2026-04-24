import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { getDashboardStats, getWorkflowStatus } from './dashboard.api';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ queryKey: ['dashboardStats'], queryFn: getDashboardStats }),
    queryClient.prefetchQuery({ queryKey: ['workflowStatus'], queryFn: getWorkflowStatus }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
