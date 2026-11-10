import { FINANCE_ENDPOINTS, type ApiResponse, type ApiResponseNoData } from '@/app/types/api';
import {
  type CustomerSupplierStatResponse,
  type FinanceStatResponse,
} from '@/app/(private)/finance/types/FinanceStatsType';
import { type InvoiceListRes, type InvoiceQueryParams } from './types/InvoiceListType';
import { type InvoicetDetailRes } from './types/InvoiceDetailModalType';
import type { ArAging, FinanceMonthly } from './types/FinanceAnalyticsType';
import { type Page } from '@/app/types/Page';
import axios from '@/lib/axiosInstance';

// ----------------------- 통계 지표 -----------------------
export const getFinanceStats = async (): Promise<ApiResponse<FinanceStatResponse>> => {
  const res = await axios.get<ApiResponse<FinanceStatResponse>>(FINANCE_ENDPOINTS.STATISTICS);
  return res.data;
};

export const getCustomerStats = async (): Promise<ApiResponse<CustomerSupplierStatResponse>> => {
  const res = await axios.get<ApiResponse<CustomerSupplierStatResponse>>(
    FINANCE_ENDPOINTS.CUSTOMER_STATISTICS,
  );
  return res.data;
};

export const getSupplierStats = async (): Promise<ApiResponse<CustomerSupplierStatResponse>> => {
  const res = await axios.get<ApiResponse<CustomerSupplierStatResponse>>(
    FINANCE_ENDPOINTS.SUPPLIER_STATISTICS,
  );
  return res.data;
};

// ----------------------- 매입 전표(AP) -----------------------
export const getPurchaseInvoicesList = async (
  params?: InvoiceQueryParams,
): Promise<{ data: InvoiceListRes[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.status && { status: params.status }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();

  const res = await axios.get<ApiResponse<{ content: InvoiceListRes[]; page: Page }>>(
    `${FINANCE_ENDPOINTS.PURCHASE_INVOICES_LIST}?${query}`,
  );
  return { data: res.data.data.content, pageData: res.data.data.page };
};

export const getPurchaseInvoiceDetail = async (invoiceId: string): Promise<InvoicetDetailRes> => {
  const res = await axios.get<ApiResponse<InvoicetDetailRes>>(
    FINANCE_ENDPOINTS.PURCHASE_INVOICE_DETAIL(invoiceId),
  );
  return res.data.data;
};

export const postApInvoice = async (invoiceId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(
    FINANCE_ENDPOINTS.PURCHASE_INVOICE_REQUEST(invoiceId),
  );
  return res.data;
};

export const postArInvoice = async (invoiceId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(
    FINANCE_ENDPOINTS.SALES_INVOICE_COMPLETE(invoiceId),
  );
  return res.data;
};

export const postSupplierApInvoice = async (invoiceId: string): Promise<ApiResponseNoData> => {
  const res = await axios.post<ApiResponseNoData>(
    FINANCE_ENDPOINTS.SUPPLIER_AP_COMPLETE(invoiceId),
  );
  return res.data;
};

// ----------------------- 매출 전표(AS) -----------------------
export const getSalesInvoicesList = async (
  params?: InvoiceQueryParams,
): Promise<{ data: InvoiceListRes[]; pageData: Page }> => {
  const query = new URLSearchParams({
    ...(params?.status && { status: params.status }),
    ...(params?.page && { page: String(params.page) }),
    ...(params?.size && { size: String(params.size) }),
  }).toString();

  const res = await axios.get<ApiResponse<{ content: InvoiceListRes[]; page: Page }>>(
    `${FINANCE_ENDPOINTS.SALES_INVOICES_LIST}?${query}`,
  );
  return { data: res.data.data.content, pageData: res.data.data.page };
};

export const getSalesInvoiceDetail = async (invoiceId: string): Promise<InvoicetDetailRes> => {
  const res = await axios.get<ApiResponse<InvoicetDetailRes>>(
    FINANCE_ENDPOINTS.SALES_INVOICE_DETAIL(invoiceId),
  );
  return res.data.data;
};

// ----------------------- 재무 현황(시각화 4) -----------------------
export const getFinanceMonthly = async (): Promise<FinanceMonthly> => {
  const res = await axios.get<ApiResponse<FinanceMonthly>>(FINANCE_ENDPOINTS.ANALYTICS_MONTHLY);
  return res.data.data;
};

export const getArAging = async (): Promise<ArAging> => {
  const res = await axios.get<ApiResponse<ArAging>>(FINANCE_ENDPOINTS.AR_AGING);
  return res.data.data;
};
