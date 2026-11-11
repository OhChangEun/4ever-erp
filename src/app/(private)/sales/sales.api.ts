import { SALES_ENDPOINTS, type ApiResponse, type ApiResponseNoData } from '@/app/types/api';
import {
  type CustomerSalesStatResponse,
  type SalesStatResponse,
} from '@/app/(private)/sales/types/SalesStatsType';
import { type Quote, type QuoteQueryParams } from '@/app/(private)/sales/types/SalesQuoteListType';
import {
  type Inventories,
  type QuoteDetail,
} from '@/app/(private)/sales/types/QuoteDetailModalType';
import { type CustomerDetail } from '@/app/(private)/sales/types/SalesCustomerDetailType';
import {
  type SalesCustomer,
  type CustomerQueryParams,
} from '@/app/(private)/sales/types/SalesCustomerListType';
import {
  type CustomerData,
  type CreateCustomerEnvelope,
  type CreateCustomerResponse,
} from '@/app/(private)/sales/types/NewCustomerModalType';
import {
  type AnalyticsQueryParams,
  type SalesAnalysis,
} from '@/app/(private)/sales/types/SalesChartType';
import { type Order, type OrderQueryParams } from '@/app/(private)/sales/types/SalesOrderListType';
import { type OrderDetail } from '@/app/(private)/sales/types/SalesOrderDetailType';
import { type InventoryCheckRes } from './types/QuoteReviewModalType';
import { type CustomerEditData, type CustomerResponse } from './types/CustomerEditModalType';
import { type Page } from '@/app/types/Page';
import { type ItemResponse, type NewOrderRequest } from './types/NewOrderModalType';
import axios from '@/lib/axiosInstance';
import { AppError } from '@/lib/AppError';
import { getParsed } from '@/lib/api/parse';
import {
  customerDetailSchema,
  customerListSchema,
  customerSalesStatsSchema,
  newQuoteItemsSchema,
  orderDetailSchema,
  orderListSchema,
  quoteDetailSchema,
  quoteListSchema,
  salesAnalysisSchema,
  salesStatsSchema,
} from './sales.schemas';

// ----------------------- 통계 지표 -----------------------
export const getSalesStats = async (): Promise<SalesStatResponse> => {
  return getParsed(salesStatsSchema, SALES_ENDPOINTS.STATS);
};

export const getCustomerSalesStats = async (): Promise<CustomerSalesStatResponse> => {
  return getParsed(customerSalesStatsSchema, SALES_ENDPOINTS.CSUTOMER_STATISTICS);
};

