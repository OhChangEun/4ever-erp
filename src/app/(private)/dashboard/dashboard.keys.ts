export const dashboardKeys = {
  all: ['dashboard'] as const,

  stats: () => [...dashboardKeys.all, 'stats'] as const,

  workflowStatus: () => [...dashboardKeys.all, 'workflowStatus'] as const,

  // 시각화 6. 다른 도메인 mutation 이 지우지 않는 대신 staleTime 0 으로 올 때마다 받는다
  supplyFlow: () => [...dashboardKeys.all, 'supplyFlow'] as const,
};
