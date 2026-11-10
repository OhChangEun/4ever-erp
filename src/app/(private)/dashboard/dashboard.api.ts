import type { SupplyFlow } from './types/SupplyFlowType';
import { type DashboardStatRes } from './types/DashboardStatsType';
import { type ApiResponse, DASHBOARD_ENDPOINTS } from '@/app/types/api';
import { type DashboardWorkflowRes } from './types/DashboardWorkflowType';
import axios from '@/lib/axiosInstance';
import { getParsed } from '@/lib/api/parse';
import { workflowStatusSchema } from './dashboard.schemas';

// ----------------------- 통계 지표 -----------------------
export const getDashboardStats = async (): Promise<DashboardStatRes> => {
  const res = await axios.get<ApiResponse<DashboardStatRes>>(DASHBOARD_ENDPOINTS.STATS);
  return res.data.data;
};

// ----------------------- 워크플로우 현황 -----------------------
export const getWorkflowStatus = (): Promise<DashboardWorkflowRes> =>
  getParsed(workflowStatusSchema, DASHBOARD_ENDPOINTS.WORKFLOW_STATUS);

// ----------------------- 자재 흐름(시각화 6) -----------------------
export const getSupplyFlow = async (): Promise<SupplyFlow> => {
  const res = await axios.get<ApiResponse<SupplyFlow>>(DASHBOARD_ENDPOINTS.SUPPLY_FLOW);
  return res.data.data;
};
