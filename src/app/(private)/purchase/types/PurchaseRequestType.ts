import { Page, PageRequest } from '@/app/types/Page';
import { KeywordRequest } from '@/app/types/KeywordType';
import { DateRequest } from '@/app/types/Date';

// 구매 요청 목록 조회 파라미터
export interface PurchaseRequestListParams extends PageRequest, KeywordRequest, DateRequest {
  statusCode?: string;
}

// 구매 요청 목록 한 줄
export interface PurchaseRequestListItem {
  purchaseRequisitionId: string;
  purchaseRequisitionNumber: string;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  departmentName: string;
  statusCode: string;
  requestDate: string;
  totalAmount: number;
}

// 구매 요청 목록 응답
export interface PurchaseRequestListResponse {
  content: PurchaseRequestListItem[];
  page: Page;
}

// 구매 요청 상세 품목
export interface PurchaseRequestDetailItem {
  itemId: number;
  itemName: string;
  dueDate: string;
  quantity: number;
  uomCode: string; // 단위 (예: 'EA')
  unitPrice: number;
  amount: number;
}

// 구매 요청 상세
export interface PurchaseRequestDetail {
  id: string;
  purchaseRequisitionNumber: string;
  requesterId: string;
  requesterName: string;
  departmentId: string;
  departmentName: string;
  requestDate: string; // "2024-01-15"
  statusCode: string;
  items: PurchaseRequestDetailItem[];
  totalAmount: number;
}

// 구매 요청 작성 폼 품목 (화면 관리용, id 포함)
export interface PurchaseRequestFormItem {
  id: string;
  itemName: string;
  quantity: number;
  uomName: string;
  expectedUnitPrice: number;
  preferredSupplierName: string;
  dueDate: string;
  purpose: string;
  note?: string;
}

// 비재고성 구매 요청 등록 품목 (서버 전송용, id 제외)
export type CreatePurchaseRequestItem = Omit<PurchaseRequestFormItem, 'id'>;

// 비재고성 구매 요청 등록 바디
export interface CreatePurchaseRequestBody {
  requesterId: string;
  items: CreatePurchaseRequestItem[];
}

// 재고성 구매 요청 등록 품목
export interface CreateStockPurchaseRequestItem {
  productId: string;
  quantity: number;
  mrpRunId?: string; // 재고관리 쪽에선 안 넣어도 됨
}

// 재고성 구매 요청 등록 바디
export interface CreateStockPurchaseRequestBody {
  items: CreateStockPurchaseRequestItem[];
}
