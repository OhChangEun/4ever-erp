import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { fetchHrmStats } from './api/hrm.api';
import HrmClient from './HrmClient';

export default async function HrmPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['hrmStats'],
    queryFn: fetchHrmStats,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HrmClient />
    </HydrationBoundary>
  );
}
