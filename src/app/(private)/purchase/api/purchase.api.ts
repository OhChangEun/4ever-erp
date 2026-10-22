import { ApiResponse } from '@/app/types/api';
import {
  PurchaseStatResponse,
  SupplierPurchaseStatResponse,
} from '@/app/(private)/purchase/types/PurchaseStatsType';
import {
  PurchaseOrderDetail,
  PurchaseOrderListResponse,
  PurchaseOrderListParams,
} from '@/app/(private)/purchase/types/PurchaseOrderType';
import {
  PurchaseRequestDetail,
  PurchaseRequestListResponse,
  PurchaseRequestListParams,
  CreatePurchaseRequestBody,
  CreateStockPurchaseRequestBody,
} from '@/app/(private)/purchase/types/PurchaseRequestType';
import {
  CreateSupplierBody,
  UpdateSupplierBody,
  SupplierDetail,
  SupplierListResponse,
  SupplierListParams,
} from '@/app/(private)/purchase/types/SupplierType';
import { PURCHASE_ENDPOINTS } from '@/app/(private)/purchase/api/purchase.endpoints';
import { KeyValueItem } from '@/app/types/CommonType';
import axios from '@/lib/axiosInstance';

// 구매 관리 지표
export const fetchPurchaseStats = async (): Promise<PurchaseStatResponse | null> => {
  try {
    const res = await axios.get<ApiResponse<PurchaseStatResponse>>(
      `${PURCHASE_ENDPOINTS.STATISTICS}`,
    );
    return res.data.data;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const fetchSupplierOrdersPurchaseStats =
  async (): Promise<SupplierPurchaseStatResponse | null> => {
    try {
      const res = await axios.get<ApiResponse<SupplierPurchaseStatResponse>>(
        `${PURCHASE_ENDPOINTS.SUPPLIER_ORDERS_STATISTICS}`,
      );
      return res.data.data;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

// 구매 요청 목록
export const fetchPurchaseRequestList = async (
  params: PurchaseRequestListParams,
): Promise<PurchaseRequestListResponse> => {
  const res = await axios.get<ApiResponse<PurchaseRequestListResponse>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_REQUESTS}`,
    { params },
  );
  return res.data.data;
};

// 구매 요청 승인
export const approvePurchaseRequest = async (purchaseRequestId: string) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_REQUEST_APPROVE(purchaseRequestId)}`,
  );
  return res.data;
};

// 구매 요청 반려
export const rejectPurchaseRequest = async (purchaseRequestId: string, body: string) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_REQUEST_REJECT(purchaseRequestId)}`,
    { comment: body },
  );
  return res.data;
};

// 구매 요청 상세정보
export const fetchPurchaseRequestDetail = async (
  purchaseRequestId: string,
): Promise<PurchaseRequestDetail> => {
  const res = await axios.get<ApiResponse<PurchaseRequestDetail>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_REQUEST_DETAIL(purchaseRequestId)}`,
  );
  return res.data.data;
};

// 비재고성 구매 요청 등록
export const createPurchaseRequest = async (
  data: CreatePurchaseRequestBody,
): Promise<ApiResponse<null>> => {
  const res = await axios.post<ApiResponse<null>>(`${PURCHASE_ENDPOINTS.PURCHASE_REQUESTS}`, data);
  return res.data;
};

// 재고성 구매 요청 등록
export const createStockPurchaseRequest = async (data: CreateStockPurchaseRequestBody) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.STOCK_PURCHASE_REQUESTS}`,
    data,
  );
  return res.data;
};

// 발주서 목록
export const fetchPurchaseOrderList = async (
  params: PurchaseOrderListParams,
): Promise<PurchaseOrderListResponse> => {
  const res = await axios.get<ApiResponse<PurchaseOrderListResponse>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_ORDERS}`,
    { params },
  );
  return res.data.data;
};

// 발주서 승인
export const approvePurchaseOrder = async (purchaseOrderId: string) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_ORDER_APPROVE(purchaseOrderId)}`,
  );
  return res.data;
};

// 발주서 반려
export const rejectPurchaseOrder = async (purchaseOrderId: string, body: string) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_ORDER_REJECT(purchaseOrderId)},`,
    { body },
  );
  return res.data;
};

// 승인된 발주서 배송
export const startPurchaseOrderDelivery = async (purchaseOrderId: string) => {
  const res = await axios.post<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_ORDER_DELIVERY(purchaseOrderId)}`,
  );
  return res.data;
};

// 발주서 상세정보
export const fetchPurchaseOrderDetail = async (
  purchaseOrderId: string,
): Promise<PurchaseOrderDetail> => {
  const res = await axios.get<ApiResponse<PurchaseOrderDetail>>(
    `${PURCHASE_ENDPOINTS.PURCHASE_ORDER_DETAIL(purchaseOrderId)}`,
  );

  return res.data.data;
};

// 공급업체 목록
export const fetchSupplierList = async (
  params: SupplierListParams,
): Promise<SupplierListResponse> => {
  const res = await axios.get<ApiResponse<SupplierListResponse>>(`${PURCHASE_ENDPOINTS.SUPPLIER}`, {
    params,
  });
  return res.data.data;
};

// 공급업체 상세정보
export const fetchSupplierDetail = async (supplierId: string): Promise<SupplierDetail> => {
  const res = await axios.get<ApiResponse<SupplierDetail>>(
    `${PURCHASE_ENDPOINTS.SUPPLIER_DETAIL(supplierId)}`,
  );
  return res.data.data;
};

// 공급업체 등록
export const createSupplier = async (data: CreateSupplierBody): Promise<ApiResponse<null>> => {
  const res = await axios.post<ApiResponse<null>>(`${PURCHASE_ENDPOINTS.SUPPLIER}`, data);
  return res.data;
};

// 공급업체 수정
export const updateSupplier = async (
  supplierId: string,
  body: UpdateSupplierBody,
): Promise<ApiResponse<null>> => {
  const res = await axios.patch<ApiResponse<null>>(
    `${PURCHASE_ENDPOINTS.SUPPLIER_DETAIL(supplierId)}`,
    body,
  );
  return res.data;
};

// --- 드롭다운 ---
// 구매요청서 상태
export const fetchPurchaseRequestStatusOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.PURCHASE_REQUEST_STATUS_OPTIONS,
  );
  return res.data.data;
};

// 구매요청서 검색 타입
export const fetchPurchaseRequestSearchTypeOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.PURCHASE_REQUEST_SEARCH_TYPE_OPTIONS,
  );
  return res.data.data;
};

// 발주서 상태
export const fetchPurchaseOrderStatusOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.PURCHASE_ORDER_STATUS_OPTIONS,
  );
  return res.data.data;
};

// 발주서 검색 타입
export const fetchPurchaseOrderSearchTypeOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.PURCHASE_ORDER_SEARCH_TYPE_OPTIONS,
  );
  return res.data.data;
};

// 공급업체 카테고리
export const fetchSupplierCategoryOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.SUPPLIER_CATEGORY_OPTIONS,
  );
  return res.data.data;
};

// 공급업체 검색 타입
export const fetchSupplierSearchTypeOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.SUPPLIER_SEARCH_TYPE_OPTIONS,
  );
  return res.data.data;
};

// 공급업체 상태
export const fetchSupplierStatusOptions = async (): Promise<KeyValueItem[]> => {
  const res = await axios.get<ApiResponse<KeyValueItem[]>>(
    PURCHASE_ENDPOINTS.SUPPLIER_STATUS_OPTIONS,
  );
  return res.data.data;
};
