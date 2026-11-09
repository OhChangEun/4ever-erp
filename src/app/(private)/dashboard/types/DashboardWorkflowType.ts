import type { Schema } from '@/lib/api/contract';
export type DashboardWorkflowRes = Schema<'DashboardWorkflowRes'>;

export interface DashboardProps {
  workflowData?: DashboardWorkflowRes;
}
