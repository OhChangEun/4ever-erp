import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { fetchProductionStats } from './api/production.api';
import ProductionClient from './ProductionClient';

export default async function ProductionPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['productionStats'],
    queryFn: fetchProductionStats,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductionClient />
    </HydrationBoundary>
  );
}
