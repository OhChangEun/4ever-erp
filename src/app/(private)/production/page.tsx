import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { fetchProductionStats } from './api/production.api';
import ProductionClient from './ProductionClient';
import { productionStatsKeys } from './api/production.keys';

export default async function ProductionPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: productionStatsKeys.all,
    queryFn: fetchProductionStats,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductionClient />
    </HydrationBoundary>
  );
}