// ----------------------- 견적 관리 -----------------------
export const getQuoteList = async (
  params?: QuoteQueryParams,
): Promise<{ data: Quote[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.startDate && { startDate: params.startDate }),
    ...(params?.endDate && { endDate: params.endDate }),
    ...(params?.status && { status: params.status }),
    ...(params?.type && { type: params.type }),
    ...(params?.keyword && { keyword: params.keyword }),
    ...(params?.sort && { sort: params.sort }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();

  const { content, page } = await getParsed(
    quoteListSchema,
    `${SALES_ENDPOINTS.QUOTES_LIST}?${query}`,
  );
  return { data: content, pageData: page };
};

export const getQuoteDetail = async (quotationId: string): Promise<QuoteDetail> => {
  return getParsed(quoteDetailSchema, SALES_ENDPOINTS.QUOTE_DETAIL(quotationId));
};

export const postNewQuote = async (items: NewOrderRequest): Promise<NewOrderRequest> => {
  const res = await axios.post<ApiResponse<{ items: NewOrderRequest }>>(
    SALES_ENDPOINTS.NEW_ORDER,
    items,
  );
  return res.data.data.items;
};

// ----------------------- 주문 관리 -----------------------
export const getOrderList = async (
  params?: OrderQueryParams,
): Promise<{ data: Order[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.startDate && { startDate: params.startDate }),
    ...(params?.endDate && { endDate: params.endDate }),
    ...(params?.status && { status: params.status }),
    ...(params?.type && { type: params.type }),
    ...(params?.keyword && { keyword: params.keyword }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();

  const { content, page } = await getParsed(
    orderListSchema,
    `${SALES_ENDPOINTS.ORDERS_LIST}?${query}`,
  );
  return { data: content, pageData: page };
};

export const getOrderDetail = async (salesOrderId: string): Promise<OrderDetail> => {
  return getParsed(orderDetailSchema, SALES_ENDPOINTS.ORDER_DETAIL(salesOrderId));
};

export const postQuotationConfirm = async (quotationId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(SALES_ENDPOINTS.QUOTE_CONFIRM, {
    quotationId: quotationId,
  });
  return res.data;
};

export const postInventoryCheck = async (items: Inventories[]): Promise<InventoryCheckRes[]> => {
  const res = await axios.post<ApiResponse<{ items: InventoryCheckRes[] }>>(
    SALES_ENDPOINTS.INVENTORY_CHECK,
    {
      items,
    },
  );
  return res.data.data.items;
};

export const postDeliveryProcess = async (quotationId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(
    SALES_ENDPOINTS.QUOTE_DELIVERY_PROCESS(quotationId),
  );
  return res.data;
};

// ----------------------- 고객 관리 -----------------------
export const getCustomerList = async (
  params?: CustomerQueryParams,
): Promise<{ data: SalesCustomer[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.status && { status: params.status }),
    ...(params?.keyword && { keyword: params.keyword }),
    ...(params?.type && { type: params.type }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();

  const { customers, page } = await getParsed(
    customerListSchema,
    `${SALES_ENDPOINTS.CUSTOMERS_LIST}?${query}`,
  );
  return { data: customers, pageData: page };
};

export const getCustomerDetail = async (customerId: string): Promise<CustomerDetail> => {
  return getParsed(customerDetailSchema, SALES_ENDPOINTS.CUSTOMER_DETAIL(customerId));
};

/**
 * 고객 등록의 안쪽 실패. 바깥 봉투는 성공인데 담당자 계정 생성 결과(CreateAuthUserResultDto)의 success 가 false.
 * 고객사 행은 이미 저장됐을 수 있어 useCreateCustomer 가 이 오류일 때만 고객 목록을 다시 받는다(verified=false).
 */
export class CustomerAccountError extends AppError {}

/**
 * 고객 등록. 게이트웨이는 바깥 success 만 보고(SdServiceImpl.java:54) 담당자 계정 생성 결과를 data 로 넘긴다.
 * 화면은 그중 안쪽 success 하나만 읽는다. false 면 CustomerAccountError 로 던져 성공 토스트가 돌지 않게 한다.
 * failureReason 은 개발자용 message 에만 둔다(화면은 오류 종류 문구만 보인다).
 */
export const postCustomer = async (
  customer: CustomerData,
): Promise<CreateCustomerResponse | undefined> => {
  const res = await axios.post<CreateCustomerEnvelope>(SALES_ENDPOINTS.CUSTOMERS_LIST, customer);
  // 바깥이 성공인데 data 가 빠지면(게이트웨이 NON_NULL) 성공으로 둔다
  const created = res.data.data;
  if (created?.success === false) {
    const header: unknown = res.headers['x-request-id'];
    throw new CustomerAccountError(
      'server',
      created.failureReason ?? '고객사 등록 결과 success 가 false',
      { status: res.status, requestId: typeof header === 'string' ? header : undefined },
    );
  }
  return created;
};

export const patchCustomer = async (
  customerId: string,
  customer: CustomerEditData,
): Promise<CustomerResponse> => {
  const res = await axios.patch<ApiResponse<CustomerResponse>>(
    SALES_ENDPOINTS.EDIT_CUSTOMER(customerId),
    customer,
  );
  return res.data.data;
};

// ----------------------- 매출 분석 -----------------------
export const getAnalytics = async (params?: AnalyticsQueryParams): Promise<SalesAnalysis> => {
  const query = new URLSearchParams({
    ...(params?.startDate && { startDate: params.startDate }),
    ...(params?.endDate && { endDate: params.endDate }),
  }).toString();

  return getParsed(salesAnalysisSchema, `${SALES_ENDPOINTS.ANALYTICS}?${query}`);
};

// 신규 견적 요청을 위한 자재 가져오기
export const getItemInfoForNewQuote = async (): Promise<ItemResponse[]> => {
  const { products } = await getParsed(newQuoteItemsSchema, SALES_ENDPOINTS.NEW_QUOTE_ITEM_TOGGLE);
  return products;
};
