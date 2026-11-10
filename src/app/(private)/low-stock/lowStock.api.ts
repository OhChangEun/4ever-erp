import axios from '@/lib/axiosInstance';
import { type LowStockStatResponse } from './types/LowStockStatsType';
import { type LowStockListQueryParams, type LowStockListResponse } from './types/LowStockListType';
import { type ApiResponse, LOWSTOCK_ENDPOINTS } from '@/app/types/api';
import { type Page } from '@/app/types/Page';

// ----------------------- 재고 부족 관리 -----------------------
export const getLowStockStats = async (): Promise<LowStockStatResponse> => {
  const res = await axios.get<ApiResponse<LowStockStatResponse>>(LOWSTOCK_ENDPOINTS.STATS);
  return res.data.data;
};

export const getLowStockList = async (
  params?: LowStockListQueryParams,
): Promise<{
  data: LowStockListResponse[];
  pageData: Page;
}> => {
  const query = new URLSearchParams({
    ...(params?.statusCode && { statusCode: String(params.statusCode) }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ content: LowStockListResponse[]; page: Page }>>(
    `${LOWSTOCK_ENDPOINTS.LOW_STOCK_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};
