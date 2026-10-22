import { Page, PageRequest } from '@/app/types/Page';
import { KeywordRequest } from '@/app/types/KeywordType';

// 공급업체 카테고리 코드
export type SupplierCategory = 'MATERIAL' | 'PARTS' | 'ETC';
// 공급업체 상태 코드
export type SupplierStatus = 'ACTIVE' | 'INACTIVE';

// 공급업체 목록 조회 파라미터
export interface SupplierListParams extends PageRequest, KeywordRequest {
  category?: string;
  statusCode?: string;
}

// 자재 정보
export interface Material {
  materialName: string; // 제품명
  uomCode: string; // 단위
  unitPrice: number; // 단가
}

// 공급업체 담당자 정보
export interface ManagerInfo {
  managerName: string;
  managerPhone: string;
  managerEmail: string;
}

// 공급업체 정보
export interface SupplierInfo {
  supplierId: string;
  supplierName: string;
  supplierNumber: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierBaseAddress: string;
  supplierDetailAddress: string | null;
  supplierStatusCode: SupplierStatus;
  category: SupplierCategory;
  deliveryLeadTime: number; // 납기일 (단위: 일)
}

// 공급업체 목록 한 줄
export interface SupplierListItem {
  statusCode: string; // 삭제 예정
  supplierInfo: SupplierInfo;
}

// 공급업체 목록 응답
export interface SupplierListResponse {
  content: SupplierListItem[];
  page: Page;
}

// 공급업체 상세
export interface SupplierDetail {
  supplierInfo: SupplierInfo;
  managerInfo: ManagerInfo;
}

// 공급업체 등록 바디
export interface CreateSupplierBody {
  supplierInfo: {
    supplierName: string;
    supplierEmail: string;
    supplierPhone: string;
    supplierBaseAddress: string;
    supplierDetailAddress?: string | null;
    category: string;
    deliveryLeadTime: number;
  };
  managerInfo: ManagerInfo;
  materialList: Material[];
}

// 공급업체 수정 바디
export interface UpdateSupplierBody {
  supplierName: string;
  supplierEmail: string;
  supplierPhone: string;
  supplierBaseAddress: string;
  supplierDetailAddress: string;
  category: string;
  statusCode: string;
  deliverLeadTime: number;
  managerName: string;
  managerPhone: string;
  managerEmail: string;
}
