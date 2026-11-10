import type { Schema } from '@/lib/api/contract';

type StockHistory = Schema<'StockHistory'>;
import { InventoryStatResponse } from './types/InventoryStatsType';
import axios from '@/lib/axiosInstance';
import { InventoryQueryParams, InventoryResponse } from './types/InventoryListType';
import { InventoryDetailResponse, StockMovementRequest } from './types/InventoryDetailModalType';
import type { LowStockItemResponse } from '@/app/(private)/low-stock';
import { StockMovementResponse } from './types/StockMovement';
import {
  ManageMentCommonQueryParams,
  ProductionListResponse,
  ReadyToShipListResponse,
} from './types/ShippingManagementListType';
import { ReceivedListResponse } from './types/ReceivingManagementListType';
import {
  markAsReadyRequest,
  markAsReadyToShipResponse,
  ShippingDetailResponse,
} from './types/ShippingDetailModalType';
import {
  AddInventoryItemsRequest,
  AddInventoryItemsToggleResponse,
  WarehouseToggleQueryParams,
  WarehouseToggleResponse,
} from './types/AddInventoryModalType';
import { ApiResponse, ApiResponseNoData, INVENTORY_ENDPOINTS } from '@/app/types/api';
import { Page } from '@/app/types/Page';
// ----------------------- 재고 통계 -----------------------
export const getInventoryStats = async (): Promise<InventoryStatResponse> => {
  const res = await axios.get<ApiResponse<InventoryStatResponse>>(INVENTORY_ENDPOINTS.STATS);
  return res.data.data;
};
// ----------------------- 재고 관리 -----------------------
export const getInventoryList = async (
  params?: InventoryQueryParams,
): Promise<{ data: InventoryResponse[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
    ...(params?.type && { type: String(params.type) }),
    ...(params?.keyword && { keyword: String(params.keyword) }),
    ...(params?.statusCode && { statusCode: params.statusCode }),
  }).toString();

  const res = await axios.get<ApiResponse<{ content: InventoryResponse[]; page: Page }>>(
    `${INVENTORY_ENDPOINTS.INVENTORY_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};

/** 품목 재고 추이(최근 30일, 시각화 2) */
export const getStockHistory = async (itemId: string): Promise<StockHistory> => {
  const res = await axios.get<ApiResponse<StockHistory>>(INVENTORY_ENDPOINTS.STOCK_HISTORY(itemId));
  return res.data.data;
};

export const getInventoryDetail = async (inventoryId: string): Promise<InventoryDetailResponse> => {
  const res = await axios.get<ApiResponse<InventoryDetailResponse>>(
    INVENTORY_ENDPOINTS.INVENTORY_DETAIL(inventoryId),
  );
  return res.data.data;
};

export const getLowStockItems = async (): Promise<LowStockItemResponse[]> => {
  const res = await axios.get<ApiResponse<{ content: LowStockItemResponse[] }>>(
    INVENTORY_ENDPOINTS.LOW_STOCK,
  );
  return res.data.data.content;
};

export const getCurrentStockMovement = async (): Promise<StockMovementResponse[]> => {
  const res = await axios.get<ApiResponse<{ content: StockMovementResponse[] }>>(
    INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT,
  );

  return res.data.data.content;
};

export const postStockMovement = async (
  payload: StockMovementRequest,
): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(
    INVENTORY_ENDPOINTS.RECENT_STOCK_MOVEMENT,
    payload,
  );

  return res.data;
};

export const PatchSafetyStock = async ({
  itemId,
  safetyStock,
}: {
  itemId: string;
  safetyStock: number;
}): Promise<ApiResponseNoData> => {
  const res = await axios.patch<ApiResponseNoData>(
    INVENTORY_ENDPOINTS.EDIT_SAFETY_STOCK(itemId, safetyStock),
  );

  return res.data;
};

// ----------------------- 입고 관리 -----------------------
export const getProductionList = async (
  params?: ManageMentCommonQueryParams,
): Promise<{
  data: ProductionListResponse[];
  pageData: Page;
}> => {
  const query = new URLSearchParams({
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ content: ProductionListResponse[]; page: Page }>>(
    `${INVENTORY_ENDPOINTS.PRODUCTION_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};

export const getReadyToShipList = async (
  params?: ManageMentCommonQueryParams,
): Promise<{
  data: ReadyToShipListResponse[];
  pageData: Page;
}> => {
  const query = new URLSearchParams({
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ content: ReadyToShipListResponse[]; page: Page }>>(
    `${INVENTORY_ENDPOINTS.READY_TO_SHIP_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};

export const getProductionDetail = async (itemId: string): Promise<ShippingDetailResponse> => {
  const res = await axios.get<ApiResponse<ShippingDetailResponse>>(
    INVENTORY_ENDPOINTS.PRODUCTIONDETAIL(itemId),
  );
  return res.data.data;
};

export const getReadyToShipDetail = async (itemId: string): Promise<ShippingDetailResponse> => {
  const res = await axios.get<ApiResponse<ShippingDetailResponse>>(
    INVENTORY_ENDPOINTS.READY_TO_SHIP_DETAIL(itemId),
  );
  return res.data.data;
};

export const patchMarkAsReadyToShip = async (
  orderId: string,
  payload: markAsReadyRequest,
): Promise<markAsReadyToShipResponse> => {
  const res = await axios.patch<ApiResponse<markAsReadyToShipResponse>>(
    INVENTORY_ENDPOINTS.MARKAS_READY_TO_SHIP_DETAIL(orderId),
    payload,
  );
  return res.data.data;
};

// ----------------------- 출고 관리 -----------------------
export const getPendingList = async (
  params?: ManageMentCommonQueryParams,
): Promise<{
  data: ReceivedListResponse[];
  pageData: Page;
}> => {
  const query = new URLSearchParams({
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ content: ReceivedListResponse[]; page: Page }>>(
    `${INVENTORY_ENDPOINTS.PENDING_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};

export const getReceivedList = async (
  params?: ManageMentCommonQueryParams,
): Promise<{
  data: ReceivedListResponse[];
  pageData: Page;
}> => {
  const query = new URLSearchParams({
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
    ...(params?.startDate && { startDate: String(params.startDate) }),
    ...(params?.endDate && { endDate: String(params.endDate) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ content: ReceivedListResponse[]; page: Page }>>(
    `${INVENTORY_ENDPOINTS.RECEIVED_LIST}?${query}`,
  );

  return { data: res.data.data.content, pageData: res.data.data.page };
};

// ----------------------- 원자재 추가 -----------------------
export const getItemInfo = async (): Promise<AddInventoryItemsToggleResponse[]> => {
  const res = await axios.get<ApiResponse<AddInventoryItemsToggleResponse[]>>(
    INVENTORY_ENDPOINTS.ITEM_TOGGLE,
  );
  return res.data.data;
};

export const getWarehouseInfo = async (
  params?: WarehouseToggleQueryParams,
): Promise<WarehouseToggleResponse[]> => {
  const query = new URLSearchParams({
    ...(params?.warehouseId && { warehouseId: String(params.warehouseId) }),
  }).toString();
  const res = await axios.get<ApiResponse<{ warehouses: WarehouseToggleResponse[] }>>(
    `${INVENTORY_ENDPOINTS.WAREHOUSE_TOGGLE}?${query}`,
  );
  return res.data.data.warehouses;
};

export const postAddMaterial = async (
  payload: AddInventoryItemsRequest,
): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(INVENTORY_ENDPOINTS.ADD_MATERIALS, payload);

  return res.data;
};

// 자재 상세 조회
// export const postItemsInfo = async (body: string[]): Promise<ItemResponse[]> => {
//   const res = await axios.post<ApiResponse<ItemResponse[]>>(
//     `${INVENTORY_ENDPOINTS.MATERIALS_LIST}`,
//     {
//       itemIds: body,
//     },
//   );
//   return res.data.data;
// };
