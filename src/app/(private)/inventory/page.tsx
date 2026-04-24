import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import { getInventoryStats } from './inventory.api';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['inventoryStats'],
    queryFn: getInventoryStats,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <InventoryClient />
    </HydrationBoundary>
  );
}
