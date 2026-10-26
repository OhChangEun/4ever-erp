export const dashboardKeys = {
  all: ['dashboard'] as const,

  stats: () => [...dashboardKeys.all, 'stats'] as const,

  workflowStatus: () => [...dashboardKeys.all, 'workflowStatus'] as const,
};
