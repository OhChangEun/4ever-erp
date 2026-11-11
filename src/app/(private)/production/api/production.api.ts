import type { Schema } from '@/lib/api/contract';
import type { OptionResponse } from '@/app/types/api';
import { type ProductionStatResponse } from '@/app/(private)/production/types/ProductionStatsType';
import { type ApiResponse, INVENTORY_ENDPOINTS } from '@/app/types/api';
import { PRODUCTION_ENDPOINTS } from '@/app/(private)/production/api/production.endpoints';
import {
  type FetchQuotationSimulationParams,
  type QuotationSimulationResponse,
} from '@/app/(private)/production/types/QuotationSimulationApiType';
import {
  type MpsListParams,
  type MpsListResponse,
} from '@/app/(private)/production/types/MpsApiType';
import { type FetchMesListParams, type MesListResponse } from '../types/MesListApiType';
import { type MesDetailResponse } from '../types/MesDetailApiType';
import { type BomListResponse } from '../types/BomListApiType';
import { type BomDetailResponse } from '../types/BomDetailApiType';
import { type FetchQuotationParams, type QuotationListResponse } from '../types/QuotationApiType';
import {
  type FetchMrpPlannedOrdersListParams,
  type MrpPlannedOrdersListResponse,
} from '../types/MrpPlannedOrdersListApiType';
import { type BomRequestBody, type MaterialResponse } from '../types/BomType';
import { type PageRequest } from '@/app/types/Page';
import { type MrpOrdersConvertReqeustBody } from '../types/MrpOrdersConvertApiType';
import type { ItemResponse } from '@/app/(private)/inventory';
import {
  type FetchMrpOrdersListParams,
  type MrpOrdersListResponse,
} from '../types/MrpOrdersApiType';
import axios from '@/lib/axiosInstance';
import { getParsed, parseData } from '@/lib/api/parse';
import { optionListSchema } from '@/lib/api/schemas';
import {
  bomDetailSchema,
  bomListSchema,
  materialSchema,
  mesDetailSchema,
  mesListSchema,
  mpsListSchema,
  mrpOrdersListSchema,
  productionStatsSchema,
  quotationListSchema,
  quotationSimulationSchema,
  mrpPlannedOrdersListSchema,
} from '@/app/(private)/production/production.schemas';

// --- 상단 섹션 ---
// 구매 관리 지표
export const fetchProductionStats = async (): Promise<ProductionStatResponse> => {
  return getParsed(productionStatsSchema, `${PRODUCTION_ENDPOINTS.STATISTICS}`);
};

// --- 견적 ---
// 견적 목록 조회
export const fetchQuotationList = async (
  params: FetchQuotationParams,
): Promise<QuotationListResponse> => {
  return getParsed(quotationListSchema, `${PRODUCTION_ENDPOINTS.QUOTATIONS}`, { params });
};

// 견적에 대한 ATP(Available to Promise), MPS, MRP 시뮬레이션 실행 결과
/** 선택된 견적마다 시뮬레이션을 따로 호출하고 결과를 합친다 */
export const simulateQuotations = async (
  quotationIds: string[],
): Promise<QuotationSimulationResponse['content']> => {
  const results = await Promise.all(
    quotationIds.map((quotationId) =>
      fetchQuotationSimulationResult({ quotationIds: [quotationId], page: 0, size: 1 }),
    ),
  );
  return results.flatMap((r) => r.content);
};

export const fetchQuotationSimulationResult = async (
  params: FetchQuotationSimulationParams,
): Promise<QuotationSimulationResponse> => {
  const { quotationIds, page, size } = params;
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  });
  const url = `${PRODUCTION_ENDPOINTS.QUOTATION_SIMULATE}?${query.toString()}`;
  const res = await axios.post<ApiResponse<unknown>>(url, { quotationIds });
  // POST 지만 화면이 읽는 응답이라 확인한다
  return parseData(quotationSimulationSchema, res.data.data, url);
};

// 제품별 Master Production Schedule(MPS) 정보를 조회
export const fetchMpsList = async (params: MpsListParams): Promise<MpsListResponse> => {
  return getParsed(mpsListSchema, `${PRODUCTION_ENDPOINTS.MPS_PLANS}`, {
    params,
  });
};

// 제안 납기 확정
export const fetchQuotationConfirm = async (params: string[]) => {
  const res = await axios.post<ApiResponse<null>>(`${PRODUCTION_ENDPOINTS.QUOTATION_CONFIRM}`, {
    quotationIds: params,
  });
  return res.data.data;
};

// --- BOM ---
// BOM 목록 조회
export const fetchBomList = async (params: PageRequest): Promise<BomListResponse> => {
  return getParsed(bomListSchema, `${PRODUCTION_ENDPOINTS.BOMS}`, {
    params,
  });
};

// BOM 자재 조회
export const fetchProduction = async (productId: string): Promise<MaterialResponse> => {
  return getParsed(materialSchema, `${PRODUCTION_ENDPOINTS.PRODUCTS_DETAIL(productId)}`);
};

