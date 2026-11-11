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
      {/* 서버 전용 env. 실백엔드면 BOM 상태 버튼을 숨긴다(BomStatusActionsContext).
          shortcut: 이 페이지는 정적(○)이라 값이 build 때 굳는다, build 와 실행 env 가 다르게 되면 동적으로 바꾼다 */}
      <ProductionClient realBackend={Boolean(process.env.BACKEND_API_URL)} />
    </HydrationBoundary>
  );
}