// BOM 공정 조회
export const fetchOperationDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.OPERATIONS_DROPDOWN}`);
};

// BOM 상세 조회
export const fetchBomDetail = async (bomId: string): Promise<BomDetailResponse> => {
  return getParsed(bomDetailSchema, `${PRODUCTION_ENDPOINTS.BOM_DETAIL(bomId)}`);
};

// BOM 추가
export const postBomItem = async (body: BomRequestBody) => {
  const res = await axios.post<ApiResponse<null>>(`${PRODUCTION_ENDPOINTS.BOMS}`, body);
  return res.data;
};

// BOM 상태 수정 (낙관적 락)
// version 필드를 함께 전송해서 서버에서 충돌 여부를 검증
export type PatchBomStatusRequest = Schema<'PatchBomStatusRequest'>;
export const patchBomStatus = async (
  bomId: string,
  body: PatchBomStatusRequest,
): Promise<{ status: number; message: string }> => {
  const res = await axios.patch<{ status: number; message: string }>(
    `${PRODUCTION_ENDPOINTS.BOM_DETAIL(bomId)}`,
    body,
  );
  return res.data;
};

// [개발 테스트 전용] 다른 사용자가 BOM을 먼저 수정한 상황 시뮬레이션
// 이 함수를 호출하면 MSW 서버 측 버전이 올라가서, 다음 patch 시 409 발생
export const simulateBomConflict = async (bomId: string): Promise<{ message: string }> => {
  const res = await axios.post<{ message: string }>(
    `${PRODUCTION_ENDPOINTS.BOM_DETAIL(bomId)}/simulate-conflict`,
  );
  return res.data;
};

// --- MRP ---
// MRP 순소요 목록 조회
export const fetchMrpOrdersList = async (
  params: FetchMrpOrdersListParams,
): Promise<MrpOrdersListResponse> => {
  return getParsed(mrpOrdersListSchema, `${PRODUCTION_ENDPOINTS.MRP_ORDERS}`, { params });
};

// MRP 계획 주문 전환
export const postMrpConvert = async (body: MrpOrdersConvertReqeustBody) => {
  const res = await axios.post(`${PRODUCTION_ENDPOINTS.MRP_CONVERT}`, body);
  return res.data.data;
};

// MRP 계획 주문 목록 조회
export const fetchMrpPlannedOrdersList = async (
  params: FetchMrpPlannedOrdersListParams,
): Promise<MrpPlannedOrdersListResponse> => {
  return getParsed(mrpPlannedOrdersListSchema, `${PRODUCTION_ENDPOINTS.MRP_PLANNED_ORDERS_LIST}`, {
    params,
  });
};

// 자재 상세 조회
export const postItemsInfo = async (body: string[]): Promise<ItemResponse[]> => {
  const res = await axios.post<ApiResponse<ItemResponse[]>>(
    `${INVENTORY_ENDPOINTS.MATERIALS_LIST}`,
    {
      itemIds: body,
    },
  );
  return res.data.data;
};

// --- MES ---
// MES(Manufacturing Execution System) 작업 목록 조회
export const fetchMesList = async (params: FetchMesListParams): Promise<MesListResponse> => {
  return getParsed(mesListSchema, `${PRODUCTION_ENDPOINTS.MES_LIST}`, {
    params,
  });
};

// MES 작업 상세 정보 조회
export const fetchMesDetail = async (mesId: string): Promise<MesDetailResponse> => {
  return getParsed(mesDetailSchema, `${PRODUCTION_ENDPOINTS.MES_WORK_ORDER_DETAIL(mesId)}`);
};

// MES 시작
export const startMes = async (mesId: string) => {
  const res = await axios.put<ApiResponse<void>>(PRODUCTION_ENDPOINTS.MES_START(mesId));
  return res.data;
};

// MES 완료
export const completeMes = async (mesId: string) => {
  const res = await axios.put<ApiResponse<void>>(PRODUCTION_ENDPOINTS.MES_COMPLETE(mesId));
  return res.data;
};

// 공정 시작
export const startMesOperation = async (mesId: string, operationId: string) => {
  const res = await axios.put<ApiResponse<void>>(
    PRODUCTION_ENDPOINTS.MES_OPERATION_START(mesId, operationId),
  );
  return res.data;
};

// 공정 완료
export const completeMesOperation = async (mesId: string, operationId: string) => {
  const res = await axios.put<ApiResponse<void>>(
    PRODUCTION_ENDPOINTS.MES_OPERATION_COMPLETE(mesId, operationId),
  );
  return res.data;
};

// --- 드롭다운 조회 ---
// mps 제품 드롭다운
export const fetchMpsBomDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MPS_TOGGLE_PRODUCTS}`);
};

export const fetchProductDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.PRODUCTS}`);
};

export const fetchAvailableStatusDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.AVAILABLE_STATUS_DROPDOWN}`);
};

// mrp 순소요 - 견적 드롭다운
export const fetchMrpQuotationsDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MRP_QUOTATION_DROPDOWN}`);
};

// mrp 순소요 - 가용 재고 상태 드롭다운
export const fetchMrpAvailableStatusDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MRP_AVAILABLE_STATUS_DROPDOWN}`);
};

// mrp 계획 주문 -견적 드롭다운
export const fetchMrpPlannedOrderQuotationsDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MRP_RUNS_QUOTATIONS_DROPDOWN}`);
};

// mrp 계획 주문 - 상태 드롭다운
export const fetchMrpPlannedOrderStatusDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MRP_RUNS_STATUS_DROPDOWN}`);
};

// mes 상태 드롭다운
export const fetchMesStatusDropdown = async (): Promise<OptionResponse[]> => {
  return getParsed(optionListSchema, `${PRODUCTION_ENDPOINTS.MES_STATUS_DROPDOWN}`);
};
